import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseMockWardrobe, type MockItem } from "@/lib/mockWardrobe";
import { seedMockWardrobe } from "@/lib/mockWardrobeDb";
import { currentMonthKey, setBudgetForMonth } from "@/lib/budget";
import { markLetGo, markSaved } from "@/lib/considering/consideringMeta";
import mockWardrobeJson from "../../data/mock-wardrobe.json";
import availableImages from "../../data/mock-images.json";
import demoDecisionsJson from "../../data/demo-decisions.json";

// Demo accounts: one fresh account per "Try the demo" click, pre-filled with
// the mock wardrobe, so anyone can walk the whole pause flow without Google or
// Gmail. Each visitor gets their own rows (no shared state, no seeing someone
// else's items) and their decisions count as separate outcomes.
//
// Demo emails end in ".test", so the seed scripts' "real account" picker
// (scripts/seedMockWardrobe.ts) never chooses one.
export const DEMO_EMAIL_DOMAIN = "demo.pause.test";
const DEMO_SESSION_DAYS = 30;
// The newest mock purchase (the $259 pinstripe coat) lands in the current month, so
// the plan sits just above it: a new demo starts under plan, and the sample item
// ($119) is what tips it over.
const DEMO_MONTHLY_BUDGET = 300;

// Google sign-in and the Gmail connection are parked while the demo is the way
// in. Set GMAIL_ENABLED=true to bring both back; the code is untouched.
export function isGmailEnabled(): boolean {
  return process.env.GMAIL_ENABLED === "true";
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

// The mock purchases carry fixed dates. Shift them by whole months so the most
// recent one lands in the current month: the wardrobe then reads as recent
// ("bought Oct 2026") and this month's budget already has some spend in it.
export function shiftToCurrentMonth(items: readonly MockItem[], now: Date = new Date()): MockItem[] {
  const latest = items.reduce((max, item) => (item.purchasedAt > max ? item.purchasedAt : max), "");
  if (!latest) return [...items];
  const [ly, lm] = latest.split("-").map(Number);
  const offset = (now.getUTCFullYear() - ly) * 12 + (now.getUTCMonth() + 1 - lm);
  if (offset <= 0) return [...items];

  return items.map((item) => {
    const [y, m, d] = item.purchasedAt.split("-").map(Number);
    const total = y * 12 + (m - 1) + offset;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    // Clamp the day so a shifted Jan 31 never spills into March, and never
    // past today in the current month.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
    const day = Math.min(d, lastDay, isCurrentMonth ? now.getUTCDate() : lastDay);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { ...item, purchasedAt: iso };
  });
}

// The sample closet includes two deliberately messy rows (an unknown price, and
// rows flagged for review) to exercise the Gmail receipt-review flow. With Gmail
// parked, a visitor would see "2 receipts need a quick look" and "Needs review"
// badges for a feature they can't reach, so the demo gets a clean closet.
const DEMO_PRICES: Record<string, number> = {
  "frank-and-oak-oxford-shirt-blue": 98,
  "birkenstock-arizona-sandals-brown": 135,
};
const DEMO_FALLBACK_PRICE = 60;

export function cleanForDemo(items: readonly MockItem[]): MockItem[] {
  return items.map((item) => ({
    ...item,
    price: item.price ?? DEMO_PRICES[item.key] ?? DEMO_FALLBACK_PRICE,
    needsReview: false,
  }));
}

// What "Try a sample item" adds: a confirmed item that matches the sample
// closet (it overlaps the Everlane brown loafers) and pushes this month's plan
// over, so the first pause screen shows every part of the product. It is the
// second of the closet's two brown loafers, taken out of the mock closet
// (data/mock-wardrobe.json) so it isn't owned and wanted at once.
export const SAMPLE_ITEM = {
  itemName: "Suede penny loafers",
  brand: "Zara",
  price: "119.00",
  category: "shoes",
  colorName: null,
  colorFamily: "brown",
  styleTags: ["classic", "suede"],
  imageUrl: "/mock/loafers-brown-tan.jpg",
} as const;

// Every mock image is optional: an item whose file is missing from public/mock
// shows the placeholder, same as the seed script. public/ is not on a
// serverless function's filesystem, so instead of checking the disk at request
// time, list the files that have been added in data/mock-images.json.
const DEMO_IMAGES = new Set<string>(availableImages as string[]);

export async function createDemoSession(): Promise<{ sessionToken: string; expires: Date }> {
  const user = await prisma.user.create({
    data: {
      email: `guest-${randomUUID().slice(0, 8)}@${DEMO_EMAIL_DOMAIN}`,
      name: "Guest",
    },
  });

  const items = cleanForDemo(shiftToCurrentMonth(parseMockWardrobe(mockWardrobeJson)));
  await seedMockWardrobe({
    userId: user.id,
    items,
    imageExists: (file) => DEMO_IMAGES.has(file),
    dryRun: false,
  });
  await setBudgetForMonth(user.id, currentMonthKey(), DEMO_MONTHLY_BUDGET);
  await seedDemoDecisions(user.id);

  // A database session row, exactly what Auth.js would write after a Google
  // sign-in (session strategy is "database"), so auth() and every page treat a
  // demo visitor like any signed-in user.
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DEMO_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  return { sessionToken, expires };
}

// Seeded history is marked with its own source, so Home's setup guide still
// starts at step one for a new visitor (see setupGuide.ts).
export const DEMO_HISTORY_SOURCE = "demo_history";

// A little decision history, so Decisions isn't empty and Home's monthly recap
// has a last month to look back on. monthsAgo 0 is this month (one Undecided,
// one Let go); 1 is last month (the recap); 2 gives the recap its comparison.
// Each one is a real sample-closet piece with its photo, kept out of
// data/mock-wardrobe.json so nothing is both owned and wanted; each still has a
// close match left in the closet (the COS tee for the Everlane tee, and so on).
type DemoDecision = {
  key: string;
  brand: string;
  name: string;
  category: string;
  colorFamily: string;
  price: number;
  image: string;
  tags: string[];
  outcome: "dropped" | "saved_for_later" | "proceeded";
  monthsAgo: number;
  day: number;
  // How long it was paused before the decision (1 or 7), for the recap's tip.
  waitDays: number;
};

export const DEMO_DECISIONS = demoDecisionsJson as readonly DemoDecision[];

// Months are UTC, like the budget and the recap. Day 0 means "today", so this
// month's items never land in the future or slip into last month on the 1st.
export function demoDecisionDate(monthsAgo: number, day: number, now: Date = new Date()): Date {
  if (monthsAgo === 0 || day === 0) return now;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, day, 15));
}

async function seedDemoDecisions(userId: string): Promise<void> {
  const now = new Date();
  for (const decision of DEMO_DECISIONS) {
    const at = demoDecisionDate(decision.monthsAgo, decision.day, now);
    const item = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: DEMO_HISTORY_SOURCE,
        rawInput: decision.name,
        itemName: decision.name,
        brand: decision.brand,
        price: decision.price.toFixed(2),
        category: decision.category,
        colorFamily: decision.colorFamily,
        styleTags: decision.tags,
        imageUrl: DEMO_IMAGES.has(decision.image) ? `/mock/${decision.image}` : null,
        userConfirmed: true,
        userEdited: true,
        pauseStatus: decision.outcome === "saved_for_later" ? "saved_for_later" : "proceeded",
        decisionOutcome: decision.outcome,
        createdAt: at,
        pausedAt: at,
        waitUntil: new Date(at.getTime() + decision.waitDays * 86_400_000),
      },
    });
    // Same lifecycle stamps the resolve route writes; both degrade quietly.
    if (decision.outcome === "saved_for_later") await markSaved(item.id, userId, at);
    if (decision.outcome === "dropped") await markLetGo(item.id, userId, false, at);
  }
}

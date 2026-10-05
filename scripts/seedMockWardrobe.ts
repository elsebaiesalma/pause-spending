// Seeds ~25 mock wardrobe items (with a backing Purchase row each, for
// realistic merchant/price/order-date data) for UI work on the wardrobe and
// pause-screen views. Every row this script writes - both the Purchase and
// the WardrobeItem - gets source: "seed", so
// scripts/deleteSeededMockWardrobe.ts can find and remove exactly these
// rows and nothing else. Never touches any row without source: "seed".
//
// Deliberately includes messy real-world cases: items with no image, items
// with no price, items sitting in needs_review, one very long bilingual
// name, several two-tone (colorFamily: "multi") items, and near-duplicate
// groups (two black wool coats, three white tees) so the pause screen's
// redundancy matching (src/lib/tagging/similarity.ts) has real overlap to
// show.
//
// Two of the messy cases (no-price, needs_review) deliberately break the
// real ingestion invariant in src/lib/wardrobe.ts - there, a needs_review
// purchase never gets a wardrobe item, and price lives only on Purchase,
// never WardrobeItem. This script writes both rows directly so the wardrobe
// item itself exists for UI testing anyway. Practical effect: the 2
// needs_review wardrobe items won't show on /wardrobe or in pause-screen
// matches (both filter status: "active" - see wardrobe.ts and
// similarity.ts); their state is only visible by querying the DB directly
// or building a view for it. The 2 no-price items behave normally as
// wardrobe items - "no price" only means their backing Purchase row (and
// hence /purchases) shows a blank price and needs_review status.
//
// Usage: npx tsx scripts/seedMockWardrobe.ts
import { prisma } from "@/lib/prisma";

const SOURCE = "seed";

type SeedItem = {
  itemName: string;
  merchant: string;
  category: "tops" | "bottoms" | "outerwear" | "shoes" | "bags" | "knitwear";
  price: number | null;
  colorName: string;
  colorFamily: string;
  styleTags: string[];
  useCaseTags: string[];
  daysAgo: number;
  image: boolean;
  wardrobeStatus?: "active" | "needs_review";
};

const ITEMS: SeedItem[] = [
  // --- Tops (includes the 3-white-tee near-duplicate group) ---
  {
    itemName: "Everlane The Cotton Crew Tee — White",
    merchant: "Everlane",
    category: "tops",
    price: 28,
    colorName: "White",
    colorFamily: "white",
    styleTags: ["basic", "casual"],
    useCaseTags: ["everyday"],
    daysAgo: 40,
    image: true,
  },
  {
    itemName: "Uniqlo Supima Cotton Crew Neck Tee — White",
    merchant: "Uniqlo",
    category: "tops",
    price: 14.9,
    colorName: "White",
    colorFamily: "white",
    styleTags: ["basic", "casual"],
    useCaseTags: ["everyday"],
    daysAgo: 210,
    image: true,
  },
  {
    itemName: "COS Boxy Fit Tee — White",
    merchant: "COS",
    category: "tops",
    price: 35,
    colorName: "White",
    colorFamily: "white",
    styleTags: ["basic", "minimal"],
    useCaseTags: ["everyday"],
    daysAgo: 95,
    image: true,
  },
  {
    itemName: "& Other Stories Silk Blend Blouse — Cream",
    merchant: "& Other Stories",
    category: "tops",
    price: 89,
    colorName: "Cream",
    colorFamily: "cream",
    styleTags: ["dressy"],
    useCaseTags: ["work"],
    daysAgo: 160,
    image: true,
  },
  {
    itemName: "Reformation Poplin Button-Up — Sage Green",
    merchant: "Reformation",
    category: "tops",
    price: 128,
    colorName: "Sage Green",
    colorFamily: "green",
    styleTags: ["dressy", "casual"],
    useCaseTags: ["work", "weekend"],
    daysAgo: 305,
    image: true,
  },
  {
    itemName: "Aritzia Wilfred Cropped Tank — Black",
    merchant: "Aritzia",
    category: "tops",
    price: 45,
    colorName: "Black",
    colorFamily: "black",
    styleTags: ["basic"],
    useCaseTags: ["everyday"],
    daysAgo: 20,
    image: false,
  },

  // --- Bottoms ---
  {
    itemName: "Madewell The Perfect Vintage Jean — Mid Blue",
    merchant: "Madewell",
    category: "bottoms",
    price: 128,
    colorName: "Mid Blue Wash",
    colorFamily: "blue",
    styleTags: ["casual"],
    useCaseTags: ["everyday"],
    daysAgo: 250,
    image: true,
  },
  {
    itemName: "COS Tailored Wide-Leg Trousers — Grey",
    merchant: "COS",
    category: "bottoms",
    price: 110,
    colorName: "Grey",
    colorFamily: "grey",
    styleTags: ["minimal", "dressy"],
    useCaseTags: ["work"],
    daysAgo: 130,
    image: true,
  },
  {
    itemName: "Levi's 501 Original Straight Jean — Black",
    merchant: "Levi's",
    category: "bottoms",
    price: null,
    colorName: "Black",
    colorFamily: "black",
    styleTags: ["casual"],
    useCaseTags: ["everyday"],
    daysAgo: 15,
    image: true,
  },
  {
    itemName: "Arket Pleated Midi Skirt — Navy",
    merchant: "Arket",
    category: "bottoms",
    price: 79,
    colorName: "Navy",
    colorFamily: "navy",
    styleTags: ["dressy"],
    useCaseTags: ["work"],
    daysAgo: 280,
    image: true,
  },

  // --- Outerwear (includes the 2-black-coat near-duplicate group) ---
  {
    itemName: "Sézane Léon Wool Coat — Black",
    merchant: "Sézane",
    category: "outerwear",
    price: 350,
    colorName: "Black",
    colorFamily: "black",
    styleTags: ["dressy", "classic"],
    useCaseTags: ["work", "weekend"],
    daysAgo: 340,
    image: true,
  },
  {
    itemName: "Massimo Dutti Wool Blend Coat — Black",
    merchant: "Massimo Dutti",
    category: "outerwear",
    price: 289,
    colorName: "Black",
    colorFamily: "black",
    styleTags: ["dressy", "classic"],
    useCaseTags: ["work", "weekend"],
    daysAgo: 60,
    image: true,
  },
  {
    itemName: "Patagonia Nano Puff Vest — Colorblock",
    merchant: "Patagonia",
    category: "outerwear",
    price: 199,
    colorName: "Black / Forge Grey",
    colorFamily: "multi",
    styleTags: ["outdoor", "casual"],
    useCaseTags: ["weekend"],
    daysAgo: 100,
    image: true,
    wardrobeStatus: "needs_review",
  },
  {
    itemName: "Zara Oversized Denim Jacket — Blue",
    merchant: "Zara",
    category: "outerwear",
    price: 69.9,
    colorName: "Mid Blue",
    colorFamily: "blue",
    styleTags: ["casual"],
    useCaseTags: ["everyday"],
    daysAgo: 175,
    image: false,
  },
  {
    itemName: "The North Face Mountain Parka — Colorblock",
    merchant: "The North Face",
    category: "outerwear",
    price: 329,
    colorName: "Black / Summit Gold",
    colorFamily: "multi",
    styleTags: ["outdoor"],
    useCaseTags: ["weekend"],
    daysAgo: 8,
    image: true,
  },

  // --- Shoes ---
  {
    itemName: "Veja Campo Sneakers — White/Green",
    merchant: "Veja",
    category: "shoes",
    price: 150,
    colorName: "White / Cyprus Green",
    colorFamily: "multi",
    styleTags: ["casual"],
    useCaseTags: ["everyday"],
    daysAgo: 190,
    image: true,
  },
  {
    itemName: "Dr. Martens 1460 Boots — Black",
    merchant: "Dr. Martens",
    category: "shoes",
    price: 170,
    colorName: "Black",
    colorFamily: "black",
    styleTags: ["casual"],
    useCaseTags: ["everyday"],
    daysAgo: 50,
    image: true,
    wardrobeStatus: "needs_review",
  },
  {
    itemName: "Nike Air Force 1 — White",
    merchant: "Nike",
    category: "shoes",
    price: 115,
    colorName: "White",
    colorFamily: "white",
    styleTags: ["casual", "sporty"],
    useCaseTags: ["everyday"],
    daysAgo: 320,
    image: false,
  },
  {
    itemName: "Sam Edelman Ankle Boots — Brown",
    merchant: "Sam Edelman",
    category: "shoes",
    price: null,
    colorName: "Cognac Brown",
    colorFamily: "brown",
    styleTags: ["dressy"],
    useCaseTags: ["work"],
    daysAgo: 5,
    image: true,
  },

  // --- Bags ---
  {
    itemName: "Polène Numéro Un Mini Bag — Cognac",
    merchant: "Polène",
    category: "bags",
    price: 390,
    colorName: "Cognac",
    colorFamily: "brown",
    styleTags: ["dressy", "classic"],
    useCaseTags: ["work", "weekend"],
    daysAgo: 230,
    image: true,
  },
  {
    itemName: "Coach Tabby Shoulder Bag — Black",
    merchant: "Coach",
    category: "bags",
    price: 350,
    colorName: "Black",
    colorFamily: "black",
    styleTags: ["dressy"],
    useCaseTags: ["work"],
    daysAgo: 365,
    image: true,
  },
  {
    itemName: "Sézane Le Vestiaire Tote — Striped Canvas",
    merchant: "Sézane",
    category: "bags",
    price: 145,
    colorName: "Navy / Ecru Stripe",
    colorFamily: "multi",
    styleTags: ["casual"],
    useCaseTags: ["everyday", "weekend"],
    daysAgo: 75,
    image: true,
  },

  // --- Knitwear (includes the very-long bilingual name case) ---
  {
    itemName: "Vince Cashmere Crew Sweater — Camel",
    merchant: "Vince",
    category: "knitwear",
    price: 245,
    colorName: "Camel",
    colorFamily: "brown",
    styleTags: ["classic"],
    useCaseTags: ["work", "everyday"],
    daysAgo: 145,
    image: true,
  },
  {
    itemName: "J.Crew Merino Wool Cardigan — Navy",
    merchant: "J.Crew",
    category: "knitwear",
    price: 118,
    colorName: "Navy",
    colorFamily: "navy",
    styleTags: ["classic", "casual"],
    useCaseTags: ["everyday"],
    daysAgo: 265,
    image: true,
  },
  {
    itemName:
      "Cashmere Wrap Coat Cardigan, Double-Breasted Long Belted Sweater Coat, Size M, Camel — 羊绒披肩大衣双排扣加长款腰带毛衣外套，中号，驼色，秋冬新款保暖长款针织开衫披肩外套女",
    merchant: "Naadam",
    category: "knitwear",
    price: 168,
    colorName: "Camel",
    colorFamily: "brown",
    styleTags: ["classic", "dressy"],
    useCaseTags: ["work", "weekend"],
    daysAgo: 355,
    image: true,
  },
];

function daysAgoToDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function imageUrlFor(item: SeedItem, index: number): string | null {
  if (!item.image) return null;
  return `https://picsum.photos/seed/pause-seed-${index}/600/600`;
}

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found - seed script expects exactly one existing (real) account.");
  }

  console.log(`Seeding ${ITEMS.length} mock wardrobe items for ${user.email} (${user.id})...`);

  let created = 0;
  for (const [index, item] of ITEMS.entries()) {
    const orderDate = daysAgoToDate(item.daysAgo);
    const purchaseStatus = item.price === null ? "needs_review" : "active";

    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        merchant: item.merchant,
        orderDate,
        itemName: item.itemName,
        price: item.price,
        category: item.category,
        imageUrl: imageUrlFor(item, index),
        colorName: item.colorName,
        colorFamily: item.colorFamily,
        status: purchaseStatus,
        source: SOURCE,
      },
    });

    await prisma.wardrobeItem.create({
      data: {
        userId: user.id,
        sourcePurchaseId: purchase.id,
        itemName: item.itemName,
        imageUrl: imageUrlFor(item, index),
        category: item.category,
        colorName: item.colorName,
        colorFamily: item.colorFamily,
        styleTags: item.styleTags,
        useCaseTags: item.useCaseTags,
        ownedSince: orderDate,
        status: item.wardrobeStatus ?? "active",
        tagsExtractedAt: new Date(),
        source: SOURCE,
      },
    });

    created += 1;
  }

  console.log(`Done. Created ${created} seeded purchases + ${created} seeded wardrobe items.`);
  console.log(
    "Reminder: real Gmail sync is paused via GMAIL_SYNC_PAUSED - see .env - while this seed data is in use."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

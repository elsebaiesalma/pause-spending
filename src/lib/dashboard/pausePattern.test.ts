import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  bucketPauses,
  buildPausePattern,
  describePattern,
  loadPausePattern,
  type FinishedPause,
} from "./pausePattern";

const START = new Date("2026-10-01T12:00:00Z");

function pause(hours: number, outcome: FinishedPause["outcome"]): FinishedPause {
  return { pausedAt: START, waitUntil: new Date(START.getTime() + hours * 3_600_000), outcome };
}

function many(hours: number, letGo: number, bought: number): FinishedPause[] {
  return [
    ...Array.from({ length: letGo }, () => pause(hours, "dropped")),
    ...Array.from({ length: bought }, () => pause(hours, "proceeded")),
  ];
}

describe("bucketPauses", () => {
  it("puts pauses up to 36h in 24-hour and 5 days or more in 7-day, with exact edges", () => {
    const { short, long } = bucketPauses([
      pause(24, "dropped"),
      pause(36, "proceeded"),
      pause(36.01, "dropped"),
      pause(119.9, "dropped"),
      pause(120, "dropped"),
      pause(168, "proceeded"),
    ]);
    expect(short).toEqual({ total: 2, letGo: 1 });
    expect(long).toEqual({ total: 2, letGo: 1 });
  });
});

describe("describePattern", () => {
  it("says longer pauses work better only when both buckets have 2 or more", () => {
    const result = describePattern({ total: 3, letGo: 1 }, { total: 3, letGo: 3 });
    expect(result).toEqual({ headline: "Longer pauses work better for you", longerWins: true });
  });

  it("says shorter pauses work well when 24-hour is better", () => {
    expect(describePattern({ total: 3, letGo: 3 }, { total: 3, letGo: 1 })).toEqual({
      headline: "Shorter pauses work well for you",
      longerWins: false,
    });
  });

  it("says both work about the same on equal rates, even with different totals", () => {
    expect(describePattern({ total: 2, letGo: 1 }, { total: 4, letGo: 2 }).headline).toBe(
      "Both pause lengths work about the same for you"
    );
  });

  it("uses the neutral headline when either bucket has fewer than 2", () => {
    expect(describePattern({ total: 1, letGo: 1 }, { total: 5, letGo: 0 }).headline).toBe("How your pauses ended");
    expect(describePattern({ total: 5, letGo: 0 }, { total: 0, letGo: 0 }).headline).toBe("How your pauses ended");
  });
});

describe("buildPausePattern", () => {
  it("is not ready under 5 decided pauses, and ignores in-between lengths", () => {
    const data = buildPausePattern([...many(24, 2, 1), ...many(168, 1, 0), pause(72, "dropped")]);
    expect(data.decided).toBe(4);
    expect(data.ready).toBe(false);
  });

  it("is ready at exactly 5", () => {
    expect(buildPausePattern([...many(24, 2, 1), ...many(168, 1, 1)]).ready).toBe(true);
  });

  it("adds the 7-day tip only when 7-day is better", () => {
    const better = buildPausePattern([...many(24, 1, 2), ...many(168, 3, 0)]);
    expect(better.footnote).toBe("Based on your 6 finished pauses. Try 7 days for the things you want most.");

    const worse = buildPausePattern([...many(24, 3, 0), ...many(168, 1, 2)]);
    expect(worse.footnote).toBe("Based on your 6 finished pauses.");
  });
});

describe("loadPausePattern", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  async function makeUser() {
    const user = await prisma.user.create({
      data: { email: `pattern-${Math.random().toString(36).slice(2, 8)}@example.test` },
    });
    userIds.push(user.id);
    return user;
  }

  async function addPause(userId: string, hours: number, outcome: string | null) {
    const created = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Thing",
        userConfirmed: true,
        pauseStatus: "proceeded",
        decisionOutcome: outcome,
        waitUntil: new Date(START.getTime() + hours * 3_600_000),
      },
    });
    await prisma.$executeRaw`UPDATE "desired_items" SET "paused_at" = ${START} WHERE "id" = ${created.id}::uuid`;
  }

  it("counts only the signed-in user's finished pauses", async () => {
    const me = await makeUser();
    const other = await makeUser();
    await addPause(me.id, 24, "dropped");
    await addPause(me.id, 168, "proceeded");
    await addPause(me.id, 168, null);
    await addPause(other.id, 24, "dropped");
    await addPause(other.id, 24, "dropped");

    const data = await loadPausePattern(me.id);
    expect(data).toMatchObject({ decided: 2, short: { total: 1, letGo: 1 }, long: { total: 1, letGo: 0 } });
  });

  it("returns an empty pattern for someone with no pauses", async () => {
    const me = await makeUser();
    const data = await loadPausePattern(me.id);
    expect(data).toMatchObject({ decided: 0, ready: false });
  });
});

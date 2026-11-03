import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getSavingsGoal,
  goalProgress,
  parseGoalInput,
  removeSavingsGoal,
  restartSavingsGoal,
  saveSavingsGoal,
} from "./savingsGoal";

describe("goalProgress", () => {
  it("reports saved, remaining and a 0..1 fraction", () => {
    expect(goalProgress(800, 540)).toEqual({ saved: 540, remaining: 260, fraction: 0.675, reached: false });
  });

  it("is reached at exactly the target and clamps the bar at full", () => {
    expect(goalProgress(800, 800).reached).toBe(true);
    expect(goalProgress(800, 950)).toMatchObject({ remaining: 0, fraction: 1, reached: true });
  });

  it("never goes negative", () => {
    expect(goalProgress(800, -5)).toMatchObject({ saved: 0, fraction: 0 });
  });
});

describe("parseGoalInput", () => {
  it("accepts a name and a plain amount, with or without $ and commas", () => {
    expect(parseGoalInput("Lisbon trip", "$1,200.50")).toEqual({ name: "Lisbon trip", target: 1200.5 });
    expect(parseGoalInput("  New   coat ", "800")).toEqual({ name: "New coat", target: 800 });
  });

  it("rejects empty names, long names and bad amounts", () => {
    expect(parseGoalInput("", "800")).toBeNull();
    expect(parseGoalInput("x".repeat(41), "800")).toBeNull();
    expect(parseGoalInput("Trip", "0")).toBeNull();
    expect(parseGoalInput("Trip", "-5")).toBeNull();
    expect(parseGoalInput("Trip", "12.345")).toBeNull();
    expect(parseGoalInput("Trip", "abc")).toBeNull();
    expect(parseGoalInput("Trip", "100001")).toBeNull();
    expect(parseGoalInput(null, "800")).toBeNull();
  });
});

describe("savings goal storage", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  async function makeUser() {
    const user = await prisma.user.create({
      data: { email: `goal-${Math.random().toString(36).slice(2, 8)}@example.test` },
    });
    userIds.push(user.id);
    return user;
  }

  async function letGo(userId: string, price: string, letGoAt: Date, name = "Boots") {
    const item = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: name,
        price,
        decisionOutcome: "dropped",
        userConfirmed: true,
        pauseStatus: "proceeded",
      },
    });
    await prisma.$executeRaw`UPDATE "desired_items" SET "let_go_at" = ${letGoAt} WHERE "id" = ${item.id}::uuid`;
    return item;
  }

  it("has no goal until one is saved", async () => {
    const user = await makeUser();
    expect(await getSavingsGoal(user.id)).toBeNull();
  });

  it("counts only items let go since the goal was created", async () => {
    const user = await makeUser();
    await saveSavingsGoal(user.id, { name: "Lisbon trip", target: 800 });
    const earlier = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await letGo(user.id, "100", earlier, "Before the goal");
    await letGo(user.id, "189", new Date(Date.now() + 60 * 1000), "Ankle boots");
    await letGo(user.id, "50", new Date(Date.now() + 120 * 1000), "Cardigan");

    const goal = await getSavingsGoal(user.id);
    expect(goal).toMatchObject({ name: "Lisbon trip", target: 800, saved: 239 });
    expect(goal?.lastAdded).toMatchObject({ amount: 50, itemName: "Cardigan" });
  });

  it("keeps progress when the goal is renamed or retargeted", async () => {
    const user = await makeUser();
    await saveSavingsGoal(user.id, { name: "Trip", target: 800 });
    await letGo(user.id, "189", new Date(Date.now() + 60 * 1000));
    await saveSavingsGoal(user.id, { name: "Lisbon trip", target: 1000 });
    expect(await getSavingsGoal(user.id)).toMatchObject({ name: "Lisbon trip", target: 1000, saved: 189 });
  });

  it("restarting starts from zero", async () => {
    const user = await makeUser();
    await saveSavingsGoal(user.id, { name: "Trip", target: 100 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await letGo(user.id, "189", new Date());
    expect((await getSavingsGoal(user.id))?.saved).toBe(189);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await restartSavingsGoal(user.id, { name: "Coat", target: 400 });
    expect(await getSavingsGoal(user.id)).toMatchObject({ name: "Coat", target: 400, saved: 0, lastAdded: null });
  });

  it("removes the goal", async () => {
    const user = await makeUser();
    await saveSavingsGoal(user.id, { name: "Trip", target: 800 });
    await removeSavingsGoal(user.id);
    expect(await getSavingsGoal(user.id)).toBeNull();
  });

  it("never returns another person's goal", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await saveSavingsGoal(a.id, { name: "Mine", target: 800 });
    expect(await getSavingsGoal(b.id)).toBeNull();
  });
});

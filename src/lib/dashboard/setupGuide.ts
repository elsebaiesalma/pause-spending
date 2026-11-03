import { prisma } from "@/lib/prisma";

// Home's setup guide: the three things that show what PAUSE does, in order.
// Each step is "done" from real data, never from a dismissed flag, so the
// guide can't claim progress that didn't happen.
export type SetupProgress = {
  addedItem: boolean;
  madeDecision: boolean;
  builtLook: boolean;
};

export type SetupStepId = keyof SetupProgress;

export type SetupStep = {
  id: SetupStepId;
  title: string;
  description: string;
  done: boolean;
};

export async function getSetupProgress(userId: string): Promise<SetupProgress> {
  const [addedItem, madeDecision, builtLook] = await Promise.all([
    prisma.desiredItem.count({ where: { userId, userConfirmed: true } }),
    // Any action on the pause screen moves the item off pending_confirmation.
    prisma.desiredItem.count({
      where: { userId, OR: [{ pauseStatus: { not: "pending_confirmation" } }, { decisionOutcome: { not: null } }] },
    }),
    prisma.look.count({ where: { userId } }),
  ]);
  return { addedItem: addedItem > 0, madeDecision: madeDecision > 0, builtLook: builtLook > 0 };
}

export function setupSteps(progress: SetupProgress): SetupStep[] {
  return [
    {
      id: "addedItem",
      title: "Add something you want",
      description: "See it next to what you already own, and what it does to this month's plan.",
      done: progress.addedItem,
    },
    {
      id: "madeDecision",
      title: "Make a decision",
      description: "Pause it for 24 hours, decide later, or let it go. Nothing is blocked; the choice is yours.",
      done: progress.madeDecision,
    },
    {
      id: "builtLook",
      title: "Build a look from your closet",
      description: "Put an outfit together from pieces you own. Often the new thing isn't needed.",
      done: progress.builtLook,
    },
  ];
}

// The first step not yet done is the one the guide opens; null when all are.
export function nextStep(steps: SetupStep[]): SetupStep | null {
  return steps.find((step) => !step.done) ?? null;
}

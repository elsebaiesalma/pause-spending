import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The goals module reads the database; the card only needs its pure helpers.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { GoalCard } from "./GoalCard";

const IN_PROGRESS = {
  name: "Winter boots",
  target: 800,
  saved: 540,
  lastAdded: { amount: 189, itemName: "Leather jacket", at: new Date("2026-10-14T12:00:00Z") },
};

describe("GoalCard", () => {
  it("invites the first goal with one primary action when there is none", () => {
    const html = renderToStaticMarkup(<GoalCard goal={null} />);

    expect(html).toContain("Give your savings somewhere to go");
    expect(html).toContain("Name something you");
    expect(html).toContain("Set savings goal");
    expect(html).not.toContain("role=\"progressbar\"");
  });

  it("shows progress as text and as a labelled progress bar", () => {
    const html = renderToStaticMarkup(<GoalCard goal={IN_PROGRESS} />);

    expect(html).toContain("Saving toward");
    expect(html).toContain("Winter boots");
    expect(html).toContain("$540 saved");
    expect(html).toContain("$260 to go");
    expect(html).toContain("Last added: $189 from Leather jacket, Oct 14");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="540"');
    expect(html).toContain('aria-valuemax="800"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-label="Winter boots: $540 saved of $800"');
  });

  it("leaves out the last-added line before anything has been added", () => {
    const html = renderToStaticMarkup(<GoalCard goal={{ ...IN_PROGRESS, saved: 0, lastAdded: null }} />);

    expect(html).not.toContain("Last added");
    expect(html).toContain("$800 to go");
  });

  it("offers an Edit sheet prefilled with the current goal", () => {
    const html = renderToStaticMarkup(<GoalCard goal={IN_PROGRESS} />);

    expect(html).toContain(">Edit<");
    expect(html).toContain('value="Winter boots"');
    expect(html).toContain('value="800"');
  });

  it("celebrates a reached goal once, with next and remove actions and no progress bar", () => {
    const html = renderToStaticMarkup(<GoalCard goal={{ ...IN_PROGRESS, saved: 800 }} />);

    expect(html).toContain("You reached Winter boots");
    expect(html).toContain("$800 you chose not to spend. Enjoy it.");
    expect(html).toContain("Set next goal");
    expect(html).toContain("Remove goal");
    expect(html).toContain('name="intent" value="remove"');
    expect(html).toContain('name="intent" value="restart"');
    expect(html).not.toContain('role="progressbar"');
  });
});

describe("goal sheet", () => {
  const html = renderToStaticMarkup(<GoalCard goal={null} />);

  it("is a native dialog with labelled inputs that posts to the goal endpoint", () => {
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="goal-sheet-save"');
    expect(html).toContain('action="/api/goal"');
    expect(html).toContain("What are you saving toward?");
    expect(html).toContain("How much does it cost?");
    expect(html).toContain('name="returnTo" value="/dashboard"');
    expect(html).toContain('name="intent" value="save"');
  });

  it("limits the name to 40 characters and opens a decimal keypad for the amount", () => {
    expect(html).toContain('maxLength="40"');
    expect(html).toContain('inputMode="decimal"');
  });

  it("explains that PAUSE doesn't move money, and has Save goal and Cancel", () => {
    expect(html).toContain("Counts money you chose not to spend. PAUSE doesn’t move money.");
    expect(html).toContain("Save goal");
    expect(html).toContain("Cancel");
  });
});

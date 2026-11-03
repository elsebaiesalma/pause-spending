import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { parseGoalInput, removeSavingsGoal, restartSavingsGoal, saveSavingsGoal } from "@/lib/goals/savingsGoal";
import { safeReturnPath } from "@/lib/looks/returnPath";

// One form endpoint for the goal sheet and card: intent=save (create or edit),
// intent=restart (a reached goal, fresh start date) or intent=remove.
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const intent = form.get("intent")?.toString();
  const rawReturn = form.get("returnTo")?.toString();
  const returnTo = rawReturn ? safeReturnPath(rawReturn) : "/dashboard";
  const back = (query: string) => {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("goal", query);
    return NextResponse.redirect(url, 303);
  };

  if (intent === "remove") {
    await removeSavingsGoal(userId);
    return back("removed");
  }

  if (intent !== "save" && intent !== "restart") {
    return NextResponse.json({ error: "intent must be 'save', 'restart' or 'remove'" }, { status: 400 });
  }

  const input = parseGoalInput(form.get("name"), form.get("amount"));
  if (!input) return back("invalid");

  const saved = intent === "restart" ? await restartSavingsGoal(userId, input) : await saveSavingsGoal(userId, input);
  return back(saved ? "saved" : "unavailable");
}

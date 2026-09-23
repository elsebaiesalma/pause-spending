import { prisma } from "@/lib/prisma";
import { computeSuggestedBudget, currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";

export default async function BudgetPage() {
  const user = await prisma.user.findFirst();
  const monthKey = currentMonthKey();

  const budget = user ? await getBudgetForMonth(user.id, monthKey) : null;
  const spend = user ? await getMonthSpend(user.id, monthKey) : 0;
  const suggestion = !budget && user ? await computeSuggestedBudget(user.id, monthKey) : null;

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Budget</h1>
      <p>
        <a href="/">Back to home</a>
      </p>

      {!budget ? (
        <>
          <p>You haven&apos;t set a budget for {monthKey} yet.</p>
          {suggestion !== null && (
            <p>
              Based on your past spending, a starting figure of{" "}
              <strong>${suggestion.toFixed(2)}</strong> might be reasonable - just a suggestion,
              you decide the real number.
            </p>
          )}
          <form action="/api/budget" method="POST" style={{ display: "grid", gap: "0.5rem", maxWidth: 260 }}>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monthly budget"
              defaultValue={suggestion ?? ""}
              required
            />
            <button type="submit">Set your first budget</button>
          </form>
        </>
      ) : (
        <>
          <p>Budget for {monthKey}: ${Number(budget.amount).toFixed(2)}</p>
          <p>Spent so far: ${spend.toFixed(2)}</p>
          <p>Remaining: ${(Number(budget.amount) - spend).toFixed(2)}</p>
          <form action="/api/budget" method="POST" style={{ display: "grid", gap: "0.5rem", maxWidth: 260 }}>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(budget.amount)}
              required
            />
            <button type="submit">Update budget</button>
          </form>
        </>
      )}
    </main>
  );
}

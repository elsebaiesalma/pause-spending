import { computeSuggestedBudget, currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { requireUserIdOrRedirect } from "@/lib/session";

export default async function BudgetPage() {
  const userId = await requireUserIdOrRedirect();
  const monthKey = currentMonthKey();

  const budget = await getBudgetForMonth(userId, monthKey);
  const spend = await getMonthSpend(userId, monthKey);
  const suggestion = !budget ? await computeSuggestedBudget(userId, monthKey) : null;

  return (
    <div className="page">
      <span className="page__eyebrow">This month</span>
      <h1>Budget</h1>

      {!budget ? (
        <div className="section stack">
          <p className="page__lede">You haven&apos;t set a budget for {monthKey} yet.</p>
          {suggestion !== null && (
            <p className="note">
              Based on your past spending, a starting figure of{" "}
              <strong>${suggestion.toFixed(2)}</strong> might be reasonable - just a suggestion, you
              decide the real number.
            </p>
          )}
          <form action="/api/budget" method="POST">
            <label htmlFor="amount">Monthly budget</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              defaultValue={suggestion ?? ""}
              required
            />
            <button type="submit" className="btn-primary">
              Set your first budget
            </button>
          </form>
        </div>
      ) : (
        <div className="section stack">
          <p className="item-row__price" style={{ fontSize: "2rem" }}>
            ${Number(budget.amount).toFixed(2)}
          </p>
          <p className="page__lede">budget for {monthKey}</p>
          <hr className="divider" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Spent so far</span>
            <strong>${spend.toFixed(2)}</strong>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Remaining</span>
            <strong>${(Number(budget.amount) - spend).toFixed(2)}</strong>
          </div>
          <form action="/api/budget" method="POST" className="section">
            <label htmlFor="amount">Update budget</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(budget.amount)}
              required
            />
            <button type="submit">Update budget</button>
          </form>
        </div>
      )}
    </div>
  );
}

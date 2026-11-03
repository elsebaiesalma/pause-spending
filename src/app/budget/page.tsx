import { computeSuggestedBudget, currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { formatMonthLabel } from "@/lib/monthLabel";
import { requireUserIdOrRedirect } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";

export default async function BudgetPage() {
  const userId = await requireUserIdOrRedirect();
  const monthKey = currentMonthKey();

  const budget = await getBudgetForMonth(userId, monthKey);
  const spend = await getMonthSpend(userId, monthKey);
  const suggestion = !budget ? await computeSuggestedBudget(userId, monthKey) : null;

  return (
    <div className="page">
      <PageHeader
        back={{ href: "/account", label: "Settings" }}
        title="Monthly plan"
        subtitle="How much you want to spend on clothes this month. PAUSE shows what each purchase does to it, and never changes it for you."
      />

      {!budget ? (
        <div className="stack">
          <p className="page__lede">You haven&apos;t set a plan for {formatMonthLabel(monthKey)} yet.</p>
          {suggestion !== null && (
            <p className="note">
              Based on your past spending, a starting figure of{" "}
              <strong>${suggestion.toFixed(2)}</strong> might be reasonable - just a suggestion, you
              decide the real number.
            </p>
          )}
          <form action="/api/budget" method="POST">
            <label htmlFor="amount">Monthly plan</label>
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
              Set your plan
            </button>
          </form>
        </div>
      ) : (
        <div className="stack">
          <p className="item-row__price" style={{ fontSize: "2.15rem" }}>
            ${Number(budget.amount).toFixed(2)}
          </p>
          <p className="page__lede">plan for {formatMonthLabel(monthKey)}</p>
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
            <label htmlFor="amount">Change the plan</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(budget.amount)}
              required
            />
            <button type="submit">Save plan</button>
          </form>
        </div>
      )}
    </div>
  );
}

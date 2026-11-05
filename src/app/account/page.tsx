import { prisma } from "@/lib/prisma";
import { formatMonthLabel } from "@/lib/monthLabel";
import { currentMonthKey, getBudgetForMonth } from "@/lib/budget";
import { csrfTokenForUser } from "@/lib/csrf";
import { getSavingsGoal, isGoalStorageAvailable } from "@/lib/goals/savingsGoal";
import { requireUserIdOrRedirect } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { isDemoEmail, isGmailEnabled } from "@/lib/demo";
import { PageHeader } from "@/components/PageHeader";
import { ShowGuideButton } from "./ShowGuideButton";
import styles from "./page.module.css";

export default async function AccountPage() {
  const userId = await requireUserIdOrRedirect();
  const monthKey = currentMonthKey();

  const [user, gmailConnection, budget, goalAvailable] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.emailConnection.findUnique({ where: { userId_provider: { userId, provider: "gmail" } } }),
    getBudgetForMonth(userId, monthKey),
    isGoalStorageAvailable(),
  ]);
  const goal = goalAvailable ? await getSavingsGoal(userId) : null;
  const demo = isDemoEmail(user.email);

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle={
          demo
            ? "This is a demo account with a sample closet. Signing out ends it, and its items aren't kept."
            : user.name
              ? `${user.name} · ${user.email}`
              : user.email
        }
      />

      {/* Parked with Google sign-in until GMAIL_ENABLED=true (src/lib/demo.ts). */}
      {isGmailEnabled() && (
        <section className={styles.block}>
          <h2 className={styles.heading}>Gmail connection</h2>
          {gmailConnection?.status === "connected" ? (
            <>
              <p className={styles.status}>Connected since {gmailConnection.connectedAt.toLocaleString()}.</p>
              <div className="row">
                <form action="/api/sync/gmail/run" method="POST">
                  <button type="submit">Sync now</button>
                </form>
                <form action="/api/auth/gmail/disconnect" method="POST">
                  <input type="hidden" name="csrfToken" value={csrfTokenForUser(userId)} />
                  <button type="submit">Disconnect</button>
                </form>
                <a href="/purchases" className="btn-quiet">
                  Purchase history
                </a>
              </div>
            </>
          ) : gmailConnection?.status === "expired" ? (
            <>
              <p className={styles.status}>
                Your Gmail connection has expired and needs to be reconnected before syncing can continue.
              </p>
              <div className="row">
                <a href="/connect/gmail" className="btn btn-primary">
                  Reconnect Gmail
                </a>
              </div>
            </>
          ) : gmailConnection?.status === "disconnected" ? (
            <>
              <p className={styles.status}>Gmail is disconnected. Previously parsed data is kept.</p>
              <div className="row">
                <a href="/connect/gmail" className="btn btn-primary">
                  Reconnect Gmail
                </a>
                <a href="/purchases" className="btn-quiet">
                  Purchase history
                </a>
              </div>
            </>
          ) : (
            <>
              <p className={styles.status}>Gmail isn&apos;t connected yet.</p>
              <div className="row">
                <a href="/connect/gmail" className="btn btn-primary">
                  Connect Gmail
                </a>
              </div>
            </>
          )}
          <p className={styles.deleteRow}>
            <a href="/connect/gmail/delete" className="btn btn-danger">
              Permanently delete my data
            </a>
          </p>
        </section>
      )}

      <section className={styles.block}>
        <h2 className={styles.heading}>Budget &amp; goals</h2>
        {budget ? (
          <p className={styles.status}>
            Monthly plan: ${Number(budget.amount).toFixed(0)} for {formatMonthLabel(monthKey)}.
          </p>
        ) : (
          <p className={styles.status}>Monthly plan: off.</p>
        )}
        {goalAvailable && (
          <p className={styles.status}>
            {goal ? `Savings goal: ${goal.name}, $${goal.target.toFixed(0)}.` : "Savings goal: off."}
          </p>
        )}
        <div className="row">
          <a href="/budget" className="btn">
            Manage budget &amp; goals
          </a>
        </div>
      </section>

      <ShowGuideButton />

      <section className={styles.block}>
        <h2 className={styles.heading}>
          Tone <span className="tag">Coming later</span>
        </h2>
        <p className={styles.status}>Choose how PAUSE talks to you when it nudges a decision.</p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.heading}>
          Auto-move timing <span className="tag">Coming later</span>
        </h2>
        <p className={styles.status}>Choose how long an undecided item waits before it moves to Let go. Today it&apos;s 60 days.</p>
      </section>

      <form
        className={styles.signOut}
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit">Sign out</button>
      </form>
    </div>
  );
}

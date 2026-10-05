import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { DashboardTopNav, DashboardBottomTabBar } from "@/app/dashboard/DashboardNav";

// The nav's 5th slot (see DashboardNav.tsx) - deliberately minimal for now:
// account identity plus links out to the settings-adjacent pages that
// already exist (budget, Gmail connection management on the dashboard).
// Doesn't duplicate that Gmail/data-deletion UI here - see
// BACKLOG.md's "Configurable saved-item retention" entry for the first
// setting that would actually live on this page once it's built.
export default async function SettingsPage() {
  const userId = await requireUserIdOrRedirect();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });

  return (
    <div className="page">
      <DashboardTopNav active="settings" />

      <span className="page__eyebrow">Settings</span>
      <h1>Account</h1>
      <p className="page__lede">{user.email}</p>

      <div className="section stack">
        <a href="/budget" className="link">
          Manage your monthly plan
        </a>
        <a href="/dashboard" className="link">
          Gmail connection &amp; account data
        </a>
      </div>

      <DashboardBottomTabBar active="settings" />
    </div>
  );
}

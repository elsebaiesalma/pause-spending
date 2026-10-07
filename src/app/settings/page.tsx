import { redirect } from "next/navigation";

// Settings became the Account page, reached from the initials circle in the
// header. Kept as a redirect so any old link or bookmark still lands.
export default function SettingsPage() {
  redirect("/account");
}

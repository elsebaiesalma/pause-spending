import { redirect } from "next/navigation";
import { isGmailEnabled } from "@/lib/demo";

// The Gmail connect, success, done and delete screens are parked with Google
// sign-in. Anyone who reaches them from an old link goes Home instead.
export default function ConnectGmailLayout({ children }: { children: React.ReactNode }) {
  if (!isGmailEnabled()) redirect("/dashboard");
  return children;
}

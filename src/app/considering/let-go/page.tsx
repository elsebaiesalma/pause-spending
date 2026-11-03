import { redirect } from "next/navigation";

// The let-go list is now the Let go tab on Decisions; old links still land there.
export default function LetGoListPage() {
  redirect("/considering?tab=let-go");
}

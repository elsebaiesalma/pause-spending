import { classifyEmailByRules, type ClassifiableEmail } from "./ruleBasedFilter";
import { classifyEmailByLLM } from "./llmFilter";

// The final outcome every email must land in - no email is ever left
// unclassified. "needs_review" covers both genuinely low-confidence LLM
// calls and (from Step 7 onward) emails the review queue surfaces to the
// user rather than auto-deciding.
export type FinalClassification = "in_scope" | "out_of_scope" | "needs_review";

export async function classifyEmail(
  email: ClassifiableEmail & { snippet?: string }
): Promise<FinalClassification> {
  const ruleResult = classifyEmailByRules(email);
  if (ruleResult !== "ambiguous") {
    return ruleResult;
  }

  const llmResult = await classifyEmailByLLM(email);
  if (llmResult.confidence === "low") {
    return "needs_review";
  }

  return llmResult.in_scope ? "in_scope" : "out_of_scope";
}

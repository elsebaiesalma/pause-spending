import { classifyEmailTypeByRules, type ClassifiableTypeEmail, type EmailType } from "./emailTypeRules";
import { classifyEmailTypeByLLM } from "./emailTypeLlmFilter";

export type { EmailType, ClassifiableTypeEmail };

// The single entry point: rules first (cheap, no API call), LLM fallback
// for anything ambiguous. A low-confidence LLM result is treated as
// "other" rather than risking a wrong "order_confirmation" call - erring
// toward not creating a purchase when genuinely unsure, never the reverse.
export async function classifyEmailType(email: ClassifiableTypeEmail): Promise<EmailType> {
  const ruleResult = classifyEmailTypeByRules(email);
  if (ruleResult !== "ambiguous") {
    return ruleResult;
  }

  const llmResult = await classifyEmailTypeByLLM(email);
  if (llmResult.confidence === "low") {
    return "other";
  }

  return llmResult.type;
}

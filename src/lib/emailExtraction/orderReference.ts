// Cheap, deterministic fallback for when the LLM extraction doesn't surface
// an order number - real order numbers very often sit right in the subject
// line (e.g. "Your order #374003606 has been shipped", "Order 68391089706371
// has been shipped"), which the LLM should already be reading but doesn't
// always reliably pick up on. Only ever used to fill in a null, never to
// override the LLM's own answer.
// Every pattern requires at least one digit in the captured token - a real
// order number always has one; without this, "order confirmation" or
// "order confirmed" (no number at all) would otherwise match the second
// pattern and capture the word "confirmation"/"confirmed" as if it were an
// order number.
const SUBJECT_ORDER_NUMBER_PATTERNS = [
  /#\s*([A-Za-z0-9-]*\d[A-Za-z0-9-]{3,})/,
  /\border\s*(?:number|no\.?)?[\s:#]*([A-Za-z0-9-]*\d[A-Za-z0-9-]{4,})/i,
];

export function deriveOrderReferenceFromSubject(subject: string): string | null {
  for (const pattern of SUBJECT_ORDER_NUMBER_PATTERNS) {
    const match = subject.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Pure, browser-safe parsing for the pause screen's reflection form -
// deliberately kept out of reflection.ts, which imports @/lib/prisma. This
// file is also imported by BuyAnywayButton.tsx (a client component), so it
// must never import anything server-only.

// The "what would this replace" chip group uses one radio group whose
// value is either a wardrobe item id or this sentinel, so "answered
// nothing" and "hasn't answered at all" are never conflated (see
// hasAnyReflectionAnswer).
export const REFLECTION_NOTHING_VALUE = "__nothing__";

export type ParsedReflection = {
  replacesWardrobeItemId: string | null;
  replacesNothing: boolean;
  needScore: number | null;
  reasonFor: string | null;
  reasonAgainst: string | null;
};

// Whether the reflection form (embedded in the same <form> as the pause
// screen's Pause/Let it go/Buy anyway buttons - see pause/page.tsx) has at
// least one field filled in, live in the browser. Used both server-side
// (to decide whether to persist anything) and by the client-side Buy
// anyway gate (BuyAnywayButton.tsx), which reads the same field names out
// of the same form.
export function hasAnyReflectionAnswer(form: FormData): boolean {
  const replaces = form.get("reflectionReplaces")?.toString();
  const needScore = form.get("reflectionNeedScore")?.toString();
  const reasonFor = form.get("reflectionReasonFor")?.toString().trim();
  const reasonAgainst = form.get("reflectionReasonAgainst")?.toString().trim();
  return Boolean(replaces || needScore || reasonFor || reasonAgainst);
}

export function parseReflectionFromForm(form: FormData): ParsedReflection | null {
  if (!hasAnyReflectionAnswer(form)) {
    return null;
  }

  const replaces = form.get("reflectionReplaces")?.toString() || null;
  const needScoreRaw = form.get("reflectionNeedScore")?.toString();
  const needScoreNum = needScoreRaw ? Number(needScoreRaw) : null;

  return {
    replacesWardrobeItemId: replaces && replaces !== REFLECTION_NOTHING_VALUE ? replaces : null,
    replacesNothing: replaces === REFLECTION_NOTHING_VALUE,
    needScore:
      needScoreNum && Number.isInteger(needScoreNum) && needScoreNum >= 1 && needScoreNum <= 7 ? needScoreNum : null,
    reasonFor: form.get("reflectionReasonFor")?.toString().trim() || null,
    reasonAgainst: form.get("reflectionReasonAgainst")?.toString().trim() || null,
  };
}

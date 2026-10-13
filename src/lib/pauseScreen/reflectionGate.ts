// The Buy anyway gate asks for one reflection answer first. An answer is a
// saved reflection (need score, what it would replace, a reason) or a look
// the person has built from their closet for this item.
export function hasReflectionAnswer(reflection: unknown | null, hasSavedLook: boolean): boolean {
  return reflection !== null || hasSavedLook;
}

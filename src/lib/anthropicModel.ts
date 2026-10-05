// The one model every Claude call in this app uses. Set ANTHROPIC_MODEL in
// the environment to override it (for example, to compare a different model)
// without a code change.
//
// Checked against the live API on 2026-10-05: claude-sonnet-5-5 returned a
// successful response, and so did claude-sonnet-5 and claude-opus-5.
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";

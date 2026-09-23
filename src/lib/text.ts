// The model occasionally emits a literal backslash-u-escape sequence
// (e.g. the six characters `—`) as plain text inside an otherwise
// valid JSON string field, rather than the real character - the SDK's
// JSON parsing has nothing to normalize there, since `\\u2014` is a
// perfectly valid escaped-backslash-followed-by-text as far as JSON is
// concerned. Applied to every AI-generated string shown to the user, so a
// stray escape never reaches the page as garbled text.
const LITERAL_UNICODE_ESCAPE = /\\u([0-9a-fA-F]{4})/g;

export function normalizeAiText(text: string): string {
  return text.replace(LITERAL_UNICODE_ESCAPE, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

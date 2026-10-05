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

// Text scraped out of raw HTML (a <title> tag, a meta content attribute)
// via regex, not a real DOM/HTML parser, so entities like &#39; or &amp;
// never get decoded on their own - applied to every such scraped field
// before it's shown to the user, so a real apostrophe never reaches the
// confirm screen as a literal "&#39;".
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_HTML_ENTITIES[entity] ?? match;
  });
}

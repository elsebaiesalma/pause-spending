// Up to two letters for the header's account circle: first letters of the
// first two words of the name, else the first one or two letters of the
// email's local part, else "?". Never throws on missing data.
export function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const local = (email ?? "").split("@")[0].replace(/[^a-zA-Z]/g, "");
  return local ? local.slice(0, 2).toUpperCase() : "?";
}

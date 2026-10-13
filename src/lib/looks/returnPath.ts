// Only same-site paths: "/lookbook", "/desired-items/abc/pause". Anything with
// a second slash up front, a scheme or a backslash falls back to the Lookbook,
// so a crafted ?returnTo= can never send someone to another site.
export function safeReturnPath(value: string | undefined | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes(":")) {
    return "/lookbook";
  }
  return value;
}

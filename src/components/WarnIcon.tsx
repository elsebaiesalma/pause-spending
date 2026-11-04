// The warning mark that goes with every warn-coloured message (the design
// system never signals a problem with colour alone).
export function WarnIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none", verticalAlign: "-0.15em" }}
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.14" />
      <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="14.25" r="1.25" fill="currentColor" />
    </svg>
  );
}

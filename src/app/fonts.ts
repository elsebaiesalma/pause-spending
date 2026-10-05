import localFont from "next/font/local";

// Self-hosted (not linked via <link> at runtime, per the design's own font
// guidance) - Clash Display isn't on Google Fonts, so it's the one typeface
// in the system pulled in as a local font file rather than next/font/google.
export const clashDisplay = localFont({
  variable: "--font-clash",
  display: "swap",
  src: [
    { path: "../../public/fonts/clash-display/ClashDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
});

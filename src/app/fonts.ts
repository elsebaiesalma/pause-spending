import localFont from "next/font/local";

// Self-hosted (not linked via <link> at runtime, per the design's own font
// guidance) - scoped to the home page only via its own CSS variable, so
// the rest of the app keeps the Cormorant Garamond / Jost pairing.
export const clashDisplay = localFont({
  variable: "--font-clash",
  display: "swap",
  src: [
    { path: "../../public/fonts/clash-display/ClashDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
});

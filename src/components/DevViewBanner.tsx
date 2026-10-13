import { devWardrobeBanner } from "@/lib/devWardrobeView";

// Shown on every page while DEV_WARDROBE_VIEW is filtering the wardrobe, so it
// is never left on by accident. Renders nothing in production or when unset.
export function DevViewBanner() {
  const text = devWardrobeBanner();
  if (!text) return null;
  return (
    <p className="dev-view-banner" role="status">
      {text}
    </p>
  );
}

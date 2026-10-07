// Display-name helpers for wardrobe items. Retailers put their own name at
// the start of a product title ("COS Boxy Fit Tee"), which just repeats the
// brand line the card already shows.

const SEPARATORS = /^[\s\-–—:|·,]+/;

// Strips a leading brand from an item name: "COS Boxy Fit Tee" with brand
// "COS" gives "Boxy Fit Tee". Matches case-insensitively and only at a word
// boundary, so a brand that merely starts the first word ("Cosmic Tee" with
// brand "COS") is left alone. Never returns an empty name - if the brand is
// the whole name, the name is returned unchanged.
export function stripBrandPrefix(name: string, brand: string | null | undefined): string {
  const trimmedName = name.trim();
  const trimmedBrand = brand?.trim();
  if (!trimmedBrand || trimmedName.length <= trimmedBrand.length) return name;
  if (trimmedName.slice(0, trimmedBrand.length).toLowerCase() !== trimmedBrand.toLowerCase()) return name;

  const rest = trimmedName.slice(trimmedBrand.length);
  if (!SEPARATORS.test(rest)) return name;
  const stripped = rest.replace(SEPARATORS, "").trim();
  return stripped.length > 0 ? stripped : name;
}

// Capitalizes the first letter only ("espresso" -> "Espresso"). The rest is
// kept exactly as typed, since guessing at the intended casing of the other
// letters ("OFF WHITE", "Off-white") would be wrong as often as right.
export function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 0 ? trimmed : trimmed[0].toUpperCase() + trimmed.slice(1);
}

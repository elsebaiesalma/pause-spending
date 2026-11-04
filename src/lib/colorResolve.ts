import { classifyColorFamilyByLLM, isColorFamily, lookupColorFamily, type ColorFamily } from "@/lib/colorFamily";

// What to store for a colour the person picked or typed. A chosen family is
// kept as is. A colour typed under "Other" (e.g. "Burgundy") is kept as the
// word for display and filed under the closest family, because redundancy
// matching only understands the fixed families: first the static word list,
// then the tagging model for anything it doesn't know. A failed model call
// leaves the family empty rather than failing the save.
export async function resolveColor(input: {
  colorFamily?: string | null;
  colorName?: string | null;
}): Promise<{ colorFamily: ColorFamily | null; colorName: string | null }> {
  const name = input.colorName?.trim().slice(0, 40) || null;
  const chosen = input.colorFamily?.trim() || null;
  if (chosen && isColorFamily(chosen)) return { colorFamily: chosen, colorName: name };
  if (!name) return { colorFamily: null, colorName: null };

  const known = lookupColorFamily(name) ?? lookupColorFamily(name.split(/\s+/).slice(-1)[0]);
  if (known) return { colorFamily: known, colorName: name };
  try {
    return { colorFamily: await classifyColorFamilyByLLM(name), colorName: name };
  } catch (error) {
    console.warn("Could not file a typed colour under a family:", error instanceof Error ? error.message : error);
    return { colorFamily: null, colorName: name };
  }
}

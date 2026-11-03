// The "you want / you own" comparison grid on the pause screen. It only
// reports attributes both items actually have, and says match or different;
// never a percentage, because rule-based matching can't justify a precise
// number (see BACKLOG.md, "Similarity display on the pause screen").
export type ComparableItem = {
  category: string | null;
  colorFamily: string | null;
  colorName?: string | null;
  styleTags: string[];
};

export type AttributeRow = {
  label: "Color" | "Category" | "Style";
  wanted: string;
  owned: string;
  match: boolean;
};

export type SimilarityBand = "Very similar" | "Somewhat similar" | "A little similar";

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function colorLabel(item: ComparableItem): string | null {
  const name = item.colorName?.trim();
  if (name) return titleCase(name);
  return item.colorFamily ? titleCase(item.colorFamily) : null;
}

export function compareAttributes(wanted: ComparableItem, owned: ComparableItem): AttributeRow[] {
  const rows: AttributeRow[] = [];

  const wantedColor = colorLabel(wanted);
  const ownedColor = colorLabel(owned);
  if (wantedColor && ownedColor && wanted.colorFamily && owned.colorFamily) {
    rows.push({ label: "Color", wanted: wantedColor, owned: ownedColor, match: wanted.colorFamily === owned.colorFamily });
  }

  if (wanted.category && owned.category) {
    rows.push({
      label: "Category",
      wanted: titleCase(wanted.category),
      owned: titleCase(owned.category),
      match: wanted.category === owned.category,
    });
  }

  if (wanted.styleTags.length > 0 && owned.styleTags.length > 0) {
    const shared = wanted.styleTags.find((tag) => owned.styleTags.includes(tag));
    rows.push({
      label: "Style",
      wanted: titleCase(shared ?? wanted.styleTags[0]),
      owned: titleCase(shared ?? owned.styleTags[0]),
      match: shared !== undefined,
    });
  }

  return rows;
}

export function similarityBand(rows: AttributeRow[]): SimilarityBand {
  const matches = rows.filter((row) => row.match).length;
  if (matches >= 2) return "Very similar";
  if (matches === 1) return "Somewhat similar";
  return "A little similar";
}

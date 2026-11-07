import { Tabs } from "@/components/PageHeader";

// Closet holds two views: the pieces you own, and looks built from them.
export function ClosetTabs({ current, pieces, looks }: { current: "pieces" | "looks"; pieces: number; looks: number }) {
  return (
    <Tabs
      label="Closet"
      tour="closet-tabs"
      items={[
        { href: "/wardrobe", label: "Pieces", count: pieces, current: current === "pieces" },
        { href: "/lookbook", label: "Looks", count: looks, current: current === "looks" },
      ]}
    />
  );
}

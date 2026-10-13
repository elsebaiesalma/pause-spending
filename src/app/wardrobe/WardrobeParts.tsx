"use client";

import Image from "next/image";
import type { WardrobeEntry } from "@/lib/wardrobeView";
import styles from "./page.module.css";

const UNSPLASH_PREFIX = "https://images.unsplash.com/";

// The Unsplash host is allowed in next.config.ts, so those photos go through
// next/image. Real items can come from any retailer's domain, which Next
// can't be told about ahead of time, so they stay plain lazy <img> tags.
export function ItemImage({ item, sizes }: { item: WardrobeEntry; sizes: string }) {
  if (!item.imageUrl) {
    return (
      <div className={styles.imagePlaceholder}>
        <span className={styles.imagePlaceholderLabel}>{item.category || "No category"}</span>
      </div>
    );
  }
  if (item.imageUrl.startsWith(UNSPLASH_PREFIX)) {
    return <Image src={item.imageUrl} alt={item.displayName} fill sizes={sizes} draggable={false} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.imageUrl} alt={item.displayName} loading="lazy" decoding="async" draggable={false} />
  );
}

// The same Edit / Mark returned menu in both views.
export function ItemMenu({ item }: { item: WardrobeEntry }) {
  return (
    <details className={styles.menu}>
      <summary className={styles.menuToggle} aria-label={`More actions for ${item.displayName}`}>
        ⋯
      </summary>
      <div className={styles.menuPanel}>
        <a href={`/wardrobe/${item.id}/edit`}>Edit</a>
        <form action={`/api/wardrobe/${item.id}/return`} method="POST">
          <button type="submit">Mark returned</button>
        </form>
      </div>
    </details>
  );
}

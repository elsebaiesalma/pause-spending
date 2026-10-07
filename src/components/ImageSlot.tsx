"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ImageSlot.module.css";

const EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const;

// A slot for an image the owner supplies in /public/images. It tries
// /images/<name>.<ext> for each common extension and shows a neutral
// placeholder (with the expected filename) until one loads, so dropping the
// file in is all it takes - no code change, and no broken-image icon while
// it's missing. Checked in the browser rather than on the server so it also
// works where /public isn't on the function's filesystem.
export function ImageSlot({
  name,
  alt,
  fit = "cover",
  className,
}: {
  name: string;
  alt: string;
  // "contain" for screenshots, which must never be cropped or recolored.
  fit?: "cover" | "contain";
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const exhausted = attempt >= EXTENSIONS.length;
  const src = exhausted ? null : `/images/${name}.${EXTENSIONS[attempt]}`;

  // An image that finished loading before hydration never fires React's
  // onLoad, so check once on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, [attempt]);

  return (
    <div className={`${styles.slot} ${className ?? ""}`} data-fit={fit}>
      {!loaded && (
        <div className={styles.placeholder} role="img" aria-label={alt}>
          <span className={styles.caption}>Image to come</span>
          <span className={styles.path}>/images/{name}.jpg</span>
        </div>
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt={alt}
          className={styles.image}
          data-loaded={loaded ? "true" : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setAttempt((n) => n + 1)}
        />
      )}
    </div>
  );
}

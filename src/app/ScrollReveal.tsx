"use client";

import { useEffect } from "react";

// Renders nothing - just attaches an IntersectionObserver to every
// [data-reveal] element on the page and adds a "visible" class as each
// scrolls into view. Kept as its own client leaf so the page itself stays
// a plain server component.
export function ScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return null;
}

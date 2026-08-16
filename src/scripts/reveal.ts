/**
 * reveal — adds .is-visible to .reveal-init elements as they scroll in.
 * Content is visible by default in CSS; JS only *enhances* the entrance.
 * If JS fails, nothing is hidden (fail-safe per design system §8).
 *
 * Astro lifecycle: REBIND PER PAGE. Bundled module scripts execute once,
 * so the observers are created once — but the observed DOM is swapped on
 * every ClientRouter navigation. Strategy:
 *   1. Initial scan + observe every existing `.reveal.reveal-init`.
 *   2. Re-scan on `astro:page-load` (fires after the new page's DOM is in
 *      place and scripts have executed).
 *   3. A MutationObserver watches `document.body` for newly added
 *      `.reveal.reveal-init` nodes and observes them too. Already-revealed
 *      nodes are skipped. (The observer itself survives body swaps because
 *      it's attached with `subtree: true` to the current body; the
 *      astro:page-load re-scan covers anything the swap itself missed.)
 */

if (typeof window !== "undefined" && typeof IntersectionObserver !== "undefined") {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );

  const observe = (el: Element) => {
    // skip already-revealed nodes (re-observing them is harmless but
    // wasteful, and unobserving on intersect means they won't re-trigger)
    if (!el.classList.contains("is-visible")) io.observe(el);
  };

  const scan = (root: ParentNode = document) => {
    root
      .querySelectorAll<HTMLElement>(".reveal.reveal-init")
      .forEach(observe);
  };

  // 1. initial scan
  scan();

  // 2. re-scan after every client-side navigation
  document.addEventListener("astro:page-load", () => scan());

  // 3. watch for future `.reveal.reveal-init` nodes (dynamic mounts, etc.)
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        const el = n as HTMLElement;
        // the added node itself might match…
        if (el.classList?.contains("reveal") && el.classList?.contains("reveal-init")) {
          observe(el);
        }
        // …or contain descendants that match
        scan(el);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
} else if (typeof window !== "undefined") {
  // No IO support — reveal everything immediately, now and on every
  // subsequent navigation.
  const revealAll = (root: ParentNode = document) => {
    root
      .querySelectorAll<HTMLElement>(".reveal.reveal-init")
      .forEach((el) => el.classList.add("is-visible"));
  };
  revealAll();
  document.addEventListener("astro:page-load", () => revealAll());
}

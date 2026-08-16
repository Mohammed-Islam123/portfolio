/**
 * smooth-scroll — Lenis-powered buttery scrolling (gorix.zip uses the same).
 *
 *  • initialises Lenis and drives its RAF loop — INIT ONCE per page load
 *    (module scripts execute once; Astro's ClientRouter replaces <body>
 *    between navigations but must NOT stack a second rAF loop)
 *  • intercepts in-page anchor clicks (`a[href^="#"]`) and routes them
 *    through `lenis.scrollTo` with a -96px offset so section tops clear
 *    the floating nav pill (matches `section[id] { scroll-margin-top }`)
 *  • skipped entirely when the user prefers reduced motion — Lenis is
 *    motion, so we respect the preference and fall back to native scroll
 *  • elements tagged `data-lenis-prevent` (e.g. the projects carousel
 *    track) are excluded from Lenis' wheel hijack so they scroll natively
 *
 *  The Lenis instance is exposed on `window.__lenis` so other components
 *  (e.g. the "view all" projects modal) can stop/start it to fully isolate
 *  their internal scroll. Stopping Lenis while a modal is open prevents
 *  wheel events inside the modal's scroll area from also scrolling the
 *  page underneath (Lenis intercepts wheel globally, so `overflow-y-auto`
 *  on the modal alone is not enough).
 */

declare global {
  interface Window {
    __lenis?: import("lenis").default | null;
  }
}

if (typeof window !== "undefined") {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) {
    // guard: init once per real page load. SPA navigations swap <body>,
    // but this module (and the rAF loop it started) keeps running.
    if (!window.__lenis) {
      void (async () => {
        const Lenis = (await import("lenis")).default;
        const lenis = new Lenis({
          duration: 1.1,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.6,
        });
        // expose for other components (modal scroll-lock)
        window.__lenis = lenis;

        const loop = (time: number) => {
          lenis.raf(time);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        // body swap invalidates Lenis' cached scroll extents — re-measure
        // after every client-side navigation
        document.addEventListener("astro:after-swap", () => {
          lenis.resize();
        });
      })();
    }

    // anchor links → lenis.scrollTo (smooth in-page nav).
    // Delegated on document, so it survives body swaps.
    //
    // CAPTURE PHASE is required: Astro's ClientRouter also listens for
    // clicks (registered earlier, in <head>) and for same-page hash
    // links it performs its own native `location.href` hash jump —
    // which fights the Lenis animation. The router skips clicks that
    // are already defaultPrevented, so running in capture (before the
    // router's bubble-phase listener) and calling preventDefault here
    // leaves Lenis as the sole handler. Parity note: the Next.js
    // version also preventDefaulted without updating the hash.
    document.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]'
      );
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      if (window.__lenis) {
        window.__lenis.scrollTo(el as HTMLElement, {
          offset: -96,
          duration: 1.2,
        });
      } else {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth" });
      }
    }, { capture: true });
  }
}

export {};

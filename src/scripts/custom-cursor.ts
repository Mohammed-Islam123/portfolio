/**
 * custom-cursor — theoptimisticdesigner.com exact match.
 *
 * Two square layers, both with `mix-blend-mode: difference` so they
 * auto-invert whatever sits underneath (white on dark → black on light,
 * no per-theme work needed):
 *
 *   - dot  (inner): 8px solid square, snaps to the cursor — feels precise
 *   - ring (outer): 30px square outline at rest, lerps toward the cursor —
 *                   feels weighty. On hover over interactive elements
 *                   (a, button, [data-cursor="hover"]), the ring GROWS to
 *                   48px and the border turns soft green (#8EEA7C).
 *
 * Hidden by default until the mouse moves (avoids a stray dot in the
 * center on first load). Hides entirely on touch / reduced-motion /
 * hidden pointer.
 *
 * ── Mode priority (highest first) ─────────────────────────────────
 *   1. `data-cursor="default"`  → dot+ring hidden, ONLY the native
 *      pointer shows. Use on small text links where the custom cursor
 *      would feel intrusive (e.g. project card action links). Explicit
 *      override, wins over everything.
 *   2. `data-cursor="scroll"`   → dot+ring hidden, a "‹ scroll ›" pill
 *      takes their place — signals "you can drag / scroll horizontally
 *      here". Used on the coverflow stage. Native cursor hidden over
 *      those elements via the `.cursor-custom` html class.
 *   3. interactive (a, button, [data-cursor="hover"]) → ring grows +
 *      turns green (auto-detected + explicit).
 *   4. nothing                   → dot + ring, rest state.
 *
 * NOTE: the coverflow project CARDS are NOT tagged `data-cursor="hover"`
 * — they live inside the scroll-tagged stage, so the scroll pill shows
 * over them (the user explicitly asked for the scroll indicator, not the
 * square, over the cards). The dot+ring+squares show over the rest of the
 * page (hero text, about, toolkit, values, contact, nav, etc.).
 *
 * Astro lifecycle: INIT ONCE. The three layers are appended to
 * <html> (documentElement), NOT <body> — Astro's ClientRouter replaces
 * the entire body on SPA navigation, which would destroy body-mounted
 * layers while this once-only module script kept running.
 */

if (typeof window !== "undefined" && !(window as { __cursorInit?: boolean }).__cursorInit) {
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (finePointer && !reducedMotion) {
    (window as { __cursorInit?: boolean }).__cursorInit = true;

    // build the three layers (styles come from .c-dot / .c-ring in
    // global.css; the scroll pill is styled inline like the original)
    const dot = document.createElement("div");
    dot.className = "c-dot";
    dot.setAttribute("aria-hidden", "");
    dot.style.opacity = "0";
    dot.style.transform = "translate3d(-100px, -100px, 0) translate(-50%, -50%)";

    const ring = document.createElement("div");
    ring.className = "c-ring";
    ring.setAttribute("aria-hidden", "");
    ring.style.opacity = "0";
    ring.style.transform = "translate3d(-100px, -100px, 0) translate(-50%, -50%)";

    const scrollPill = document.createElement("div");
    scrollPill.setAttribute("aria-hidden", "");
    scrollPill.className =
      "c-scroll-pill pointer-events-none fixed left-0 top-0 z-[101] flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2.5 py-1 font-mono text-xs tracking-[0.14em] text-[var(--ink)] uppercase backdrop-blur-md transition-opacity [transition-duration:var(--transition-fast)]";
    scrollPill.style.opacity = "0";
    scrollPill.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)";
    const chevL = document.createElement("span");
    chevL.textContent = "‹";
    chevL.style.color = "var(--ink-muted)";
    const label = document.createElement("span");
    label.textContent = "scroll";
    const chevR = document.createElement("span");
    chevR.textContent = "›";
    chevR.style.color = "var(--ink-muted)";
    scrollPill.append(chevL, label, chevR);

    // append to documentElement — survives ClientRouter body swaps
    document.documentElement.append(dot, ring, scrollPill);
    document.documentElement.classList.add("cursor-custom");

    // state
    let hovering = false;
    let scrollMode = false;
    let defaultMode = false;
    let visible = false;

    const applyVisibility = () => {
      const showCursor = visible && !scrollMode && !defaultMode;
      dot.style.opacity = showCursor ? "1" : "0";
      ring.style.opacity = showCursor ? "1" : "0";
      ring.classList.toggle("c-ring--grow", hovering);
      scrollPill.style.opacity = visible && scrollMode ? "1" : "0";
    };

    const onMove = (e: MouseEvent) => {
      // update the tracked position + show the layers on ANY move (the
      // scroll pill also depends on `visible`, so this must happen before
      // the mode branches — not just on the plain/interactive path)
      cx = e.clientX;
      cy = e.clientY;
      visible = true;

      // mode detection — see priority list in the file docstring above.
      const el = e.target as HTMLElement | null;
      // (1) default — explicit "native cursor only"
      const defaultZone = el?.closest('[data-cursor="default"]');
      if (defaultZone) {
        defaultMode = true;
        scrollMode = false;
        hovering = false;
        applyVisibility();
        return;
      }
      defaultMode = false;
      // (2) scroll zone — show the scroll pill (and hide dot+ring).
      // NOTE: this catches the project cards too — they live inside the
      // scroll-tagged coverflow stage, so the scroll pill shows over them
      // (the user explicitly asked for the scroll indicator over cards).
      const scrollZone = el?.closest('[data-cursor="scroll"]');
      if (scrollZone) {
        scrollMode = true;
        hovering = false;
        applyVisibility();
        return;
      }
      // (3) interactive — ring grows + turns green
      scrollMode = false;
      const interactive = !!el?.closest(
        'a, button, input, textarea, select, [role="button"], [data-cursor="hover"]'
      );
      hovering = interactive;
      applyVisibility();
    };

    const onLeave = () => {
      visible = false;
      applyVisibility();
    };
    const onEnter = () => {
      visible = true;
      applyVisibility();
    };

    // the lerp loop — drives the dot (snaps), the ring (eased), and the
    // scroll pill (eased). The reference site uses 0.16 lerp for the ring.
    // translate(-50%, -50%) centers each element regardless of its
    // current size — important because the ring animates 30→48px.
    let cx = -100;
    let cy = -100;
    let rx = -100;
    let ry = -100;
    let rafId = 0;
    let running = false;
    const loop = () => {
      // dot snaps to cursor
      dot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      // ring eases toward cursor (0.16 lerp — same as the reference)
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      // scroll pill follows the eased ring position
      scrollPill.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(loop);
    };
    // lazy-start: only run the loop while the pointer is actually on the
    // page (avoids a perpetual idle rAF when the mouse is absent).
    const startLoop = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    window.addEventListener("mousemove", (e) => {
      onMove(e);
      startLoop();
    }, { passive: true });
    window.addEventListener("mouseover", onEnter);
    // onLeave fires on element boundaries too; only stop the loop when
    // the pointer genuinely leaves the window (relatedTarget is null).
    window.addEventListener("mouseout", (e) => {
      onLeave();
      if (e.relatedTarget === null) stopLoop();
    });
  }
}

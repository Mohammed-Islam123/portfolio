import { useTranslations } from "../config/i18n";

/**
 * Custom cursor — values and movement reproduced from Codapress's rendered
 * cursor: a 30px large square (0.2 follow), 10px small square (0.45 follow),
 * and a 120 × 110 swipe label (0.2 follow). The project action links retain
 * link priority, as requested, even though they sit inside the drag surface.
 */

if (typeof window !== "undefined") {
  let bigBall = document.querySelector<HTMLElement>(".c-ring");
  let smallBall = document.querySelector<HTMLElement>(".c-dot");
  let dragLabel = document.querySelector<HTMLElement>(".c-drag-label");
  let labelText = dragLabel?.querySelector<HTMLElement>(".c-drag-text");

  if (!bigBall || !smallBall || !dragLabel) {
    bigBall = document.createElement("div");
    bigBall.className = "c-ring";
    bigBall.setAttribute("aria-hidden", "true");
    const bigShape = document.createElement("span");
    bigShape.className = "c-cursor-shape";
    bigBall.append(bigShape);

    smallBall = document.createElement("div");
    smallBall.className = "c-dot";
    smallBall.setAttribute("aria-hidden", "true");
    const smallShape = document.createElement("span");
    smallShape.className = "c-cursor-shape";
    smallBall.append(smallShape);

    dragLabel = document.createElement("div");
    dragLabel.className = "c-drag-label";
    dragLabel.setAttribute("aria-hidden", "true");
    const labelInner = document.createElement("span");
    labelInner.className = "c-drag-label-inner";
    const leftChevron = document.createElement("span");
    leftChevron.className = "c-drag-chevron";
    const label = document.createElement("span");
    label.className = "c-drag-text";
    labelText = label;
    const rightChevron = document.createElement("span");
    rightChevron.className = "c-drag-chevron c-drag-chevron--right";
    labelInner.append(leftChevron, label, rightChevron);
    dragLabel.append(labelInner);

    for (const layer of [bigBall, smallBall, dragLabel]) {
      layer.style.opacity = "0";
      layer.style.visibility = "hidden";
      layer.style.transform = "translate3d(-100px, -100px, 0)";
    }
  }

  const ensureMounted = () => {
    if (bigBall && !document.documentElement.contains(bigBall)) {
      document.documentElement.append(bigBall, smallBall!, dragLabel!);
    }
    if (labelText) {
      labelText.textContent = useTranslations(
        document.documentElement.lang === "fr" ? "fr" : "en"
      )("SWIPE");
    }
  };

  ensureMounted();
  document.addEventListener("astro:after-swap", ensureMounted);
  document.addEventListener("astro:page-load", ensureMounted);

  if (!(window as { __cursorLoopInit?: boolean }).__cursorLoopInit) {
    (window as { __cursorLoopInit?: boolean }).__cursorLoopInit = true;

    let visible = false;
    let mode: "rest" | "link" | "drag" = "rest";
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyState = () => {
      if (!bigBall || !smallBall || !dragLabel) return;
      const isActive = mode === "link" || mode === "drag";
      const isDrag = mode === "drag";

      for (const ball of [bigBall, smallBall]) {
        ball.style.opacity = visible ? "1" : "0";
        ball.style.visibility = visible ? "visible" : "hidden";
      }
      dragLabel.style.opacity = visible && isDrag ? "1" : "0";
      dragLabel.style.visibility = visible && isDrag ? "visible" : "hidden";

      bigBall.classList.toggle("c-ring--active", isActive);
      bigBall.classList.toggle("c-ring--label-active", isDrag);
      dragLabel.classList.toggle("c-drag-label--drag", isDrag);

      document.documentElement.classList.toggle("cursor-custom", visible);
    };

    let pointerX = -100;
    let pointerY = -100;
    let bigX = -100;
    let bigY = -100;
    let smallX = -100;
    let smallY = -100;
    let labelX = -100;
    let labelY = -100;
    let rafId = 0;
    let running = false;

    const loop = () => {
      if (!bigBall || !smallBall || !dragLabel) return;

      if (motion.matches) {
        bigX = pointerX - 15;
        bigY = pointerY - 15;
        smallX = pointerX - 5;
        smallY = pointerY - 7;
        labelX = pointerX - 60;
        labelY = pointerY - 60;
      } else {
        bigX += (pointerX - 15 - bigX) * 0.2;
        bigY += (pointerY - 15 - bigY) * 0.2;
        smallX += (pointerX - 5 - smallX) * 0.45;
        smallY += (pointerY - 7 - smallY) * 0.45;
        labelX += (pointerX - 60 - labelX) * 0.2;
        labelY += (pointerY - 60 - labelY) * 0.2;
      }

      bigBall.style.transform = `translate3d(${bigX}px, ${bigY}px, 0)`;
      smallBall.style.transform = `translate3d(${smallX}px, ${smallY}px, 0)`;
      dragLabel.style.transform = `translate3d(${labelX}px, ${labelY}px, 0)`;

      const delta =
        Math.abs(pointerX - 15 - bigX) +
        Math.abs(pointerY - 15 - bigY) +
        Math.abs(pointerX - 5 - smallX) +
        Math.abs(pointerY - 7 - smallY);

      if (delta < 0.1 && !motion.matches) {
        running = false;
        return;
      }

      if (!motion.matches) {
        rafId = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const startLoop = () => {
      if (motion.matches) {
        loop();
        return;
      }
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") {
          visible = false;
          applyState();
          stopLoop();
          return;
        }

        pointerX = event.clientX;
        pointerY = event.clientY;
        visible = true;

        const target = event.target as HTMLElement | null;
        const isInteractive = !!target?.closest(
          'a, button, input, textarea, select, [role="button"], [data-cursor="hover"]'
        );
        const isDragSurface = !!target?.closest('[data-cursor="swipe"]');
        mode = isInteractive ? "link" : isDragSurface ? "drag" : "rest";

        ensureMounted();
        applyState();
        startLoop();
      },
      { passive: true }
    );

    document.addEventListener("mouseleave", () => {
      visible = false;
      applyState();
      stopLoop();
    });

    document.addEventListener("mouseenter", () => {
      visible = true;
      applyState();
      startLoop();
    });
  }
}

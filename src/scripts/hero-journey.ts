import type { HeroJourneyMedia } from "../config/heroJourney";
import { playSound } from "./sound-init";

interface JourneySlot {
  card: HTMLDivElement;
  face: HTMLButtonElement;
  side: number;
  lane: number;
  bend: number;
  drift: number;
  tilt: number;
  progress: number;
  duration: number;
  generation: number;
  media: HeroJourneyMedia | null;
  next: HeroJourneyMedia | null;
  video: HTMLVideoElement | null;
  hovered: boolean;
  focused: boolean;
  pinned: boolean;
  dismissed: boolean;
  settleTimer: number;
}

interface ViewerOrigin {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const hoverQuery = window.matchMedia("(hover: hover)");
const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
const randomDuration = (base: number) => base * (0.88 + Math.random() * 0.24);

class HeroJourneyEl extends HTMLElement {
  private items: HeroJourneyMedia[] = [];
  private failed = new Set<string>();
  private slots: JourneySlot[] = [];
  private cleanupFns: (() => void)[] = [];
  private preloadQueue: HeroJourneyMedia[] = [];
  private preparedSources = new Set<string>();
  private preloading = 0;
  private preloadEnabled = false;
  private preloadConcurrency = 2;
  private duration = 12_000;
  private ready = false;
  private visible = false;
  private frame = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private nextSpawn = 0;
  private geometry: { rect: DOMRect; portrait?: DOMRect; cardWidth: number; safeBottom: number } | null = null;
  private revealTimer = 0;
  private mountVersion = 0;
  private pointerX = 0;
  private pointerY = 0;
  private viewerSlot: JourneySlot | null = null;
  private viewerAnimation: Animation | null = null;
  private viewerClosing = false;

  connectedCallback() {
    this.mountVersion++;
    try {
      this.items = JSON.parse(this.dataset.media ?? "[]") as HeroJourneyMedia[];
    } catch {
      this.items = [];
    }
    if (!this.items.length) return;
    this.duration = Math.max(1000, Number(this.dataset.duration) || 12_000);
    this.preloadConcurrency = Math.max(
      1,
      Math.min(3, Number(this.dataset.preloadConcurrency) || 2),
    );

    const hero = this.closest<HTMLElement>("hero-section");
    if (!hero) return;
    const onReveal = () => {
      if (this.ready || this.revealTimer) return;
      // The last hero-fade ends at 800ms delay + 800ms duration.
      const immediate = motionQuery.matches || hero.classList.contains("is-client-navigation");
      this.revealTimer = window.setTimeout(() => {
        this.revealTimer = 0;
        this.initialize();
      }, immediate ? 0 : 1600);
    };
    if (hero.classList.contains("revealed")) onReveal();
    const revealObserver = new MutationObserver(() => {
      if (hero.classList.contains("revealed")) onReveal();
    });
    revealObserver.observe(hero, { attributes: true, attributeFilter: ["class"] });
    this.cleanupFns.push(() => revealObserver.disconnect());

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = Boolean(entry?.isIntersecting);
      this.syncActivity();
    });
    visibilityObserver.observe(hero);
    this.cleanupFns.push(() => visibilityObserver.disconnect());

    const resizeObserver = new ResizeObserver(() => {
      if (this.ready) {
        // A resized destination invalidates an in-flight return animation.
        if (this.viewerSlot) {
          this.viewerAnimation?.cancel();
          this.viewerAnimation = null;
          this.querySelector<HTMLDialogElement>(".journey-viewer")?.close();
        }
        this.layout();
      }
    });
    resizeObserver.observe(this);
    this.cleanupFns.push(() => resizeObserver.disconnect());

    const onVisibility = () => this.syncActivity();
    const onMotion = () => {
      if (motionQuery.matches) {
        this.viewerAnimation?.cancel();
        this.viewerAnimation = null;
        if (this.viewerClosing) viewer.close();
        this.slots.forEach((slot) => this.planPath(slot));
      }
      this.layout();
      this.syncActivity();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || motionQuery.matches || this.viewerSlot || !this.visible) return;
      const rect = this.getBoundingClientRect();
      this.pointerX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      this.pointerY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      if (!this.frame) this.render();
    };
    const viewer = this.querySelector<HTMLDialogElement>(".journey-viewer")!;
    const onViewerClick = (event: MouseEvent) => {
      if (event.target === viewer ||
          (event.target as Element).closest(".journey-viewer-close")) void this.closeViewer();
    };
    const onViewerCancel = (event: Event) => {
      event.preventDefault();
      void this.closeViewer();
    };
    const onViewerClose = () => {
      this.restoreCursorFromViewer(viewer);
      this.viewerAnimation?.cancel();
      this.viewerAnimation = null;
      this.viewerClosing = false;
      const slot = this.viewerSlot;
      this.viewerSlot = null;
      viewer.querySelector(".journey-viewer-content")?.replaceChildren();
      if (slot) {
        delete slot.card.dataset.viewing;
        slot.pinned = false;
        slot.dismissed = true;
        window.clearTimeout(slot.settleTimer);
        slot.settleTimer = 0;
        delete slot.card.dataset.settling;
        slot.card.dataset.expanded = "false";
      }
      this.render();
      this.syncActivity();
    };
    viewer.addEventListener("click", onViewerClick);
    viewer.addEventListener("close", onViewerClose);
    viewer.addEventListener("cancel", onViewerCancel);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    motionQuery.addEventListener("change", onMotion);
    this.cleanupFns.push(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      viewer.removeEventListener("click", onViewerClick);
      viewer.removeEventListener("close", onViewerClose);
      viewer.removeEventListener("cancel", onViewerCancel);
      window.removeEventListener("pointermove", onPointerMove);
      motionQuery.removeEventListener("change", onMotion);
    });
  }

  disconnectedCallback() {
    this.viewerAnimation?.cancel();
    this.viewerAnimation = null;
    this.viewerClosing = false;
    const viewer = this.querySelector<HTMLDialogElement>(".journey-viewer");
    if (viewer) {
      this.restoreCursorFromViewer(viewer);
      viewer.close();
    }
    this.viewerSlot = null;
    this.mountVersion++;
    window.clearTimeout(this.revealTimer);
    this.revealTimer = 0;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastFrame = 0;
    this.elapsed = 0;
    this.nextSpawn = 0;
    this.geometry = null;
    for (const slot of this.slots) {
      window.clearTimeout(slot.settleTimer);
      slot.generation++;
      this.stopVideo(slot);
      slot.card.remove();
    }
    this.slots = [];
    this.preloadQueue = [];
    this.preparedSources.clear();
    this.preloading = 0;
    this.preloadEnabled = false;
    this.ready = false;
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  private initialize() {
    if (!this.isConnected || this.ready) return;
    this.ready = true;
    const initialLoads = this.layout();
    const version = this.mountVersion;
    const enablePreloading = () => {
      if (this.mountVersion !== version || this.preloadEnabled) return;
      this.preloadEnabled = true;
      this.slots.forEach((slot) => this.scheduleNext(slot));
    };
    // A stalled source must not prevent other upcoming media from preparing.
    const preloadSafety = window.setTimeout(enablePreloading, 4000);
    this.cleanupFns.push(() => window.clearTimeout(preloadSafety));
    Promise.allSettled(initialLoads).then(enablePreloading);
    this.syncActivity();
  }

  private count() {
    const width = this.getBoundingClientRect().width;
    const height = this.getBoundingClientRect().height;
    if (width >= 1024) return 6;
    if (width >= 640) return 4;
    if (width < 300 || height < 490) return 1;
    if (width < 340 || height < 610) return 2;
    return 3;
  }

  private layout() {
    if (!this.ready) return [];
    this.geometry = null;
    const loads: Promise<void>[] = [];
    const count = this.count();
    while (this.slots.length > count) {
      const slot = this.slots.pop()!;
      window.clearTimeout(slot.settleTimer);
      slot.generation++;
      this.stopVideo(slot);
      slot.card.remove();
    }
    while (this.slots.length < count) {
      const slot = this.createSlot();
      this.slots.push(slot);
      this.append(slot.card);
      this.planPath(slot);
      if (this.items.length) {
        loads.push(this.setMedia(slot, this.choose()));
        this.scheduleNext(slot);
      }
    }
    this.render();
    return loads;
  }

  private createSlot(): JourneySlot {
    const card = document.createElement("div");
    card.className = "journey-card";
    card.dataset.expanded = "false";
    card.dataset.ready = "false";
    const face = document.createElement("button");
    face.type = "button";
    face.className = "journey-face";
    face.setAttribute("aria-haspopup", "dialog");
    card.append(face);
    const slot: JourneySlot = {
      card, face,
      side: -1,
      lane: 0,
      bend: 0,
      drift: 0,
      tilt: 0,
      progress: -1,
      duration: randomDuration(this.duration),
      generation: 0,
      media: null,
      next: null,
      video: null,
      hovered: false,
      focused: false,
      pinned: false,
      dismissed: false,
      settleTimer: 0,
    };
    card.addEventListener("pointerenter", (event) => {
      if (hoverQuery.matches && event.pointerType === "mouse") {
        slot.hovered = true;
        if (this.viewerSlot) return;
        slot.dismissed = false;
        this.syncExpansion(slot);
      }
    });
    card.addEventListener("pointerleave", () => {
      slot.hovered = false;
      if (this.viewerSlot) return;
      this.syncExpansion(slot);
    });
    card.addEventListener("focusin", () => {
      slot.focused = true;
      if (this.viewerSlot) return;
      slot.dismissed = false;
      this.syncExpansion(slot);
    });
    card.addEventListener("focusout", (event) => {
      if (!card.contains(event.relatedTarget as Node | null)) {
        slot.focused = false;
        if (this.viewerSlot) return;
        this.syncExpansion(slot);
      }
    });
    face.addEventListener("click", () => {
      const media = face.querySelector<HTMLImageElement | HTMLVideoElement>(".journey-media");
      const viewer = this.querySelector<HTMLDialogElement>(".journey-viewer");
      if (!media || !viewer || viewer.open || this.viewerSlot || slot.card.dataset.ready !== "true") return;
      const origin = this.viewerOrigin(slot);
      const expanded = media.cloneNode(true) as HTMLImageElement | HTMLVideoElement;
      expanded.className = "journey-viewer-media";
      expanded.style.objectPosition = "";
      if (expanded instanceof HTMLImageElement) expanded.decoding = "async";
      if (expanded instanceof HTMLImageElement && slot.media?.thumbnail) {
        const original = new Image();
        original.onload = () => { expanded.src = original.src; };
        original.src = slot.media.source;
        viewer.addEventListener("close", () => { original.onload = null; }, { once: true });
      }
      if (expanded instanceof HTMLVideoElement) expanded.controls = true;
      const content = viewer.querySelector(".journey-viewer-content")!;
      content.replaceChildren(expanded);
      if (slot.media?.caption?.trim()) {
        const caption = document.createElement("figcaption");
        caption.className = "journey-viewer-caption";
        caption.textContent = slot.media.caption;
        content.append(caption);
      }
      slot.pinned = true;
      slot.dismissed = false;
      this.viewerSlot = slot;
      slot.card.dataset.viewing = "true";
      const ratio = media instanceof HTMLImageElement
        ? media.naturalWidth / media.naturalHeight
        : media.videoWidth / media.videoHeight;
      viewer.style.setProperty("--viewer-ratio", String(ratio));
      this.moveCursorIntoViewer(viewer);
      viewer.showModal();
      playSound("click");
      if (!motionQuery.matches) this.viewerAnimation = this.animateViewer(origin);
      this.syncExpansion(slot);
      this.syncActivity();
    });
    return slot;
  }

  private viewerOrigin(slot: JourneySlot): ViewerOrigin {
    const rect = slot.face.getBoundingClientRect();
    const style = getComputedStyle(slot.card);
    const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
    const scale = Math.hypot(matrix.a, matrix.b);
    const width = slot.face.offsetWidth * scale;
    const height = slot.face.offsetHeight * scale;
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width,
      height,
      rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
      opacity: Number(style.opacity),
    };
  }

  private animateViewer(origin: ViewerOrigin, closing = false) {
    const viewer = this.querySelector<HTMLDialogElement>(".journey-viewer")!;
    const content = viewer.querySelector<HTMLElement>(".journey-viewer-content")!;
    const target = viewer.querySelector<HTMLElement>(".journey-viewer-panel")!.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - target.left - target.width / 2;
    const y = origin.top + origin.height / 2 - target.top - target.height / 2;
    // Uniform scaling plus a crop preserves the photograph's proportions.
    const scale = Math.max(origin.width / target.width, origin.height / target.height);
    const cropX = Math.max(0, (1 - origin.width / (target.width * scale)) * 50);
    const cropY = Math.max(0, (1 - origin.height / (target.height * scale)) * 50);
    const thumbnail = {
      transform: `translate(${x}px, ${y}px) rotate(${origin.rotation}deg) scale(${scale})`,
      clipPath: `inset(${cropY}% ${cropX}%)`,
      opacity: origin.opacity,
    };
    const expanded = { transform: "translate(0px, 0px) rotate(0deg) scale(1)", clipPath: "inset(0% 0%)", opacity: 1 };
    const current = getComputedStyle(content);
    const start = closing && this.viewerAnimation ? {
      transform: current.transform,
      clipPath: current.clipPath,
      opacity: current.opacity,
    } : expanded;
    this.viewerAnimation?.cancel();
    return content.animate(closing ? [start, thumbnail] : [thumbnail, expanded], {
      duration: closing ? 240 : 480,
      easing: getComputedStyle(this).getPropertyValue("--ease").trim(),
      fill: "both",
    });
  }

  private async closeViewer() {
    const viewer = this.querySelector<HTMLDialogElement>(".journey-viewer");
    if (!viewer?.open || this.viewerClosing) return;
    playSound("click");
    this.viewerClosing = true;
    const slot = this.viewerSlot;
    if (slot) {
      // Prepare the hidden card at its final size before measuring the return.
      window.clearTimeout(slot.settleTimer);
      slot.settleTimer = 0;
      delete slot.card.dataset.settling;
      slot.pinned = false;
      slot.dismissed = true;
      slot.card.dataset.expanded = "false";
      this.render();
    }
    if (!motionQuery.matches && slot) {
      this.viewerAnimation = this.animateViewer(this.viewerOrigin(slot), true);
      const animation = this.viewerAnimation;
      await animation.finished.catch(() => {});
      if (this.viewerAnimation !== animation) return;
    }
    viewer.close();
  }

  private moveCursorIntoViewer(viewer: HTMLDialogElement) {
    viewer.append(...document.documentElement.querySelectorAll(".c-dot, .c-ring, .c-drag-label"));
  }

  private restoreCursorFromViewer(viewer: HTMLDialogElement) {
    document.documentElement.append(...viewer.querySelectorAll(".c-dot, .c-ring, .c-drag-label"));
  }

  private syncExpansion(slot: JourneySlot) {
    const expanded = !slot.dismissed && (slot.hovered || slot.focused || slot.pinned);
    const changed = (slot.card.dataset.expanded === "true") !== expanded;
    if (changed) {
      window.clearTimeout(slot.settleTimer);
      if (!motionQuery.matches) {
        slot.card.dataset.settling = "true";
        // Commit the current transform before changing its target.
        void slot.card.offsetWidth;
      }
    }
    slot.card.dataset.expanded = String(expanded);
    this.render();
    if (changed && !motionQuery.matches) {
      slot.settleTimer = window.setTimeout(() => {
        delete slot.card.dataset.settling;
        slot.settleTimer = 0;
      }, 330);
    }
  }

  private choose(previous?: HeroJourneyMedia | null): HeroJourneyMedia | null {
    const available = this.items.filter((item) => !this.failed.has(item.source));
    const unused = available.filter((item) => item.source !== previous?.source &&
      !this.slots.some((slot) => slot.media?.source === item.source));
    const unreserved = unused.filter((item) =>
      !this.slots.some((slot) => slot.next?.source === item.source));
    const choices = unreserved.length ? unreserved : unused.length ? unused
      : available.filter((item) => item.source !== previous?.source);
    const candidates = choices.length ? choices : available;
    return candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : null;
  }

  private planPath(slot: JourneySlot) {
    const routes = [-1, 1].flatMap((side) => [0, 0.5, 1].map((lane) => ({ side, lane })));
    const busy = this.slots.filter((other) => other !== slot && other.media &&
      (motionQuery.matches || other.progress >= 0 && other.progress < 0.55));
    const free = routes.filter((route) => !busy.some((other) =>
      other.side === route.side && Math.abs(other.lane - route.lane) < 0.3));
    const choices = free.length ? free : routes;
    const route = choices[Math.floor(Math.random() * choices.length)];
    slot.side = route.side;
    slot.lane = clamp(route.lane + (Math.random() - 0.5) * 0.16, 0, 1);
    slot.bend = 0.02 + Math.random() * 0.05;
    slot.drift = (Math.random() - 0.5) * 0.06;
    slot.tilt = 2 + Math.random() * 4;
  }

  private stopVideo(slot: JourneySlot) {
    if (!slot.video) return;
    slot.video.pause();
    slot.video.removeAttribute("src");
    slot.video.load();
    slot.video = null;
  }

  private fail(slot: JourneySlot, source: string, generation: number) {
    if (slot.generation !== generation) return;
    this.failed.add(source);
    this.stopVideo(slot);
    slot.media = null;
    slot.progress = 1;
    slot.pinned = false;
    slot.dismissed = true;
    slot.card.dataset.ready = "false";
    slot.face.tabIndex = -1;
    slot.face.replaceChildren();
    slot.face.blur();
    slot.card.style.opacity = "0";
    this.syncExpansion(slot);
  }

  private setMedia(slot: JourneySlot, item: HeroJourneyMedia | null): Promise<void> {
    slot.generation++;
    const generation = slot.generation;
    this.stopVideo(slot);
    slot.media = item;
    slot.card.dataset.ready = "false";
    slot.face.tabIndex = -1;
    slot.face.replaceChildren();
    if (!item) {
      slot.card.style.opacity = "0";
      return Promise.resolve();
    }
    slot.face.setAttribute("aria-label", (this.getAttribute("data-view-label") ?? "View") + " " + item.description);
    const loading = document.createElement("span");
    loading.className = "journey-loading";
    loading.setAttribute("aria-hidden", "true");
    let media: HTMLImageElement | HTMLVideoElement;
    if (item.type === "image") {
      const image = document.createElement("img");
      image.alt = item.description;
      image.loading = "eager";
      image.decoding = "async";
      image.src = item.thumbnail ?? item.source;
      media = image;
    } else {
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-label", item.description);
      video.src = item.source;
      slot.video = video;
      media = video;
    }
    media.className = "journey-media";
    if (item.cropPosition) media.style.objectPosition = item.cropPosition;
    slot.face.append(media, loading);
    return new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const ready = () => {
        if (slot.generation !== generation) return settle();
        slot.card.dataset.ready = "true";
        this.preparedSources.add(item.source);
        this.render();
        settle();
      };
      const error = () => {
        this.fail(slot, item.source, generation);
        settle();
      };
      if (media instanceof HTMLImageElement) {
        media.addEventListener("load", ready, { once: true });
        media.addEventListener("error", error, { once: true });
        if (media.complete) {
          if (media.naturalWidth) ready();
          else error();
        }
      } else {
        media.addEventListener("loadeddata", ready, { once: true });
        media.addEventListener("playing", ready, { once: true });
        media.addEventListener("error", error, { once: true });
        if (motionQuery.matches) {
          media.pause();
        } else if (this.visible && !document.hidden) {
          this.playVideo(slot, generation);
        }
      }
    });
  }

  private playVideo(slot: JourneySlot, generation = slot.generation) {
    const video = slot.video;
    if (!video || motionQuery.matches || !this.visible || document.hidden) return;
    void video.play().catch((error: unknown) => {
      if (slot.generation !== generation || !this.visible || document.hidden || motionQuery.matches) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (slot.media) this.fail(slot, slot.media.source, generation);
    });
  }

  private syncActivity() {
    if (!this.ready) return;
    const active = this.visible && !document.hidden && !this.viewerSlot;
    if (!active || motionQuery.matches) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastFrame = 0;
      this.slots.forEach((slot) => slot.video?.pause());
      this.render();
      return;
    }
    this.slots.forEach((slot) => this.playVideo(slot));
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
    this.pumpPreload();
  }

  private tick = (time: number) => {
    const delta = this.lastFrame ? Math.min(64, time - this.lastFrame) : 0;
    this.lastFrame = time;
    this.elapsed += delta;
    for (const slot of this.slots) {
      if (slot.card.dataset.expanded === "true" ||
          slot.card.dataset.settling === "true") continue;
      if (slot.progress < 0) {
        if (this.elapsed < this.nextSpawn || slot.card.dataset.ready !== "true") continue;
        this.planPath(slot);
        slot.progress = 0;
        this.nextSpawn = this.elapsed + 900 + Math.random() * 1300;
        continue;
      }
      slot.progress += delta / slot.duration;
      if (slot.progress >= 1) this.rotate(slot);
    }
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private rotate(slot: JourneySlot) {
    slot.progress = -1;
    slot.duration = randomDuration(this.duration);
    const next = slot.next && !this.failed.has(slot.next.source) &&
      slot.next.source !== slot.media?.source &&
      !this.slots.some((other) => other !== slot && other.media?.source === slot.next?.source)
      ? slot.next
      : this.choose(slot.media);
    slot.next = null;
    void this.setMedia(slot, next);
    this.scheduleNext(slot);
  }

  private render() {
    if (!this.geometry) {
      const rect = this.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const portrait = this.parentElement?.querySelector<HTMLElement>(".hero-portrait")?.getBoundingClientRect();
      const copy = this.parentElement?.querySelector<HTMLElement>(".hero-copy")?.getBoundingClientRect();
      const cardWidth = this.slots[0]?.card.offsetWidth || (rect.width < 640 ? 76 : rect.width < 1024 ? 110 : 130);
      const safeBottom = Math.min(rect.height * 0.5, copy ? copy.top - rect.top - 24 : rect.height * 0.5);
      this.geometry = { rect, portrait, cardWidth, safeBottom };
    }
    const { rect, portrait, cardWidth, safeBottom } = this.geometry;
    this.slots.forEach((slot) => this.renderSlot(slot, rect, portrait, cardWidth, safeBottom));
  }

  private renderSlot(
    slot: JourneySlot,
    rect: DOMRect,
    portrait: DOMRect | undefined,
    cardWidth: number,
    safeBottom: number,
  ) {
    const phone = rect.width < 640;
    const desktop = rect.width >= 1024;
    const side = slot.side;
    const portraitCenter = portrait
      ? portrait.left - rect.left + portrait.width / 2
      : rect.width / 2;
    const portraitWidth = portrait?.width ?? rect.width * 0.35;
    const safeFactor = phone ? 0.24 : 0.23 + slot.lane * 0.21;
    const startX = clamp(
      portraitCenter + side * (portraitWidth * safeFactor + cardWidth * 0.58),
      cardWidth * 0.55,
      rect.width - cardWidth * 0.55,
    );
    const endX = side < 0 ? -cardWidth * 0.2 : rect.width + cardWidth * 0.2;
    const top = Math.max(cardWidth * 0.375 + 18, rect.height * 0.1);
    const bottom = Math.max(top, safeBottom - cardWidth * 0.375);
    const startY = top + slot.lane * (bottom - top);
    const endY = clamp(startY + slot.drift * rect.height, top, bottom);
    const p = motionQuery.matches ? 0.45 : clamp(slot.progress, 0, 1);
    const controlX = startX + (endX - startX) * 0.54;
    const controlY = clamp((startY + endY) / 2 - rect.height * slot.bend, top, bottom);
    const inv = 1 - p;
    const x = inv * inv * startX + 2 * inv * p * controlX + p * p * endX;
    const y = inv * inv * startY + 2 * inv * p * controlY + p * p * endY;
    const parallaxX = desktop && !motionQuery.matches ? this.pointerX * 5 : 0;
    const parallaxY = desktop && !motionQuery.matches ? this.pointerY * 4 : 0;
    const expanded = slot.card.dataset.expanded === "true";
    const rotation = expanded || motionQuery.matches ? 0 : side * slot.tilt * (1 - p * 2);
    const scale = expanded ? (phone ? 2.1 : 1.85) : 1;
    const expandedWidth = cardWidth * scale;
    const expandedHeight = expandedWidth * 0.75;
    const displayX = expanded
      ? clamp(x + parallaxX, expandedWidth / 2 + 18, rect.width - expandedWidth / 2 - 18)
      : x + parallaxX;
    const displayY = expanded
      ? clamp(y + parallaxY, expandedHeight / 2 + 18, Math.max(expandedHeight / 2 + 18, safeBottom - expandedHeight / 2))
      : y + parallaxY;
    slot.card.style.transform =
      "translate(" + displayX + "px, " + displayY +
      "px) translate(-50%, -50%) rotate(" + rotation + "deg) scale(" + scale + ")";
    const fadeIn = clamp((p - 0.01) / 0.10, 0, 1);
    const fadeOut = clamp((1 - p) / 0.19, 0, 1);
    const opacity = slot.media && slot.card.dataset.ready === "true"
      ? motionQuery.matches || expanded ? 1 : Math.min(fadeIn, fadeOut) * 0.9
      : 0;
    slot.card.style.opacity = String(opacity);
    const tabIndex = opacity > 0.12 ? 0 : -1;
    if (slot.face.tabIndex !== tabIndex) slot.face.tabIndex = tabIndex;
  }

  private scheduleNext(slot: JourneySlot) {
    if (!this.preloadEnabled || motionQuery.matches || slot.next) return;
    const next = this.choose();
    if (!next) return;
    slot.next = next;
    if (!this.preparedSources.has(next.source) &&
        !this.preloadQueue.some((item) => item.source === next.source)) {
      this.preloadQueue.push(next);
    }
    this.pumpPreload();
  }

  private pumpPreload() {
    if (!this.preloadEnabled || !this.visible || document.hidden || motionQuery.matches || this.viewerSlot) return;
    while (this.preloading < this.preloadConcurrency && this.preloadQueue.length) {
      const item = this.preloadQueue.shift()!;
      if (this.failed.has(item.source)) continue;
      const version = this.mountVersion;
      this.preloading++;
      void this.preload(item).finally(() => {
        if (version !== this.mountVersion) return;
        this.preparedSources.add(item.source);
        this.preloading--;
        this.pumpPreload();
      });
    }
  }

  private preload(item: HeroJourneyMedia): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve();
      };
      const timeout = window.setTimeout(finish, 5000);
      if (item.type === "image") {
        const image = new Image();
        image.onload = finish;
        image.onerror = finish;
        image.src = item.thumbnail ?? item.source;
      } else {
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.onloadeddata = finish;
        video.onerror = finish;
        video.src = item.source;
        video.load();
      }
    });
  }
}

if (!customElements.get("hero-journey")) {
  customElements.define("hero-journey", HeroJourneyEl);
}

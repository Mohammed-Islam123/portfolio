import type { HeroJourneyMedia } from "../config/heroJourney";

interface JourneySlot {
  card: HTMLDivElement;
  face: HTMLButtonElement;
  close: HTMLButtonElement;
  index: number;
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
  private revealTimer = 0;
  private mountVersion = 0;
  private pointerX = 0;
  private pointerY = 0;

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
      if (this.ready) this.layout();
    });
    resizeObserver.observe(this);
    this.cleanupFns.push(() => resizeObserver.disconnect());

    const onVisibility = () => this.syncActivity();
    const onMotion = () => {
      this.layout();
      this.syncActivity();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || motionQuery.matches) return;
      const rect = this.getBoundingClientRect();
      this.pointerX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      this.pointerY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      if (!this.frame) this.render();
    };
    const onOutside = (event: PointerEvent) => {
      for (const slot of this.slots) {
        if (slot.pinned && !slot.card.contains(event.target as Node)) {
          slot.pinned = false;
          slot.dismissed = true;
          this.syncExpansion(slot);
        }
      }
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      let dismissed = false;
      for (const slot of this.slots) {
        if (slot.pinned || slot.focused) {
          slot.pinned = false;
          slot.dismissed = true;
          this.syncExpansion(slot);
          dismissed = true;
        }
      }
      if (dismissed) event.stopPropagation();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    motionQuery.addEventListener("change", onMotion);
    this.cleanupFns.push(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("pointermove", onPointerMove);
      motionQuery.removeEventListener("change", onMotion);
    });
  }

  disconnectedCallback() {
    this.mountVersion++;
    window.clearTimeout(this.revealTimer);
    this.revealTimer = 0;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastFrame = 0;
    for (const slot of this.slots) {
      window.clearTimeout(slot.settleTimer);
      slot.generation++;
      this.stopVideo(slot);
    }
    this.slots = [];
    this.replaceChildren();
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
    this.layout();
    const version = this.mountVersion;
    const initialLoads = this.slots.map((slot) =>
      this.setMedia(slot, this.choose()),
    );
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
    if (!this.ready) return;
    const count = this.count();
    while (this.slots.length > count) {
      const slot = this.slots.pop()!;
      window.clearTimeout(slot.settleTimer);
      slot.generation++;
      this.stopVideo(slot);
      slot.card.remove();
    }
    while (this.slots.length < count) {
      const slot = this.createSlot(this.slots.length);
      this.slots.push(slot);
      this.append(slot.card);
      if (this.items.length && this.preloadEnabled) {
        void this.setMedia(slot, this.choose());
        this.scheduleNext(slot);
      }
    }
    this.slots.forEach((slot, index) => { slot.index = index; });
    this.render();
  }

  private createSlot(index: number): JourneySlot {
    const card = document.createElement("div");
    card.className = "journey-card";
    card.dataset.expanded = "false";
    card.dataset.ready = "false";
    const face = document.createElement("button");
    face.type = "button";
    face.className = "journey-face";
    face.setAttribute("aria-expanded", "false");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "journey-close";
    close.setAttribute("aria-label", "Close media preview");
    close.textContent = "×";
    card.append(face, close);
    const slot: JourneySlot = {
      card, face, close, index,
      progress: -index * 0.025,
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
        slot.dismissed = false;
        this.syncExpansion(slot);
      }
    });
    card.addEventListener("pointerleave", () => {
      slot.hovered = false;
      this.syncExpansion(slot);
    });
    card.addEventListener("focusin", () => {
      slot.focused = true;
      slot.dismissed = false;
      this.syncExpansion(slot);
    });
    card.addEventListener("focusout", (event) => {
      if (!card.contains(event.relatedTarget as Node | null)) {
        slot.focused = false;
        this.syncExpansion(slot);
      }
    });
    face.addEventListener("click", () => {
      if (slot.pinned) {
        slot.pinned = false;
        slot.dismissed = true;
      } else {
        slot.pinned = true;
        slot.dismissed = false;
      }
      this.syncExpansion(slot);
    });
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      slot.pinned = false;
      slot.dismissed = true;
      close.blur();
      this.syncExpansion(slot);
    });
    return slot;
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
    slot.card.dataset.pinned = String(slot.pinned);
    slot.face.setAttribute("aria-expanded", String(expanded));
    this.render();
    if (changed && !motionQuery.matches) {
      slot.settleTimer = window.setTimeout(() => {
        delete slot.card.dataset.settling;
        slot.settleTimer = 0;
      }, 330);
    }
  }

  private choose(): HeroJourneyMedia | null {
    const available = this.items.filter((item) => !this.failed.has(item.source));
    return available.length
      ? available[Math.floor(Math.random() * available.length)]
      : null;
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
    slot.face.setAttribute("aria-label", "View " + item.description);
    const loading = document.createElement("span");
    loading.className = "journey-loading";
    loading.setAttribute("aria-hidden", "true");
    let media: HTMLImageElement | HTMLVideoElement;
    if (item.type === "image") {
      const image = document.createElement("img");
      image.alt = item.description;
      image.loading = "eager";
      image.decoding = "async";
      image.src = item.source;
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
    if (item.caption) {
      const caption = document.createElement("span");
      caption.className = "journey-caption";
      caption.textContent = item.caption;
      slot.face.append(caption);
    }
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
    const active = this.visible && !document.hidden;
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
    for (const slot of this.slots) {
      if (slot.card.dataset.expanded === "true" ||
          slot.card.dataset.settling === "true") continue;
      slot.progress += delta / slot.duration;
      if (slot.progress >= 1) this.rotate(slot);
    }
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private rotate(slot: JourneySlot) {
    slot.progress = 0;
    slot.duration = randomDuration(this.duration);
    const next = slot.next && !this.failed.has(slot.next.source)
      ? slot.next
      : this.choose();
    slot.next = null;
    void this.setMedia(slot, next);
    this.scheduleNext(slot);
  }

  private render() {
    const rect = this.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const portrait = this.parentElement
      ?.querySelector<HTMLElement>(".hero-portrait")
      ?.getBoundingClientRect();
    const cardWidth = this.slots[0]?.card.offsetWidth ||
      (rect.width < 640 ? 76 : rect.width < 1024 ? 110 : 130);
    this.slots.forEach((slot) => this.renderSlot(slot, rect, portrait, cardWidth));
  }

  private renderSlot(
    slot: JourneySlot,
    rect: DOMRect,
    portrait: DOMRect | undefined,
    cardWidth: number,
  ) {
    const phone = rect.width < 640;
    const desktop = rect.width >= 1024;
    const side = slot.index % 2 === 0 ? -1 : 1;
    const lane = phone
      ? [0.14, 0.20, 0.31][slot.index] ?? 0.2
      : desktop
        ? [0.12, 0.15, 0.44, 0.47, 0.28, 0.31][slot.index] ?? 0.25
        : [0.16, 0.19, 0.39, 0.42][slot.index] ?? 0.25;
    const portraitCenter = portrait
      ? portrait.left - rect.left + portrait.width / 2
      : rect.width / 2;
    const portraitWidth = portrait?.width ?? rect.width * 0.35;
    const middle = !phone && (slot.index === 2 || slot.index === 3);
    const safeFactor = middle ? 0.44 : phone ? 0.24 : 0.23;
    const startX = clamp(
      portraitCenter + side * (portraitWidth * safeFactor + cardWidth * 0.58),
      cardWidth * 0.55,
      rect.width - cardWidth * 0.55,
    );
    const endX = side < 0 ? -cardWidth * 0.2 : rect.width + cardWidth * 0.2;
    const startY = rect.height * lane;
    const endY = rect.height * (lane + (slot.index % 3 - 1) * 0.07);
    const p = motionQuery.matches ? 0.45 : clamp(slot.progress, 0, 1);
    const controlX = startX + (endX - startX) * 0.54;
    const controlY = (startY + endY) / 2 - rect.height * 0.045;
    const inv = 1 - p;
    const x = inv * inv * startX + 2 * inv * p * controlX + p * p * endX;
    const y = inv * inv * startY + 2 * inv * p * controlY + p * p * endY;
    const parallaxX = desktop && !motionQuery.matches ? this.pointerX * 5 : 0;
    const parallaxY = desktop && !motionQuery.matches ? this.pointerY * 4 : 0;
    const expanded = slot.card.dataset.expanded === "true";
    const rotation = expanded || motionQuery.matches ? 0 : side * (2.5 - p * 5);
    const scale = expanded ? (phone ? 2.1 : 1.85) : 1;
    const expandedWidth = cardWidth * scale;
    const expandedHeight = expandedWidth * 0.75;
    const displayX = expanded
      ? clamp(x + parallaxX, expandedWidth / 2 + 18, rect.width - expandedWidth / 2 - 18)
      : x + parallaxX;
    const displayY = expanded
      ? clamp(y + parallaxY, expandedHeight / 2 + 18, rect.height - expandedHeight / 2 - 18)
      : y + parallaxY;
    slot.card.style.transform =
      "translate(" + displayX + "px, " + displayY +
      "px) translate(-50%, -50%) rotate(" + rotation + "deg) scale(" + scale + ")";
    const fadeIn = clamp((p - 0.01) / 0.10, 0, 1);
    const fadeOut = clamp((1 - p) / 0.19, 0, 1);
    const opacity = slot.media
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
    if (!this.preloadEnabled || !this.visible || document.hidden || motionQuery.matches) return;
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
        image.src = item.source;
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

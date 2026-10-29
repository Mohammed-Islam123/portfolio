import Lenis from "lenis";

let lenis: Lenis | null = null;
let initialized = false;

export const getLenis = () => lenis;

if (typeof window !== "undefined" && !initialized) {
  initialized = true;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");

  const create = () => {
    if (motion.matches || !desktop.matches || lenis) return;
    lenis = new Lenis({
      autoRaf: true,
      virtualScroll: ({ deltaX, deltaY, event }) => !(
        event.target instanceof Element && event.target.closest("pre") &&
        (event.shiftKey || Math.abs(deltaX) > Math.abs(deltaY))
      ),
    });
    if (document.documentElement.dataset.loaderState === "loading") lenis.stop();
  };

  const destroy = () => {
    lenis?.destroy();
    lenis = null;
  };
  const onPreferenceChange = () => {
    if (motion.matches || !desktop.matches) destroy();
    else create();
  };
  const onLoaderState = (event: Event) => {
    const state = (event as CustomEvent<{ state?: string }>).detail?.state;
    if (state === "loading") lenis?.stop();
    if (state === "dismissed") lenis?.start();
  };
  const onAnchorClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;

    const url = new URL(link.href, window.location.href);
    if (
      !url.hash ||
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search
    ) return;

    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;

    event.preventDefault();
    history.replaceState(history.state, "", url.hash);
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.1 });
    } else {
      target.scrollIntoView({ behavior: motion.matches ? "auto" : "smooth", block: "start" });
    }
  };

  create();
  motion.addEventListener("change", onPreferenceChange);
  desktop.addEventListener("change", onPreferenceChange);
  window.addEventListener("loader:statechange", onLoaderState);
  window.addEventListener("click", onAnchorClick, { capture: true });
}

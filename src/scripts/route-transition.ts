import { getLenis } from "./smooth-scroll";

let initialized = false;

if (!initialized) {
  initialized = true;

  const isReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const routeLoader = () => document.querySelector<HTMLElement>("route-loader");
  const pageRoot = () =>
    document.querySelector<HTMLElement>("[data-page-transition-root]");
  let resetTimer: number | undefined;

  const reset = () => {
    window.clearTimeout(resetTimer);
    routeLoader()?.removeAttribute("data-state");
    document.documentElement.classList.remove("route-transitioning");
    delete document.documentElement.dataset.clientNavigation;
  };

  document.addEventListener("astro:before-preparation", (event) => {
    const navigation = event as Event & { from?: URL; to?: URL };
    const from = navigation.from;
    const to = navigation.to;
    if (!from || !to || from.origin !== to.origin) return;

    // Lenis handles fragment-only navigation without a route swap.
    if (from.pathname === to.pathname && from.search === to.search) return;

    const loader = routeLoader();
    loader?.setAttribute("data-state", "loading");
    getLenis()?.stop();
    document.documentElement.dataset.clientNavigation = "true";
    // Set this before the swap so the incoming home hero cannot reveal
    // itself before its loader component has connected.
    if (to.pathname === "/") {
      document.documentElement.dataset.loaderState = "loading";
    }
    if (isReducedMotion()) return;

    pageRoot()?.classList.add("is-route-leaving");
    document.documentElement.classList.add("route-transitioning");
  });

  document.addEventListener("astro:after-swap", () => {
    routeLoader()?.setAttribute("data-state", "complete");
    pageRoot()?.classList.remove("is-route-leaving");
  });

  document.addEventListener("astro:page-load", () => {
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      reset();
      getLenis()?.start();
    }, isReducedMotion() ? 150 : 760);
  });
}

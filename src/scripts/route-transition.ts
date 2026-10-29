import { getLenis } from "./smooth-scroll";
import { localeFromPath, unlocalizedPath } from "../lib/i18n";
import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from "astro:transitions/client";

const isReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const routeLoader = () => document.querySelector<HTMLElement>("route-loader");
const pageRoot = () => document.querySelector<HTMLElement>("[data-page-transition-root]");
let resetTimer: number | undefined;
let languageNavigation = false;
let activeSignal: AbortSignal | undefined;

const reset = () => {
  window.clearTimeout(resetTimer);
  routeLoader()?.removeAttribute("data-state");
  pageRoot()?.classList.remove("is-route-leaving");
  document.documentElement.classList.remove("route-transitioning", "language-transitioning");
  delete document.documentElement.dataset.clientNavigation;
  languageNavigation = false;
};

document.addEventListener("astro:before-preparation", (event) => {
  const navigation = event as TransitionBeforePreparationEvent;
  const { from, to, signal } = navigation;
  if (from.origin !== to.origin || (from.pathname === to.pathname && from.search === to.search)) return;
  const previousLoaderState = document.documentElement.dataset.loaderState;
  reset();
  activeSignal = signal;
  signal.addEventListener("abort", () => {
    if (activeSignal === signal) {
      reset();
      if (previousLoaderState === undefined) delete document.documentElement.dataset.loaderState;
      else document.documentElement.dataset.loaderState = previousLoaderState;
      getLenis()?.start();
    }
  }, { once: true });
  languageNavigation = localeFromPath(from.pathname) !== localeFromPath(to.pathname) &&
    unlocalizedPath(from.pathname) === unlocalizedPath(to.pathname);
  routeLoader()?.setAttribute("data-state", "loading");
  getLenis()?.stop();
  document.documentElement.dataset.clientNavigation = "true";
  if (!languageNavigation && unlocalizedPath(to.pathname) === "/") {
    document.documentElement.dataset.loaderState = "loading";
  }
  if (isReducedMotion()) return;
  if (!languageNavigation) pageRoot()?.classList.add("is-route-leaving");
  document.documentElement.classList.add("route-transitioning");
  document.documentElement.classList.toggle("language-transitioning", languageNavigation);
});

document.addEventListener("astro:before-swap", (event) => {
  const { newDocument, to } = event as TransitionBeforeSwapEvent;
  // Astro replaces root attributes, so incoming components need these flags before connecting.
  const root = newDocument.documentElement;
  root.dataset.clientNavigation = "true";
  root.dataset.loaderState = newDocument.querySelector("boot-loader") ? "loading" : "dismissed";
  if (!isReducedMotion()) root.classList.add("route-transitioning");
  if (languageNavigation) {
    if (!isReducedMotion()) root.classList.add("language-transitioning");
    newDocument.querySelector("boot-loader")?.remove();
    root.dataset.loaderState = "dismissed";
    if (to.hash && !newDocument.getElementById(decodeURIComponent(to.hash.slice(1)))) to.hash = "";
  }
});

document.addEventListener("astro:after-swap", () => {
  activeSignal = undefined;
  routeLoader()?.setAttribute("data-state", "complete");
  pageRoot()?.classList.remove("is-route-leaving");
  if (languageNavigation) window.dispatchEvent(new CustomEvent("loader:dismiss"));
});

document.addEventListener("astro:page-load", () => {
  window.clearTimeout(resetTimer);
  const lenis = getLenis();
  lenis?.resize();
  if (document.documentElement.dataset.loaderState !== "loading") lenis?.start();
  if (languageNavigation) {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }
  resetTimer = window.setTimeout(() => {
    reset();
  }, isReducedMotion() ? 0 : languageNavigation ? 220 : 760);
});

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
  document.documentElement.classList.remove("route-transitioning", "language-transitioning");
  delete document.documentElement.dataset.clientNavigation;
  languageNavigation = false;
};

document.addEventListener("astro:before-preparation", (event) => {
  const navigation = event as TransitionBeforePreparationEvent;
  const { from, to, signal } = navigation;
  if (from.origin !== to.origin || (from.pathname === to.pathname && from.search === to.search)) return;
  reset();
  activeSignal = signal;
  signal.addEventListener("abort", () => {
    if (activeSignal === signal) { reset(); getLenis()?.start(); }
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
  if (!isReducedMotion()) root.classList.add("route-transitioning");
  if (languageNavigation) {
    if (!isReducedMotion()) root.classList.add("language-transitioning");
    newDocument.querySelector("boot-loader")?.remove();
    root.dataset.loaderState = "dismissed";
    if (to.hash && !newDocument.getElementById(decodeURIComponent(to.hash.slice(1)))) to.hash = "";
  }
});

document.addEventListener("astro:after-swap", () => {
  routeLoader()?.setAttribute("data-state", "complete");
  pageRoot()?.classList.remove("is-route-leaving");
  if (languageNavigation) window.dispatchEvent(new CustomEvent("loader:dismiss"));
});

document.addEventListener("astro:page-load", () => {
  window.clearTimeout(resetTimer);
  if (languageNavigation) {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    getLenis()?.start();
    if (target) target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }
  resetTimer = window.setTimeout(() => {
    reset();
    getLenis()?.start();
  }, isReducedMotion() ? 0 : languageNavigation ? 220 : 760);
});

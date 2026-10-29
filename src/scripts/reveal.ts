/**
 * Content starts visible. Only offscreen elements opt into an initialized
 * observer, and each Astro page gets observers bound to its current body.
 */
if (typeof window !== "undefined") {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let intersection: IntersectionObserver | undefined;
  let mutation: MutationObserver | undefined;

  const reset = () => {
    intersection?.disconnect();
    mutation?.disconnect();
    intersection = undefined;
    document.querySelectorAll(".reveal-init").forEach((el) => el.classList.remove("reveal-init"));
  };

  const observe = (el: Element) => {
    if (!intersection || el.classList.contains("is-visible") || el.classList.contains("reveal-init")) return;
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("is-visible");
      return;
    }
    intersection.observe(el);
    el.classList.add("reveal-init");
  };

  const scan = (root: ParentNode = document) => root.querySelectorAll(".reveal").forEach(observe);

  const bind = () => {
    reset();
    if (motion.matches || typeof IntersectionObserver === "undefined") return;
    intersection = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        entry.target.classList.remove("reveal-init");
        intersection?.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    scan();
    mutation = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.classList.contains("reveal")) observe(node);
          scan(node);
        }
      }
    });
    mutation.observe(document.body, { childList: true, subtree: true });
  };

  document.addEventListener("astro:before-swap", reset);
  document.addEventListener("astro:page-load", bind);
  motion.addEventListener("change", bind);
  bind();
}

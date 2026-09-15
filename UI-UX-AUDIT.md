# UI/UX Audit — portfolio-astro

Compiled anti-slop + UX review. Read-only: no code was changed.
Scope: `src/styles`, `src/layouts`, `src/components`, `src/pages`, `src/config`, `src/lib`, `src/scripts`, `src/content`, `astro.config.mjs`.

---

## Verdict

The **system** is unusually good: coherent monochrome + amber token set, real focus rings, `prefers-reduced-motion` handled everywhere, honest bio copy, and genuine structural variety (coverflow carousel, periodic-table toolkit, blur-focus values list — no centered-hero → 3-cards → CTA → footer template).

The two problems are opposites:
1. **Over-decorated** — ~12 attention devices compete for "look how smooth this is" and bury the content.
2. **Under-finished** — placeholder portraits, fake metrics, broken links, stale copy ship to production.

The highest-leverage fix is trimming the chrome and finishing the content, not one more tweak.

---

## 1. Typography

**Current state is the generic tell.** Geist is Vercel's default — it reads "shadcn/next starter" the way Inter did two years ago. And the *single-typeface* discipline (`global.css:135-149`) is itself a quiet "clean and modern" tell.

### Display typefaces (Google Fonts, not overused)

| Face | Why |
| --- | --- |
| **Bricolage Grotesque** | Variable, engineered-y grotesk. Survives the `.sec-title` 6.5rem ceiling. Best fit. |
| **Unbounded** | Wide, terminal/technical. Memorable at display size; hero/wordmark-only. |
| **Schibsted Grotesk** | Restrained-neutral alternative to expressive. |

Avoid (overused now): Instrument Sans/Serif, Space Grotesk, Sora, DM Sans, Manrope, Plus Jakarta Sans, Fraunces, Outfit.

### Monospace body (not JetBrains, not IBM)

| Face | Why |
| --- | --- |
| **Fragment Mono** | Calm, slightly humanist, good at 15–17px body. Top pick. |
| **Spline Sans Mono** | More technical/angular for a harder terminal lean. |
| **Martian Mono** | Most distinctive but wide — labels only, not body. |

Avoid: Space Mono, Roboto Mono, Fira Code.

### Recommended pairings

- **Primary:** Bricolage Grotesque (display) + Fragment Mono (body + labels).
- **Alt:** Unbounded (wordmark) + Spline Sans Mono (body), Geist kept for dense UI text.
- One variable file: **Recursive** has a `MONO` axis (both roles from one family), at the cost of distinctiveness.

Keep display roman — no italics in headings.

---

## 2. Icons

Three systems are mixed, which reads as unfinished:

1. **Lucide inlined SVGs** (stroke, 24px) — correct.
2. **simple-icons** (filled, brand) — correct for tech logos only.
3. **Raw unicode glyphs** (`⌘ ↗ ⟐ ∵ ◎ ⌥ ⧉ › → ←`) — the offender.

`⟐` (U+27D0) and `⧉` (U+29C9) are missing from many system fonts → tofu boxes on Linux/Windows, and baseline-align inconsistently with the Lucide set. Worst case is `Values.astro:18-25`.

**Fix:** keep simple-icons for brands; consolidate all UI icons to one Lucide stroke set (24×24, stroke-width 1.75); replace every unicode glyph — especially the Values glyphs — with Lucide equivalents or a hand-drawn 6-glyph SVG set.

---

## 3. Findings by severity

### CRITICAL — 2

**C1 · Re-drawn code-window chrome**
- *Where:* `global.css:942-953`
- *What:* fake macOS traffic-light dots hand-built with `box-shadow` on `pre.astro-code::before`.
- *Fix:* delete the `::before` dots; keep the real `data-language` label (`::after`) and hairline border.

**C2 · Fake terminal loader with invented progress**
- *Where:* `Loader.astro` (whole component)
- *What:* terminal `whoami` + progress bar filling to a fabricated 92% over 4.5s blocks content ~2.2s on every load and replays on every SPA re-entry. An invented number, pure theater, and it sits between the visitor and the content.
- *Fix:* cut to a short (≤400ms) fade or remove entirely; the name-scramble entrance is enough.

### MAJOR — 9

**M1 · Italic emphasis inside a heading** — `Contact.astro:49`
`say hi` is italicised inside an upright serif heading. Carry emphasis with weight/color, not italic.

**M2 · Random stranger shipped as your portrait** — `Hero.astro:117`, `About.astro:52`
`https://i.pravatar.cc/600?img=68` renders a random person's face as the identity, plus an external runtime dependency. Use a real photo or a monogram.

**M3 · Broken CTAs and placeholder links** — `config/site.ts:26-34`, `config/projects.ts`, `public/`
`/cv-mohamed-islam.pdf` 404s; socials point at `github.com`/`linkedin.com` root; `wa.me/213000000000`; every project link is `href="#"`. Drop the CV button until the file exists, point socials at real profiles, or omit dead links.

**M4 · Invented metrics in project copy** — `config/projects.ts:39-44`
"Reduced alert noise by 94%", "Sub-500ms", "200+ alerts/day with 95% noise" presented as real. Make them real or remove them.

**M5 · Sound ON by default** — `scripts/sound-init.ts:38`
`want = can && stored !== "off"` — hover/click blips play by default, contradicting the "Engineered Calm" identity. Default OFF (`stored === "on"`), or drop the feature.

**M6 · Stale and placeholder copy ships to users** — `config/toolkit.ts:65`, `Hero.astro:110,118`
React note says *"This very site is Next.js + React"* (it's Astro); portrait ships `alt="portrait placeholder — replace with your photo"` and `aria-label="portrait — placeholder"` to production and screen readers.

**M7 · Type is tiny everywhere** — `Toolkit.astro:121,130`, `global.css:346`
Cell IDs at 0.5rem (8px), tool names 0.55rem (8.8px), labels 10–11px. Below the readability floor. Floor labels at 12px; hierarchy should come from color/weight, not shrinkage.

**M8 · In-page nav never updates the URL hash** — `scripts/smooth-scroll.ts:71-89`
The Lenis anchor handler `preventDefault()`s every `#` link without `history.replaceState`. Can't share a section; back button doesn't return; scrollspy decoupled from the address bar. Add `history.replaceState(null, "", href)` after `scrollTo`.

**M9 · Carousel hides cards but leaves links tabbable** — `Projects.astro:242,317-344`
Non-active cards are `aria-hidden="true"` but their `<a>` links have no `tabindex="-1"`/`inert`. Keyboard users tab into focusable links invisible to assistive tech. Add `inert` to non-active cards.

### MINOR — 10

- **`body { overflow-x: hidden }`** — `global.css:307`. Use `overflow-x: clip`, never `hidden`.
- **`--font-serif` repointed to Geist** — `global.css:149`. Misnamed token; rename `--font-display`.
- **Custom cursor + stray green** — `global.css:82`. Soft-green hover ring is a third color in a monochrome+amber system; full cursor replacement is over-design.
- **`//` label prefix over-applied** — `SectionLabel`, `Toc`, `Note`, `Figure`, toolkit groups, `contents`, `principle`, `writing` (~12 instances). A nervous tic, not intent.
- **JS-fail state** — `ScrambleName.astro:17-27`. Name renders empty without JS; loader never dismisses. Contradicts the `Reveal` "visible-by-default" fail-safe. Add a server-rendered/`<noscript>` fallback.
- **Always-on rAF loops** — `custom-cursor.ts:154`. Cursor lerp runs unconditionally forever, plus two canvases + loader `%` mirror. Gate on mouse movement or `document.hidden`.
- **Light-mode contrast** — `global.css:194`. `--ink-deep: #8C8C82` on `#F4F2EE` is ~2.9:1 for dates/hints.
- **Interaction density** — ~12 attention devices (loader, name scramble, greeting scramble, waving hand, custom cursor, Lenis, scroll-reveal, scrollspy, hover sounds, spotlight-dim, coverflow drag, dots, clock). Keep loader *or* name scramble, cursor *or* Lenis — not both.
- **`prefers-reduced-motion` also mutes sound** — `lib/sound.ts:134`. Two orthogonal preferences conflated.
- **Desktop nav clips links / dead code** — `NavBar.astro:61` (`overflow-x-auto` with hidden scrollbar makes items unreachable); `section` sound unused (`lib/sound.ts:17,93`); `formatTime` copy-pasted 3×; `years` field never rendered (`config/toolkit.ts:22-23`).

---

## 4. Summary

**2 critical · 9 major · 10 minor**

Top-priority fixes (highest impact, lowest effort):

1. C1 + M1 — one-line edits removing the two loudest AI tells.
2. M2 + M3 + M6 — a real portrait, working links, and corrected copy beat every animation.
3. C2 + M5 — kill the fake progress loader and default sound off.
4. M7 — bump the micro-labels to a readable size.
5. Typography swap (Bricolage Grotesque + Fragment Mono) + icon consolidation.

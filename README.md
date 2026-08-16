# Mohamed Islam — Backend Engineer Portfolio

Personal portfolio: single-page landing (`/`) + five project case pages
(`/projects/[slug]`) + custom 404. Ported from the Next.js version
(`../portv11`) to Astro 7 with zero framework JS — all interactivity is
vanilla Web Components + a few global scripts.

## Stack

- **Astro 7** (static output) + **Tailwind CSS v4** (CSS-first config in
  `src/styles/global.css`)
- **Lenis** smooth scroll · **simple-icons** brand SVGs (rendered at
  build time) · Geist Sans/Mono via fontsource
- No UI framework — ~84 KB of JS shipped total

## Structure

```text
src/
├── config/        site identity, nav, projects, toolkit, values (all copy lives here)
├── lib/           scrambler engine, syntax highlighter, WebAudio sound engine
├── scripts/       global singletons: lenis, custom cursor, scroll reveal, sound
├── components/    one .astro per component; interactive ones are Web Components
│   └── primitives/, icons/
├── layouts/Layout.astro
└── pages/         index, projects/[slug], 404
```

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Dev server at `localhost:4321`               |
| `npm run build`   | Production build to `./dist/`                |
| `npm run preview` | Preview the production build                 |
| `npm run check`   | TypeScript diagnostics (`astro check`)       |

## Notes

- All content is config-driven — edit `src/config/*`, never the
  components.
- Design system ("Engineered Calm", warm monochrome + amber signal)
  lives entirely in `src/styles/global.css` tokens.
- Placeholders to replace before launch: portrait (pravatar), social
  URLs, and `public/cv-mohamed-islam.pdf` for the CV button.
- Future blog: add a `src/content/blog/` collection; the prose styles
  (`.prose-measure`, `.drop-cap`, `.grid-bg`) are already in place.

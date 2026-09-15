# Mohamed Islam — Backend Engineer Portfolio

Personal portfolio: single-page landing (`/`) + project case pages
(`/projects/[slug]`) + blog (`/blog`, `/blog/[slug]`) + custom 404. Ported
from the Next.js version (`../portv11`) to Astro 7 with zero framework JS —
all interactivity is vanilla Web Components + a few global scripts.

## Stack

- **Astro 7** (static output) + **Tailwind CSS v4** (CSS-first config in
  `src/styles/global.css`)
- **Bricolage Grotesque** (display) + **Spline Sans Mono** (body/UI/code)
  via fontsource · **simple-icons** brand SVGs (rendered at build time)
- No UI framework — ~72 KB of JS shipped total
- Native smooth scroll (no Lenis); `astro:transitions` ClientRouter for SPA nav

## Structure

```text
src/
├── config/        site identity, nav, projects, toolkit, values (all copy lives here)
├── content/       blog content collection (`src/content/blog/`, schema in `src/content.config.ts`)
├── lib/           icons, scrambler engine, syntax highlighter, blog helpers, WebAudio sound
├── scripts/       global singletons: smooth scroll, custom cursor, scroll reveal, sound
├── components/    one .astro per component; interactive ones are Web Components
│   └── primitives/, icons/, mdx/
├── layouts/Layout.astro
└── pages/         index, projects/[slug], blog (index + [slug]), rss.xml, 404
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

- All content is config-driven — edit `src/config/*`, never the components.
- Design system ("Engineered Calm", warm monochrome + amber signal) lives
  entirely in `src/styles/global.css` tokens. No sans-serif — `--font-sans`
  aliases the mono.
- Placeholders to replace before launch: portrait (pravatar), social URLs,
  project links/metrics, and `public/cv-mohamed-islam.pdf` for the CV button.
- Blog posts live in `src/content/blog/`; draft posts (`draft: true`) are
  excluded from production builds.
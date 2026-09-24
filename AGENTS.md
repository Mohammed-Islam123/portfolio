# Project Context — portfolio-astro

Personal portfolio built with Astro 7 as a static site. It includes a one-page home, project case-study pages, and an MDX-powered blog.

## Stack

- Astro 7 with TypeScript and Tailwind CSS v4
- Static-site generation; no UI framework
- Markdown/MDX content and an RSS feed
- Node.js 22.12 or newer

## Key locations

- `src/pages/` — routes: home, blog, project pages, RSS, and 404
- `src/components/` — Astro components and inline Web Components
- `src/config/` — site copy and structured portfolio data
- `src/content/blog/` — blog posts
- `src/styles/global.css` — global styles, design tokens, fonts, and themes
- `src/scripts/` — global client-side behavior

## Development

- `npm run dev` — start the local development server
- `npm run check` — run Astro type checks
- `npm run build` — create the production build in `dist/`

Run `npm run check` and `npm run build` before considering a change complete.

## Conventions

- Keep site content in `src/config/` when possible; do not hardcode portfolio copy in components.
- Client-side behavior uses vanilla Web Components and scripts—do not introduce React, Vue, or Svelte.
- Use the CSS variables defined in `src/styles/global.css`; avoid hardcoded color values.
- Reuse the icon components in `src/components/icons/` rather than adding raw symbols or custom SVGs.
- Respect `prefers-reduced-motion` for animations and interactions.

## Navigation note

The app uses Astro's client-side router. Component `connectedCallback` methods may run again after navigation, so event listeners must be safely cleaned up in `disconnectedCallback`.

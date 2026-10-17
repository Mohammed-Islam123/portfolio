# Project Context — portfolio-astro

Personal portfolio built with Astro 7 as a static site. It includes a one-page home, project case-study pages, an MDX-powered blog, and multi-language support.

## Stack

- Astro 7 with TypeScript and Tailwind CSS v4 (@tailwindcss/vite)
- Static-site generation; vanilla Web Components (no UI frameworks like React/Vue/Svelte)
- Markdown/MDX content and an RSS feed
- Node.js >= 22.12.0
- Playwright available for on-demand browser testing

## Key Locations

- `src/pages/` — Routes: home, blog, localized routes, RSS, and 404
- `src/components/` — Astro components and inline Web Components
- `src/config/` — Site copy, structured portfolio data, and i18n dictionaries
- `src/content/blog/` — MDX/Markdown blog posts
- `src/styles/global.css` — Global design tokens, themes, typography, and layers
- `src/scripts/` & `src/lib/` — Global client behaviors and helpers

## Workflow & Git Discipline

### 1. Branch & Worktree Selection
- Default working checkout is the repository root on `master`.
- Worktrees are **optional** and created **only when explicitly requested**.
- When a worktree is requested, prefer Worktrunk (`wt`):
  ```bash
  wt add feature/<name>
  ```
- Keep all edits scoped to the active feature branch/worktree.

### 2. Never Push Directly to `master`
- Every non-trivial change lands through a feature branch (`feature/<name>`) and a GitHub pull request.
- Specifications, task checklists, and scratch notes belong in `.scratch/` (kept out of production commits).

### 3. Preflight & Simulated PR Merge
Before pushing a branch or opening a PR:
1. **Sync `master`** without switching branches:
   ```bash
   git fetch origin master
   git pull --ff-only origin master
   ```
2. **Simulate PR Merge** against updated `master`:
   ```bash
   git merge-tree --write-tree --name-only master <feature-branch>
   ```
   - Exit code `0`: Clean simulation.
   - Exit code `1`: Conflicts detected. **Stop immediately and report the conflicting files before pushing.**
3. **Publish branch**:
   ```bash
   git push --set-upstream origin feature/<name>
   ```

### 4. Fail-Fast Execution Policy
- Stop immediately on any command, build, or tool failure (`isError` or non-zero exit code).
- Report the failed operation and exact error; do not loop, retry endlessly, or make blind assumptions.

## UI, Styling & Quality Standards

- **Mobile-First**: Author CSS for mobile (<640px) first; layer responsive overrides with `sm:`, `md:`, `lg:` upward. Never write desktop-first overrides.
- **RTL & Logical Utilities**: Always use CSS logical properties (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`) rather than physical properties (`ml-`, `mr-`, `text-left`).
- **Touch Target Minimums**: Ensure interactive elements and icon buttons have hit areas of at least 44×44px.
- **Astro Router & Lifecycle**: The app uses Astro's client router (View Transitions). Ensure all event listeners and observers added in `connectedCallback` are safely detached in `disconnectedCallback`.
- **Reduced Motion**: Respect `prefers-reduced-motion` across all CSS transitions and client-side interactions.
- **Content Separation**: Keep text copy in `src/config/`; do not hardcode portfolio or blog copy in components.

## Verification & Definition of Done

A task is NOT complete until:
1. `npm run check` passes with 0 TypeScript/Astro errors.
2. `npm run build` succeeds cleanly.
3. **Manual Test Scenarios Reported**: The agent must provide a clear list of manual test scenarios with exact steps and expected outcomes for the user to verify.
4. **Playwright Testing (On-Demand Only)**: Do not launch browser or Playwright runs automatically. Run Playwright only when explicitly requested by the user.

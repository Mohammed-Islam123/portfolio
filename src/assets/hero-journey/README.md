# Hero journey media

Add JPG, PNG, WebP, AVIF, MP4, or WebM files to this folder. Astro discovers
them at build time, so rebuild and redeploy after adding files. Use descriptive
filenames; they become fallback descriptions for accessibility.

Edit the single metadata list in `src/config/heroJourney.ts` for a more
specific description, an optional caption, or a crop such as
`cropPosition: "50% 30%"`. The same file holds the 12-second journey duration.
Photos are optimized by Astro. Add web-ready, muted-friendly MP4 or WebM clips;
the player mutes them automatically. The current files are temporary generated
examples and can be removed when real project media is ready.

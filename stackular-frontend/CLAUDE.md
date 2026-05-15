# Stackular Frontend — Frontend Rules

Constraints for Claude Code when working inside `stackular-frontend/`. Read root `CLAUDE.md` for full project context.

## Hard constraints

- **All styles are inline** in `ChatWidget.jsx` — do not introduce Tailwind, CSS modules, styled-components, or any CSS-in-JS library
- **No external UI libraries** — no shadcn, Radix, MUI, Chakra, Headless UI, etc.
- **Dark theme palette** — background `#060b14`, primary blue `#1d6ef5`; match existing color values exactly
- **Session ID is intentionally ephemeral** (`Math.random + Date.now`) — no localStorage persistence; don't add it
- **XSS-safe links only** — `renderMarkdown()` validates URLs; only `http://`, `https://`, or `/` paths are allowed. Do not weaken this check.
- **Next.js 14 App Router** — all pages live in `app/`; do not create a `pages/` directory

## Component rules

- `ChatWidget.jsx` is a single-file component — keep all related logic inline, don't split into sub-files unless explicitly asked
- `renderMarkdown()` and `renderInline()` handle all markdown; do not add a markdown library
- `HIGH_INTENT` regex triggers the lead capture card — test any regex changes against all listed keywords

## Testing

- Run `npm run dev` and open `http://localhost:3000` to verify UI changes visually
- Type checking (`npm run build`) verifies types, not visual correctness — always test in browser
- Test mobile layout at `min(360px, calc(100vw - 32px))` width

# Solar System Simulator

An exploration-first, entertainment-driven solar system simulator for the web — stylized realism, real orbital data, built with Vite + TypeScript + Three.js.

> **Status:** walking skeleton (ticket #4) — the Sun and eight planets orbit at their real positions for today's date, with orbit lines, labels, and a starfield. Ready for the slice-one review; time controls UI (ticket #6) is next.

## Quickstart

```bash
npm install
npm run dev        # start the dev server at http://localhost:5173
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright; installs Chromium on first run) |
| `npm run typecheck` | `tsc --noEmit` |

## Project docs

- `CONTEXT.md` — domain glossary
- `docs/adr/` — design decisions (Keplerian orbits, compressed scale, high-end target, testing seams, slice delivery)
- `docs/agents/` — issue-tracker and triage conventions
- The spec and tickets live in the GitHub issue tracker

# Solar System Simulator

An exploration-first, entertainment-driven solar system simulator for the web — stylized realism, real orbital data, built with Vite + TypeScript + Three.js.

> **Status:** walking skeleton + camera (tickets #4–#5) — the Sun and eight planets orbit at their real positions for today's date, with orbit lines, labels, and a starfield; the camera supports free flight (drag to look around, right-drag to pan, scroll to zoom) and focus (click a body to orbit and follow it, click empty space to release), opening Sun-centered with a one-line hint. Time controls UI (ticket #6) is next.

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

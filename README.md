# Solar System Simulator

An exploration-first, entertainment-driven solar system simulator for the web — stylized realism, real orbital data, built with Vite + TypeScript + Three.js.

> **Status:** walking skeleton, camera, time controls, full roster, fact cards, and the true-scale toggle (tickets #4–#10) — the Sun, eight planets, thirteen moons, five dwarf planets, and the asteroid belt orbit at their real positions for today's date, with orbit lines, labels, and a starfield; the camera supports free flight (drag to look around, right-drag to pan, scroll to zoom) and focus (click a body to orbit and follow it, click empty space to release), opening Sun-centered with a one-line hint; the bottom-center time controls (pause, warp slider, presets) plus keyboard shortcuts and a corner sim-date readout drive the clock; clicking any body opens its fact card with the six fact fields, a vs-Earth size bar, and one fun fact; a toggle beside the controls switches between compressed scale (default) and true-scale mode — real distances with readable bodies, the camera reframing automatically. Visual polish (ticket #11) is next.

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

# Keplerian orbits, not n-body gravity

Bodies move on fixed elliptical (Keplerian) orbits with real orbital periods; there is no gravitational interaction between bodies. We chose this over n-body integration because the sim is entertainment-first: orbits stay stable and calm to explore, focus/follow works predictably, and at compressed scales real gravity would produce chaos that fights the experience. The cost is lost gravitational phenomena (slingshots, resonances, ejection) — acceptable since scientific accuracy is secondary to the visual experience.

**Considered Options**: n-body gravitational integration — rejected: unstable over time without heavy tuning, unpredictable motion undermines calm exploration, and the compressed-scale default would distort its results anyway.

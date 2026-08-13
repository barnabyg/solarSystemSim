# Testing seams: four seams, nothing else

Tests are written only at four pre-agreed seams: (1) orbit & time math — unit tests, test-first (TDD, red→green) with expected values from JPL-derived known positions; (2) body & fact data — dataset integrity tests against real published values; (3) UI interaction — Playwright end-to-end tests of the user-facing promises (inspection, time controls, scale toggle, search, overlays); (4) rendering smoke — scene boot, body presence, camera response, and a deliberately small set of golden screenshot diffs. Procedural audio internals, pixel-perfect rendering, and n-body accuracy are explicitly out of scope.

The seams were confirmed with the user before any test is written, per the TDD skill's seam rule. This boundary is the deliberate allocation of test effort: the deterministic math and the educational data carry the correctness burden; the renderer is trusted within smoke-level checks.

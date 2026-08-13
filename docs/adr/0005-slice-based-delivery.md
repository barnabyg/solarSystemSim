# Slice-based delivery with a per-slice user review gate

The sim is built in seven vertical slices, each ending in a reviewable build the user runs locally and reviews against a short sheet (what felt good / what felt wrong / what's missing): (1) walking skeleton, (2) time controls, (3) full content, (4) inspection/fact cards, (5) true-scale toggle, (6) visual polish, (7) soundscape. No slice is built on top of a slice the user has not reviewed; feedback folds into the next slice. Each slice is tracked as issues in the repo's GitHub tracker.

Chosen so the user can start reviewing as early as possible — the subjective "feel" decisions (motion, camera, scale) come first, when they are cheapest to change — at the cost of some overhead versus building feature-complete before any review.

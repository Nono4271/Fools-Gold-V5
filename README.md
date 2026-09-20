# What changed in this zip (vs. the previous zip)

Bug fix on top of the live-map camp wiring: camps could have landed on
water, mountains, roads, or gotten overwritten by a keep/HQ, because they
were placed too early in map generation — before those things existed yet.

## Files in this zip

- **`src/workers/mapGen.worker.js`** — moved camp placement to run LAST
  (after keeps, HQs, roads, and the P10-P13 special tiles are all final),
  and added a check that now rejects water, mountains, roads, keeps, HQs,
  and border/gate tiles when picking a camp's spot.
- **`shared/utils/campPlacement.js`** — the placement-search helper can now
  take that extra "is this spot blocked" check, on top of what it already
  checked.
- **`tests/campPlacement.test.js`** — 1 new test for the above.
- **`ReadMeAI.md`** — new dated entry explaining the fix, plus a note that
  camp structure art now joins the neutral units and Ancients (T4) on the
  list of art still needed once your ChatGPT usage resets.

## Bottom line

Camps can no longer overlap water, roads, keeps, or HQs — verified in
tests, not yet eyeballed on a phone (still recommend that once art exists).
240/240 tests pass, build is clean.

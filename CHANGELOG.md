# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 9/22/26

### Added
- `--capture-misses <filepath>`: opt-in capture of wrong answers as grader fixtures, written only to the path you name
- Test asserting every captured miss in `real-misses.jsonl` still scores as a miss, so the saved fixtures now guard the scorer's normalization
- `--version` flag, read from `package.json` so it always matches the published release

### Fixed
- Audits no longer write a `tests/scorers/fixtures/` directory into the current working directory. Capture is off unless `--capture-misses` is passed
- Verdict no longer says "Switch to <model> - save ~$0.00/mo" when the only passing model is also the most expensive one. That case now reports that you are already on the optimal tier

### Changed
- Published package contains only the built CLI (4 files, ~10 kB, down from 43 files and ~272 kB)

## [1.0.0] - 9/22/26

### Added
- `pennywyze audit` command: benchmarks Claude Opus, Sonnet, and Haiku against a user-provided golden dataset
- Real cost projections and audit self-cost, built from actual token usage
- Strict, decoration-tolerant grading (exact-match scorer)
- Early stopping for tiers that mathematically can't pass
- `--fake` mode: full pipeline at zero cost, no API key required
- Installable globally via `npm install -g pennywyze`
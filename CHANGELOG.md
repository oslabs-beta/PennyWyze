# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 9/24/26

### Added
- `pennywyze audit` command: benchmarks Claude Opus, Sonnet, and Haiku against a user-provided golden dataset
- Real cost projections and audit self-cost, built from actual token usage
- Strict, decoration-tolerant grading (exact-match scorer)
- Early stopping for tiers that mathematically can't pass
- `--fake` mode: full pipeline at zero cost, no API key required
- Installable globally via `npm install -g pennywyze`
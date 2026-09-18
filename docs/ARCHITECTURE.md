# Architecture

A tour of PennyWyze's source, in the order one audit actually travels through it. If you're contributing, this is the fastest way to build a mental model before touching code.

## The pipeline, at a glance

```
cli.ts (parse flags)
  → loaders (validate prompt + dataset)
  → provider (fake or real)
  → audit.ts (the loop)
  → scorer (grade each answer)
  → cost/calculator.ts (price it)
  → report.ts (print the verdict)
```

## `src/cli.ts` — the entry point

The only file that imports from every layer of the pipeline. Defines the `audit` command with Commander, validates and converts the CLI flags (everything typed into a terminal arrives as text, so `--volume` and `--pass-rate` are cast to numbers and range-checked here), loads the prompt and dataset, picks the fake or real provider, runs the audit, turns the raw per-question results into per-model summaries, and hands them to the report.

**Gotcha:** the two `try/catch` blocks in the action handler are separate on purpose. The first catches problems with the user's input (bad files); the second catches problems with the run itself (network failures). They produce different error messages because they're different kinds of failure.

## `src/golden-dataset/schema.ts` — the dataset contract

A single Zod schema: a golden dataset line must have an `input` string and an `expected` string, nothing else required. The `GoldenExample` type is derived from this schema with `z.infer`, so the type and the validation rule can never drift apart.

## `src/golden-dataset/load-golden-dataset.ts` — the loader

Reads the dataset file, splits it into lines, and validates each one against the schema above. A blank line is silently skipped (files often end with one). Any other failure, bad JSON or a missing field, throws immediately with the exact line number and stops the whole load. There is no partial success: either every line is valid and the function returns a full list, or it throws before returning anything.

**Gotcha:** this is why the dataset format is JSONL and not a single JSON array. JSONL fails one line at a time, which is what makes "line 3 is invalid" possible instead of "something in this file is broken."

## `src/providers/provider.ts` — the model-caller contract

One interface, `ModelProvider`, with one method: `run(modelId, systemPrompt, userInput)` returns `{ text, inputTokens, outputTokens }`. This is the seam that lets a free fake stand-in and the real Anthropic API be interchangeable. The audit loop is written against this shape, not against any specific implementation.

## `src/providers/anthropic-models.ts` — pricing and model IDs

A single object mapping each tier (`opus`, `sonnet`, `haiku`) to its real model ID and its input/output price per million tokens. This is the one place to edit when Anthropic changes pricing or model IDs. The CLI derives its list of models to audit from this object, so the report's row order (opus, then sonnet, then haiku) comes from this object's own key order, nothing sorts it explicitly.

## `src/providers/fake-provider.ts` — the free stand-in

Implements `ModelProvider` but never makes a network call. Cycles through a short list of canned answers, deliberately including a correct-but-decorated one (`"billing"` in quotes) so development exercises the grader's cleanup logic without spending anything. This is what `--fake` swaps in, and it's how the entire pipeline gets built and tested at zero cost.

## `src/providers/anthropic-provider.ts` — the real caller

Implements `ModelProvider` against the real Anthropic API. A few non-obvious decisions worth knowing before you touch this file:

- No `temperature` parameter. Opus 5 and Sonnet 5 both reject it with an HTTP 400 (see `docs/api-validation.md`). Repeatability is verified separately, by running the same real audit five times and checking the verdict holds, not by pinning temperature.
- `system` is a top-level field on Anthropic's API, not a message with a system role.
- The response's `content` array is searched for the first `text` block rather than assumed to be at index 0, because Opus's adaptive thinking can insert a `thinking` block first.
- `max_tokens` is set generously (1000) so that thinking doesn't consume the budget before the model emits a real answer.

## `src/scorers/scorer.ts` — the grading contract

One interface, `Scorer`, with one method: `score(actual, expected)` returns `Promise<boolean>`. It's async even though the current grader never awaits anything, on purpose: a future LLM-as-judge grader will need to make its own API call, and declaring the contract async now means it drops into this exact socket later without touching the audit loop.

## `src/scorers/exact-match-scorer.ts` — the real grader

Normalizes both sides (strip code fences, quotes, capitalization, trailing punctuation) and then requires exact equality, not "contains." A correct answer wearing decoration passes; a right answer buried in a sentence still fails, because ignoring an output-format instruction is a real production bug, not a technicality. This file's tests are partly seeded by `tests/scorers/fixtures/real-misses.jsonl`, which `cli.ts` grows automatically from real audits, so the grader is validated against real Claude output over time, not just invented examples.

## `src/audit.ts` — the loop

Everything upstream feeds this file; everything downstream reads what it produces. For each model, for each question, it calls the provider, grades the answer with the scorer, and pushes one record onto a results list. Both the provider and the scorer are received as parameters, never imported directly, which is the entire swap mechanism for fake-vs-real and exact-match-vs-future-grader.

Before each model's run, it computes how many misses that model can absorb and still clear the pass bar. The moment a model's failure count exceeds that number, the loop breaks for that model rather than finishing the remaining questions, since it's already mathematically impossible for it to pass.

## `src/cost/calculator.ts` — the pricing math

One function, `costOfCall`, that turns token counts and per-token rates into a dollar amount. The divide by 1,000,000 exists because rates are quoted per million tokens; forgetting it is the classic bug here; the code still runs, every number is just silently wrong by a factor of a million.

## `src/report.ts` — the printed output

The only part of the tool a user ever sees. Prints the comparison table, the miss details for any model that had at least one, and the verdict. The verdict logic is the one rule this file owns and the easiest to get subtly wrong: it names the cheapest model that *passed*, never just the cheapest model outright, so a fast wrong answer can never win.

## Tests

Vitest covers the loader, the audit loop's shape and early-stopping math, the cost calculator, and the exact-match scorer. Cost calculator tests use hand-computed expected values on purpose, since deriving expectations from the same code being tested would prove nothing.

## Scripts

`scripts/provider-validation/` holds manual, one-off scripts used to probe a real provider's API directly (model IDs, accepted parameters, response shape) before writing a real `ModelProvider` implementation against it. These are not automated tests, they cost real money, and they're meant to be run and read by a human, not by CI.
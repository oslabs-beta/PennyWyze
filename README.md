# PennyWyze

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](#install--setup)

**DON'T PAY FOR WASTED INTELLIGENCE**

PennyWyze audits which Claude tier — Opus, Sonnet, or Haiku — is the cheapest
one that still passes YOUR quality checks. Point it at your prompt and a golden
dataset of real examples with known-correct answers; it runs every example
against all three tiers, grades each answer, and prints a report: each model's
score, its projected monthly cost at your volume, what the audit itself cost,
and a verdict naming the cheapest passing model and what switching saves you.

## Contents

- [Install & Setup](#install--setup)
- [Run an Audit](#run-an-audit)
- [Grading Rules](#grading-rules)
- [Repeatability](#repeatability)
- [Golden Dataset Format](#golden-dataset-format)
- [Troubleshooting](#troubleshooting)
- [Status](#status)

## Install & Setup

Requires Node 18+.

```bash
git clone https://github.com/oslabs-beta/PennyWyze.git
cd PennyWyze
npm install
```

To use `pennywyze` as a plain installed command (no npm prefix):

```bash
npm run build
npm link
```

PennyWyze runs on your own Anthropic API key — nothing is uploaded anywhere.
Create a `.env` file at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Already using Anthropic? You're done. (No key yet? Add `--fake` to any command
to run the whole pipeline on a built-in fake provider — free and instant.)

## Run an Audit

```bash
pennywyze audit --prompt examples/prompt.md --dataset examples/demo-dataset.jsonl --pass-rate 90
```

(Without `npm link`, the dev path works too:
`npm run dev -- audit --prompt ... --dataset ...` — the lone `--` separates
npm's flags from PennyWyze's.) Output:

```
 ✓ opus audited — 50 questions
 ✓ sonnet audited — 50 questions
 ✓ haiku audited — 50 questions

  PENNYWYZE AUDIT REPORT
┌───────────────────────────┬────────────┬────────────────┐
│ MODEL                     │  ACCURACY  │ EST. COST / MO │
├───────────────────────────┼────────────┼────────────────┤
│ claude-opus-5             │ 48/50 PASS │   $190.49 / mo │
├───────────────────────────┼────────────┼────────────────┤
│ claude-sonnet-5           │ 49/50 PASS │    $74.94 / mo │
├───────────────────────────┼────────────┼────────────────┤
│ claude-haiku-4-5-20251001 │ 48/50 PASS │    $26.26 / mo │
└───────────────────────────┴────────────┴────────────────┘

  FAILED TEST DETAILS
-------------------------------------------------------
 ● claude-haiku-4-5-20251001
   └─ Input:    "I can't log in and honestly at this point I just want my ..."
      Received: "account"
      Expected: "billing"
-------------------------------------------------------

 VERDICT  Switch to claude-haiku-4-5-20251001 - save ~$164.23/mo.

  ℹ Audit cost: $0.15
```

Each model runs your real prompt against your real examples, one API call per
question — a live progress bar shows the audit working. Models that can't
reach the pass bar stop early, so failed tiers don't keep spending your money.
Misses are printed for every model — even passing ones — so you see exactly
what the cheaper tier gets wrong before you switch.

### Flags

| Flag | Required | Default | What it does |
|---|---|---|---|
| `--prompt <filepath>` | yes | — | your instructions file, sent with every call |
| `--dataset <filepath>` | yes | — | your golden dataset (format below) |
| `--volume <count>` | no | 100000 | your messages per month — scales the cost projections, never the verdict |
| `--pass-rate <percent>` | no | 100 | minimum score to count as passing, 1–100 (e.g. 90 = one miss in ten is fine) |
| `--fake` | no | off | run against a built-in fake provider: no API key, no cost, instant |

### A Note on Pricing

Per-token rates for all three tiers are hardcoded from Anthropic's published
pricing. Anthropic changes these periodically — if a monthly-cost projection
looks off, check current pricing before trusting it at scale. The verdict
(which tier is cheapest) is far more robust to a stale rate than the exact
dollar figure is.

## Grading Rules

Answers are cleaned before comparison — surrounding quotes, code fences,
capitalization, and trailing punctuation are stripped from both sides — then
compared with strict equality: a model's cleaned output must exactly equal the
expected label rather than merely containing it. A correct answer wearing
decoration passes; a wrong answer never does.

Strictness is a policy: an answer buried in a sentence ("The answer is
billing") fails, because ignoring "reply with only the word" is a real
compliance miss for a production task.

Evaluation defaults to requiring a 100% score to pass; `--pass-rate` loosens
the bar.

## Repeatability

Verdict stability tested across 5 consecutive real audits: identical verdicts
and identical per-model scores every run. Per-answer output-token counts vary
slightly on the newest models (adaptive thinking is non-deterministic), which
moves cost projections a few percent between runs — but scores and the verdict
held constant in every trial. Re-run/threshold logic deliberately omitted:
the data says it isn't needed.

## Golden Dataset Format

**What a golden dataset is:** a small file of real examples from your AI
feature, each paired with the answer you consider correct — real inputs your
system actually receives, and the exact output you'd want back. It's the
answer key PennyWyze grades every model against: your quality bar, written
down.

**Don't have one? Build it in ~20 minutes:** pull 20–30 real inputs from your
logs (support tickets, user messages, whatever your feature processes), run
each through your current setup or label it by hand, and keep only the ones
where you're confident what the right answer is. Real examples beat invented
ones — invented inputs test the model on questions your users never ask.

Golden dataset files use two fields:

- `input` — the prompt or question sent to the AI.
- `expected` — the correct answer used to evaluate the AI's response.

All dataset entries must use these exact field names.

The file must be **JSONL** (JSON Lines): one complete JSON object per
line — no wrapping array, no commas between lines.

```jsonl
{"input": "My card was charged twice", "expected": "billing"}
{"input": "App crashes on upload", "expected": "technical"}
```

**JSONL vs regular JSON:** regular JSON is one structure parsed all at
once — a single missing comma breaks the whole file with no location
given. JSONL parses line-by-line, which is what lets PennyWyze report
"line 3 is invalid" instead of "something's wrong somewhere." Have
regular JSON? Convert first — each array entry becomes its own line.

Bad lines stop the audit immediately with the line number — no API money
is ever spent on a broken dataset. Verdicts get more trustworthy with more
examples; under 30, the report says so.

## Troubleshooting

PennyWyze fails loud and specific rather than crashing with a stack trace.
If you hit one of these, the fix is usually immediate:

| You'll see | It means | Fix |
|---|---|---|
| `Prompt file not found: '...'` | `--prompt` points at a path that doesn't exist | Check the path, or that you're running from the right directory |
| `Dataset file not found: '...'` | `--dataset` points at a path that doesn't exist | Same as above |
| `Prompt file '...' contains no readable text.` | The prompt file exists but is empty | Add your instructions to the file |
| `Line N of your golden dataset is not valid JSON.` | Line N has a syntax error (missing quote, trailing comma, ...) | Fix that exact line — nothing before or after it was touched |
| `Line N of your golden dataset is invalid: ...` | Line N parsed as JSON but is missing `input` or `expected` | Add the missing field named in the message |
| `Dataset file '...' is empty. Provide at least 1 test example.` | The file has no usable rows | Add at least one `{"input": ..., "expected": ...}` line |
| `Error: Volume must be a positive number.` | `--volume` wasn't a number, or was ≤ 0 | Pass a positive number, e.g. `--volume 5000` |
| `Error: Pass rate must be a number between 1 and 100.` | `--pass-rate` was outside 1–100 | Pass a percentage in that range |
| `Error: Could not connect to Anthropic API. Check your network connection.` | A network or timeout failure reaching Anthropic | Check your connection and retry, or run with `--fake` to confirm the rest of the pipeline works |

No key yet, or want to sanity-check a prompt/dataset pair without spending
anything? Add `--fake` to any command — it runs the identical pipeline
against a built-in stand-in provider.

## Status

Built at OSLabs. Working today: real audits against live Claude models,
grading with cleanup, early stopping, configurable pass bar, live progress,
misses reporting, real cost projections and audit self-cost, free fake mode,
installable CLI via npm link. Publishing to the npm registry coming soon.

Not yet on the audit ladder: Anthropic's Fable 5 tier. PennyWyze currently
audits Opus, Sonnet, and Haiku only.

## License

MIT
# PennyWyze

**DON'T PAY FOR WASTED INTELLIGENCE**

PennyWyze audits which Claude tier — Opus, Sonnet, or Haiku — is the cheapest
one that still passes YOUR quality checks. Point it at your prompt and a golden
dataset of real examples with known-correct answers; it runs every example
against all three tiers, grades each answer, and prints a verdict: the cheapest
passing model and what switching saves you.

## How it works

Every model takes the same exam — your actual prompt, your actual examples,
one API call per question, exactly the way your production feature runs. Each
answer is graded against your expected value, every call's token counts are
recorded, and the report names the cheapest model that met your bar.

```
 ✓ opus audited — 5 questions
 ✓ sonnet audited — 5 questions
 ✗ haiku failed — stopped at question 2

┌────────┬────────────┬──────────────┐
│ MODEL  │ ACCURACY   │ COST / MONTH │
├────────┼────────────┼──────────────┤
│ Opus   │ 5/5 PASS   │ ...          │
│ Sonnet │ 5/5 PASS   │ ...          │
│ Haiku  │ 1/2 FAIL   │ ...          │
└────────┴────────────┴──────────────┘
VERDICT  Switch to Sonnet, same accuracy...
```

## Usage

```bash
pennywyze audit --prompt ./your-prompt.md --dataset ./your-dataset.jsonl
```

| Flag | Required | Default | What it does |
|---|---|---|---|
| `--prompt <filepath>` | yes | — | your instructions file, sent with every call |
| `--dataset <filepath>` | yes | — | your golden dataset (format below) |
| `--volume <count>` | no | 100000 | your messages per month — scales the cost projections, never the verdict |
| `--pass-rate <percent>` | no | 100 | minimum score to count as passing (e.g. 90 = one miss in ten is fine) |
| `--fake` | no | off | run against a built-in fake provider: no API key, no cost, instant — for development |

During development the tool runs via npm, and the lone `--` separates npm's
flags from PennyWyze's:

```bash
npm run dev -- audit --prompt examples/prompt.md --dataset examples/golden-dataset.jsonl --fake
```

## Setup

PennyWyze uses your own Anthropic API key — nothing is uploaded anywhere.
Put it in a `.env` file at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Already using Anthropic? You're done. (No key? `--fake` mode runs the whole
pipeline for free.)

## Golden Dataset Format

Golden dataset files use two fields:

- `input` — the prompt or question sent to the AI.
- `expected` — the correct answer used to evaluate the AI's response.

All dataset entries must use these exact field names.

The file must be **JSONL** (JSON Lines): one complete JSON object per
line — no wrapping array, no commas between lines.

```jsonl
{"input": "My card was charged twice", "expected": "billing"}
{"input": "App crashes on upload", "expected": "tech-problem"}
```

**JSONL vs regular JSON:** regular JSON is one structure parsed all at
once — a single missing comma breaks the whole file with no location
given. JSONL parses line-by-line, which is what lets PennyWyze report
"line 3 is invalid" instead of "something's wrong somewhere." Have
regular JSON? Convert first — each array entry becomes its own line.

Bad lines stop the audit immediately with the line number — no API money
is ever spent on a broken dataset.

## Grading

Answers are cleaned before comparison — surrounding quotes, code fences,
capitalization, and trailing punctuation are stripped from both sides —
then compared with strict equality: a model's cleaned output must exactly
equal the expected label rather than merely containing it. A correct
answer wearing decoration passes; a wrong answer never does.

Strictness is a policy: an answer buried in a sentence ("The answer is
billing") fails, because ignoring "reply with only the word" is a real
compliance miss for a production task.

Evaluation defaults to requiring a 100% score to pass; `--pass-rate`
loosens the bar.

## Cost controls

- **Early stopping:** a model that mathematically can't reach the pass bar
  stops taking the exam — remaining calls are skipped, not billed.
- **Live progress:** each model's run shows a live progress bar, so you always
  know what the audit is doing with your money.
- **`--fake` mode:** the entire pipeline runs at $0 for development and CI.

## Status

In active development (OSLabs). Working today: real audits against live Claude
models, grading with cleanup, early stopping, configurable pass bar, misses
reporting, free fake mode. In flight: real monthly cost projections in the
table. npm package coming post-demo.
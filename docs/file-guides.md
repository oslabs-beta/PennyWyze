# PennyWyze — File Guides (Complete, Personal Copy)
*Every top comment, in pipeline order — the path one audit travels. Keep this file locally (outside the repo or in a gitignored folder).*

---

## 1. src/cli.ts — THE FRONT DOOR

```
THE FRONT DOOR — cli.ts
Our tool is used by typing a line in the terminal. This file is what
understands that typed line.

We Build ...
    1. The description of our command — Commander (the library that
       sorts what users type) knows nothing about our command until
       we describe it here
    2. The receiving function — the code that runs once a valid
       command arrives, holding the sorted values

What it Powers ...
    This file is the ignition: an audit only happens because a valid
    command arrived here. The receiving function then drives the
    entire pipeline in order — calls the two loaders, hands their
    output to the audit loop, and sends the results to the report.

Build No. 1 — The Command
    - name: audit
    - --prompt <path>   REQUIRED — the user's instructions file
    - --dataset <path>  REQUIRED — their golden dataset (the quiz
      with answers we grade against)
    - --volume <n>      OPTIONAL, default 100000 — their messages
      per month; only scales the money numbers, never the verdict

Build No. 2 — The Receiving Function
    - Commander calls it with the sorted values as one object:
      { prompt, dataset, volume }
    - In the skeleton it only prints those values back — proof the
      front door works; wiring to the real pipeline is its own ticket
    - Everything typed in a terminal arrives as TEXT — volume needs
      converting to a real number, and nonsense (words, zero,
      negatives) deserves one clear rejection sentence

Tech ...
    commander (installed) → import { Command } from "commander"

Commander's Vocabulary — the 5 methods we use ...

    .command("audit")
        names our command; what the user types to invoke it

    .requiredOption("--x <val>")
        declares a flag the command refuses to run without —
        this is what buys the free missing-flag error messages

    .option("--x <val>", desc, default)
        declares an optional flag; the third argument is used
        when the user skips it

    .action(fn)
        hands Commander our receiving function — it calls fn
        with the sorted values once the command is valid

    .parse()
        "go" — reads what was actually typed and does the sorting

    Chain order when building a command: identity → inputs → behavior
    (.command + .description, then flags — required first —
    then .action last; Commander accepts any order, but this
    reads like the help screen it generates)

    (<val> = "a value must follow this flag" · full working
    pattern: Build Plan, Phase 1.1)

Reminder During Development
    - In dev, our tool isn't an installed command yet — it runs via
      npm run dev
    - npm assumes any --flag belongs to npm itself and swallows it
      before our tool sees it, so flags silently vanish
    - the lone "--" means "everything after this belongs to my tool":
      npm run dev -- audit --prompt examples/prompt.md --dataset examples/golden-dataset.jsonl
```

---

## 2. src/golden-dataset/schema.ts — THE RULEBOOK

```
THE RULEBOOK — schema.ts
The golden dataset format rule, written as a zod definition — the
shape every golden dataset entry must follow.

We Build ...
    1. The zod definition — the golden dataset format rule (each
       line = input + expected, both text)
    2. The GoldenExample type — defined USING that zod definition,
       so the rule and the type can never drift apart

What it Powers ...
    - The loader checks every golden dataset line against this rule —
      ensuring data is formatted the way every piece of the pipeline
      expects. Zod's specific rejections ("expected: Required")
      become our "Line 3 is invalid" messages.
    - The GoldenExample type enforces the shape of question data
      across the code — the loader returns GoldenExample[], the loop
      walks it, example.input autocompletes.
    - Enforcing all of this upfront, at the door, stops broken data
      from crashing the audit later down the line — no defensive
      checks needed anywhere downstream.

Build No. 1 — the zod definition
    The rule demands of each line:
    - a field named input    — must be text
    - a field named expected — must be text
    - nothing else is required or checked
    (what the fields ARE: input is the question sent to the model;
    expected is the correct answer we grade against — never sent)
    Export it — the loader imports this to check lines against.

Build No. 2 — the GoldenExample type
    - one line: derive it from the definition with z.infer — no
      shape is written a second time
    - Export it — it types every loaded question everywhere:
      the loader returns GoldenExample[], the loop walks it

Tech ...
    zod (installed) → import { z } from "zod"

Zod's Vocabulary — the 3 pieces we use ...

    z.object({ ... })
        builds a rule for an object. Inside the braces: each
        field's name, then what that field must be.
        Example: z.object({ input: z.string() })
        = "an object with a field called input, which must be text"

    z.string()
        the rule meaning "must be text." Goes inside z.object,
        after a field's name.

    z.infer<typeof ourSchema>
        creates the TypeScript type that matches a schema. Just
        memorize the phrase as-is — "z.infer<typeof X>" means
        "the type matching X."

The Schema ...
    - input    (text) — what gets sent to the model
    - expected (text) — the correct answer we grade against;
      NEVER sent to the model
    - nothing else required, nothing else checked
    - export both: the schema (for the loader) and the
      GoldenExample type (for everyone)

Gotchas ...
    - This file doesn't throw the formatting errors — it's the basis
      for comparison; the loader does the checking and the throwing
    - Nothing in this file runs. The actual check-against-the-schema
      happens in the loader's code — this file is only imported and
      consulted
```

---

## 3. src/golden-dataset/load-golden-dataset.ts — THE CUSTOMS OFFICER

```
THE CUSTOMS OFFICER — load-golden-dataset.ts
Given access to the user's golden dataset file, this function loops
through it line by line, checking each against the schema — and
either returns the full list of correctly formatted questions, or
immediately throws an error naming the bad line. No third outcome.

We Build ...
    1. The loadGoldenDataset(path) function — takes the file's
       address (handed in from the user's typed command), returns
       the finished question list: GoldenExample[]

What it Powers ...
    - The entire audit runs on this function's output: the loop
      sends each question's input to the models, the grader checks
      answers against each question's expected
    - The two endings are the trust mechanism: only the good ending
      returns a list, so holding the list IS proof every line
      passed — downstream code reaches into questions with zero
      defensive checks, ever
    - Stopping on the first bad line protects the user: no API
      money spent on a broken exam, no score secretly out of 49,
      no verdict computed on partial data

Tech ...
    Node's file reading (built in) → import { readFileSync } from "fs"
    our schema + type → import { goldenExampleSchema, GoldenExample } from "./schema"

Build No. 1 — the loadGoldenDataset function, step by step
    1. Read the file at the given path — it arrives as ONE long
       string, every line mashed together, separated by invisible
       line-break characters ("\n")
    2. Cut the string at every line break — now a list of separate
       text lines, and "line 3" is a real, pointable thing
    3. For each line, in order:
       - completely blank line → skip it silently (files often end
         with one — normal, not an error; the ONLY skipping allowed)
       - parse its JSON — the text becomes a real object
       - check the object against the schema (safeParse) — the
         check hands back a verdict: success + the certified data,
         or failure + the specific reason ("expected: Required")
       - success → push the certified data onto the growing list
       - failure (or the parse itself failed) → STOP EVERYTHING:
         throw one clear sentence with the line number, built from
         the specific reason — "Line 3 of your golden dataset is
         not valid JSON." Nothing after line 3 is ever looked at.
    4. Survived every line → return the finished list

Gotchas ...
    - Never skip a bad line and keep going — a silently shortened
      dataset means an audit on fewer questions than the user
      believes, which corrupts the verdict. Ten seconds of user
      annoyance always beats spending money on wrong data.
    - JSONL is what makes "line 3" possible — one object per line,
      parsed line by line. Regular JSON fails as one unlocatable
      blob, so a helpful line-numbered error couldn't exist.
    - Throwing here doesn't print ugly — the command's outer layer
      catches it and shows the user just the one clean sentence.
```

---

## 4. src/golden-dataset/load-prompt.ts — THE COURIER

```
THE COURIER — load-prompt.ts
Fetches the user's prompt file: address in, text out. The simplest
file in the project — delivery, not inspection.

We Build ...
    1. The loadPrompt(path) function — takes the prompt file's
       address (handed in from the user's typed command), returns
       everything inside it as one string

What it Powers ...
    - Its output becomes the systemPrompt — the instructions sent
      with EVERY single API call. This is how the user's actual
      task enters the audit.
    - Delivered whole and untouched: our code never reads or
      interprets the prompt — Claude is its only reader.

Build No. 1 — the loadPrompt function
    - Read the file at the given path, return its text. That is
      genuinely the whole job.
    - The one failure case: the address is wrong (typo, file
      moved). Fail kindly — "Couldn't find a prompt file at
      ./my-promt.md" — instead of a raw crash.
    - Courtesy check: if the file exists but is empty, say so —
      silently auditing with blank instructions helps no one.

Tech ...
    Node's file reading (built in) → import { readFileSync } from "fs"

Gotchas ...
    - No parsing, no schema, no checking — and that's correct, not
      lazy: prompts are free-form text with no rules to break. You
      can't format-check "whatever the user wanted to say."
    - Don't be tempted to validate or "clean" the prompt — whatever
      the user wrote IS the prompt; changing it would make the
      audit test something other than their real instructions.
```

---

## 5. src/providers/provider.ts — THE PROVIDER CONTRACT

```
THE PROVIDER CONTRACT — provider.ts
The agreed shape of anything that calls a model — written down once
so every provider (fake or real) is built identical in shape.

What an interface is: a shape description, not working code. It says
"anything claiming to be a ModelProvider must have a run() function
with exactly these inputs and outputs." TypeScript enforces it — any
provider that doesn't match this shape gets flagged the moment it's
typed. The interface itself vanishes when the code compiles; it
exists only to keep every provider identical in shape.

We Build ...
    1. The ModelProvider interface — the run() shape below

What it Powers ...
    - The swap: two different providers will take turns in the same
      spot — the FakeProvider (canned answers, free, for
      development) and the AnthropicProvider (real Claude calls,
      built in Milestone 2). Because both are built to this one
      shape, swapping fake for real is a one-line change and
      nothing else in the tool notices.
    - Parallel building: the audit loop is written against this
      shape, not against any finished provider.

Build No. 1 — the run() shape

    What a provider does in the machine: the audit loop walks the
    golden dataset and, for EACH question, calls provider.run()
    once — one question per call, three models each taking the same
    exam. The provider's whole job is: take the instructions + one
    question, get this model's answer, hand it back with the token
    counts.

    The inputs (what the loop hands a provider each call):
    modelId      — which of the 3 Claude models to ask (an ID
                   string like "claude-haiku-4-5" — it's a name,
                   not a number)
    systemPrompt — the user's prompt file contents; the model's
                   standing instructions, sent with every call
    userInput    — the input field of ONE golden dataset example
                   (the question being asked this call). "User"
                   here means the API's user-message slot — NOT
                   our tool's user. The example's expected field
                   is NEVER sent — it's the answer key, and only
                   our scorer sees it.

    The outputs (why each field must come back):
    text         — the model's answer; the scorer grades this
                   against the example's expected
    inputTokens / outputTokens — the meter readings. Anthropic
                   counts tokens (the chunks models read/write,
                   ~3/4 of a word each) for billing and attaches
                   the counts to every response as usage — we
                   just pass them through. ALL of our cost math
                   runs on these two numbers.

    Wrapped in a Promise because the real provider waits on the
    internet; the fake answers instantly but wears the same
    wrapper so both fit one shape.

Tech ...
    none — pure TypeScript, no imports

Gotchas ...
    - This file never calls anything — nothing in it runs. It's
      only imported, and TypeScript holds every provider to the
      shape.
    - The shape wasn't invented — it was derived: each output
      field exists because a downstream piece needs it (text →
      scorer, tokens → cost engine). Change it only with the
      whole team, in a PR.
```

---

## 6. src/providers/fake-provider.ts — THE STUNT DOUBLE

```
THE STUNT DOUBLE — fake-provider.ts
A provider that fakes the work: fits the provider contract
perfectly, but instead of contacting Claude it instantly returns
canned answers from a list we wrote. No internet, no key, no cost.

We Build ...
    1. The FakeProvider — a ~10-line object with a run() matching
       the contract: ignores its inputs, returns the next canned
       answer plus made-up token counts

What it Powers ...
    - All of Milestone 1: the whole pipeline (loop, grading, cost
      math, report) gets built and tested against this for weeks,
      instantly, offline, at exactly $0
    - The planted variety is a feature: mostly-correct answers,
      a couple of wrong ones, and one correct-but-messy answer
      (like "billing" in quotes) — so the grader gets to fail
      things, the report gets to show a losing model, and real
      Claude's mess is previewed before a cent is spent

Build No. 1 — the FakeProvider
    - a pre-written answer list with deliberate variety: correct
      labels, wrong labels, one wrapped in quotes or odd formatting
    - run() ignores modelId, systemPrompt, and userInput entirely —
      grabs the next answer off the list (cycling), returns it with
      invented token counts (e.g. inputTokens: 50, outputTokens: 3)
    - async, matching the contract's Promise — instant, but wearing
      the same wrapper as the real provider

Tech ...
    our contract → import type { ModelProvider } from "./provider"

Gotchas ...
    - Don't make it smarter. Its job is fitting the shape, not
      answering correctly — the machinery downstream just needs
      stuff flowing through it.
    - The loop must RECEIVE this as a parameter, never create its
      own — that's the entire swap mechanism for fake-now,
      real-later.
    - If any real API money gets spent during Milestone 1,
      something bypassed this file — find it before Milestone 2.
```

---

## 7. src/providers/anthropic-provider.ts — THE REAL CALLER

```
THE REAL CALLER — anthropic-provider.ts
The provider that actually contacts Anthropic: same contract shape
as the FakeProvider, but run() makes a real API call and returns
real Claude's answer with real token counts. (Built in Milestone 2.)

We Build ...
    1. The AnthropicProvider — a run() matching the contract, using
       the Anthropic SDK to make the call and plucking the answer
       + token counts out of the reply

What it Powers ...
    - Truth: the moment this swaps in for the fake, every answer,
      score, and dollar figure becomes real. The tool starts
      telling the truth here.
    - Each call costs a fraction of a cent on the user's own key
      and takes a couple of seconds — this file is where the
      audit's runtime and its cost both live.

Build No. 1 — the AnthropicProvider
    - create the client once, with maxRetries: 4 — the SDK
      automatically retries "slow down" (rate limit) errors with
      growing waits; we configure, not hand-build
    - each run(): call the SDK's message-create with:
      · model: the modelId passed in
      · system: the systemPrompt — a TOP-LEVEL field, not inside
        the messages (gotcha coming from OpenAI)
      · messages: one user message holding userInput
      · temperature: 0 — ONLY on models that accept it; two
        dropped the setting (see the verify-reality note for
        which). Repeatability is proven either way by M3's
        run-the-audit-twice test.
      · max_tokens: required by the API — a couple hundred is
        plenty for short answers
    - pull the answer out: response.content is a LIST of blocks —
      find the text block, return its text
    - token counts come straight off response.usage — pass them
      through as inputTokens / outputTokens

Tech ...
    @anthropic-ai/sdk (installed) → import Anthropic from "@anthropic-ai/sdk"
    the key: the SDK auto-reads ANTHROPIC_API_KEY from the
    environment — no key handling in our code, ever

Gotchas ...
    - This is the ONLY file in the project that touches the
      Anthropic SDK — everything else talks to "a provider."
    - If a call still fails after all retries: record that question
      as errored and KEEP GOING — one bad call must never crash
      the whole audit at question 37 of 150.
    - The prompt goes in the system field, not the messages —
      and max_tokens is not optional.
```

---

## 8. src/scorers/scorer.ts — THE SCORER CONTRACT

```
THE SCORER CONTRACT — scorer.ts
The agreed shape of the grading handoff: the loop passes two
strings over, gets a yes/no back. HOW the verdict gets decided is
the grader's private business — this contract shapes only the
exchange.

We Build ...
    1. The Scorer interface — score(modelOutput, expected) →
       Promise<boolean>

What it Powers ...
    - The loop and the grader get built separately, by different
      people, and fit — the loop calls scorer.score(...) against
      this shape before any real grader exists
    - Grader upgrades are swaps, not rewires: the naive ===
      placeholder → the ExactMatchScorer → any future grader, all
      plugging into the same spot

Build No. 1 — the score() shape
    - modelOutput: string — the answer the provider brought back
      (the provider's text output becomes this input: a relay)
    - expected: string — the answer key from the golden dataset;
      the field that never traveled to the model, finally used
    - returns Promise<boolean> — pass or fail, one bit; the loop
      counts these into scores like 46/50

Tech ...
    none — pure TypeScript, no imports

Gotchas ...
    - Async ON PURPOSE, even though our first graders don't wait
      for anything: a future LLM-judge grader makes API calls
      (async), and declaring the shape async NOW means it drops
      into an unchanged socket later. One keyword today = a free
      stretch feature someday. Don't "simplify" it away.
    - The contract says nothing about grading method — cleaning,
      comparing, judging — all of that lives inside whatever
      grader is plugged in.
```

---

## 9. src/scorers/exact-match-scorer.ts — THE GRADER

```
THE GRADER — exact-match-scorer.ts
The real grading: clean both answers first, THEN compare — so
correct-but-messy answers pass and wrong answers still fail.
Replaces the naive === check. (Built in Milestone 2.)

We Build ...
    1. normalize() — the cleanup function: strips formatting noise
       off an answer, step by step
    2. The ExactMatchScorer — fulfills the scorer contract:
       normalizes BOTH the model's answer and the expected answer,
       then strictly compares them

What it Powers ...
    - False-verdict prevention — the single most important bug not
      to ship: without cleaning, "Billing." fails against billing
      and the report claims a model can't do a job it can do. A
      tool selling trustworthy verdicts cannot grade typography.
    - Every passed/failed stamp in the results list comes from
      here — which means every score, and therefore the verdict.

Build No. 1 — normalize(), in this order
    1. trim surrounding whitespace
    2. strip a code-fence wrapper if present
    3. strip surrounding quotes
    4. lowercase everything
    5. drop trailing punctuation
    (order matters — strip the wrappers before touching the core)

Build No. 2 — the ExactMatchScorer
    - normalize both sides, then compare with strict equality,
      per the strictness rule recorded in the README
    - a genuinely wrong answer survives cleaning unchanged and
      still fails — cleaning removes decoration, never meaning

Tech ...
    our contract → import type { Scorer } from "./scorer"
    test fixtures: the real messy outputs collected in Milestone 2
    become this file's test cases

Gotchas ...
    - Clean BOTH sides — the user may have written their expected
      answer with a capital or period too.
    - Strict equals is a POLICY, chosen on purpose: an answer
      wrapped in a sentence ("The answer is billing") fails,
      because ignoring "reply with only the word" is a real
      compliance miss for a production task. A --contains flag is
      a cheap future option if users want lenient.
    - Test with the collected real mess: every messy-but-correct
      specimen must pass, every plainly-wrong answer must still
      fail. If all real specimens grade correctly, the grader is
      ready.
```

---

## 10. src/cost/pricing.ts — THE PRICE LIST

```
THE PRICE LIST — pricing.ts
The six known prices (3 models × what each charges for input and
output tokens), written down in ONE labeled spot. This is data,
not machinery — a lookup chart the calculator consults.

We Build ...
    1. The PRICING lookup — each model ID mapped to its input rate
       and output rate, in dollars per MILLION tokens

What it Powers ...
    - Every dollar figure the tool ever prints starts as a lookup
      here: the calculator reads these rates against each call's
      token counts
    - One spot means price changes are a one-line edit instead of
      a hunt through the code — and prices DO change (Sonnet's
      intro pricing literally ends 9 days after our demo)

Build No. 1 — the PRICING lookup
    - three entries, keyed by the exact model IDs from the
      verify-reality note
    - each entry: { in: <rate>, out: <rate> } — output rates are
      higher (generating costs more than reading)
    - a comment block noting: the source (Anthropic's pricing
      page), the date checked, and that Sonnet's intro pricing
      ends Aug 31

Tech ...
    none — a plain exported object

Gotchas ...
    - Rates are per MILLION tokens — the ÷ 1,000,000 happens in
      the calculator, not here. These are the raw published rates.
    - This is not a visual table — nothing here prints. The
      report's on-screen table is a different thing entirely.
    - When prices change, update the date-checked comment too —
      it's what makes these numbers trustworthy months later.
```

---

## 11. src/cost/calculator.ts — THE CALCULATOR

```
THE CALCULATOR — calculator.ts
Turns token counts into dollars: the machinery that reads the
price list and produces every money number in the report.

We Build ...
    1. costOfCall() — price one call: its tokens × its model's
       rates ÷ 1,000,000
    2. The summary math — each model's average cost per call, the
       monthly projection (× volume), and the audit's own total

What it Powers ...
    - The headline number: each model's projected $/month is what
      the user acts on, forwards to their boss, and switches
      models over
    - The honesty number: the audit's own cost ("This audit cost
      $0.42") — a trust tool should be upfront that testing isn't
      free
    - The verdict's second half: score decides who passes; THESE
      numbers decide who wins among the passers

Build No. 1 — costOfCall()
    - (inputTokens × that model's in-rate + outputTokens × that
      model's out-rate) ÷ 1,000,000
    - the divide exists because rates are quoted per million
      tokens

Build No. 2 — the summary math
    - per model: price each of its calls, average them → true cost
      per call → × volume → the monthly projection
    - running total across ALL calls, every model → the audit's
      own cost

Tech ...
    the price list → import { PRICING } from "./pricing"
    the results shape → import type { AuditResult } from "../audit"

Gotchas ...
    - Forgetting the ÷ 1,000,000 is THE classic bug — the code
      still runs, every number is silently wrong by a factor of a
      million.
    - Tests use answers computed BY HAND ON PAPER first (42 tokens
      at $1/M = $0.000042). Expected values produced by running
      the code being tested prove nothing.
    - Sanity check the spread: the cheapest tier should land
      roughly 5x cheaper than the top tier. A wildly different
      spread means a math bug, not unusual models.
```

---

## 12. src/audit.ts — THE HEART

```
THE HEART — audit.ts
The loop that runs everything: every question in the golden
dataset, sent to every model, one call at a time — each answer
graded on the spot and saved. The whole audit happens here.

We Build ...
    1. The AuditResult type — the agreed shape of one saved
       record: { model, question, answer, passed, inputTokens,
       outputTokens }
    2. The results list — born empty before the loop, filled by
       it, returned after: one record per call, 3 models × N
       questions
    3. The nested loop itself — with the provider and scorer
       received as parameters

What it Powers ...
    - The results list is the single source everything after
      reads: the calculator multiplies its token fields, the
      scores count its passed stamps, the report prints the
      summaries. The loop fills the notebook; everyone else
      only reads it.
    - Grading per call (not at the end) is what makes early
      stopping possible later — a model that's already failed
      can skip its remaining calls and save the user money.

Build No. 1 — the loop
    - create the empty results list
    - for each of the 3 model IDs →
        for each example in the question list →
          · await provider.run(modelId, promptText, example.input)
            — one call = the prompt + ONE question; the example's
            expected is NEVER sent (it's the answer key)
          · grade: await scorer.score(answer, example.expected)
          · push the finished record { model, question, answer,
            passed, inputTokens, outputTokens }
    - return the filled list

Tech ...
    the contracts → import type { ModelProvider } from "./providers/provider"
                    import type { Scorer } from "./scorers/scorer"
    the question type → import type { GoldenExample } from "./golden-dataset/schema"

Gotchas ...
    - The provider (and scorer) must be RECEIVED as parameters —
      never created inside the loop. Whoever calls the loop
      decides fake-or-real; that's the entire swap mechanism.
    - In Milestone 1 the grading spot holds a naive === check —
      it wrongly failing the FakeProvider's planted messy answer
      (like "billing" in quotes) is EXPECTED. Don't fix it here;
      real grading is Milestone 2's ticket.
    - One question per call, on purpose: it mirrors how the
      user's real product runs (one message at a time), which is
      what makes the measured per-call costs true.
```

---

## 13. src/report.ts — THE FACE

```
THE FACE — report.ts
The only part of the tool users ever see: everything else
produces invisible data; this turns it into the printed table,
the verdict, and the audit-cost line in the terminal.

We Build ...
    1. The results table — one row per model: name, score
       (like 46/50), projected monthly cost
    2. The verdict line — the sentence the product exists for:
       "Sonnet passes at $780/mo — switching from Opus saves
       $520/month"
    3. The honesty line — "This audit made 150 calls and cost
       $0.42"

What it Powers ...
    - This IS the product to the user: ~10 printed lines. The
      entire machine exists to make these lines truthful.
    - Built FIRST with made-up numbers (Milestone 1), on
      purpose: it forces the team to agree what the output
      looks like while changing it is cheap, and gives the
      whole build a visible target to fill in.

Build No. 1 — the table
    - columns: Model | Score | Monthly cost
    - green scores for passing models, red for failing

Build No. 2 — the verdict line
    - names the CHEAPEST PASSING model — not the cheapest model:
      a cheaper model that failed doesn't win
    - includes the savings vs. the most expensive passer, monthly
      (and yearly reads even better)
    - if only the top model passes, that's a real verdict too:
      "no cheaper option meets quality" = "you're not overpaying"

Build No. 3 — the honesty line
    - print the audit's own total cost and call count, straight
      from the calculator's running total

Tech ...
    cli-table3 (installed) → draws clean boxed tables in a terminal
    chalk (installed) → colors terminal text (green passing
    scores, red failing, bold verdict)

Gotchas ...
    - Hardcode fake results for the first build — real numbers
      arrive when the pipeline wires up. Show the printed output
      to both teammates and agree it's right; this is the
      product's face, and changing it is cheapest now.
    - Cheapest PASSER, not cheapest model — the one logic rule
      this file owns, and the easiest to get subtly wrong.
```
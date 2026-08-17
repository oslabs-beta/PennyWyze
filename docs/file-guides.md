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
        command arrived here. The receiving function then drives the entire 
        pipeline in order — calls the two loaders, hands their output to 
        the audit loop, and sends the results to the report.



    Build No.1 - The Command
        - name: audit
        - --prompt <path>   REQUIRED — the user's instructions file
        - --dataset <path>  REQUIRED — their golden dataset (the quiz
          with answers we grade against)
        - --volume <n>      OPTIONAL, default 100000 — their messages
          per month; only scales the money numbers, never the verdict

    Build No.2 The Receiving Function
        - Commander calls it with the sorted values as one object:
          { prompt, dataset, volume }
        - In the skeleton it only prints those values back — proof the
          front door works; wiring to the real pipeline is its own ticket
        - Everything typed in a terminal arrives as TEXT — volume needs
          converting to a real number, and nonsense (words, zero,
          negatives) deserves one clear rejection sentence    



    Tech
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

        (<val> = "a value must follow this flag" · full working
        pattern: Build Plan, Phase 1.1)


    Chain order when building a command: identity → inputs → behavior
        (.command + .description, then flags — required first —
        then .action last; Commander accepts any order, but this
        reads like the help screen it generates)

    
    Reminder During Development 
        - In dev, our tool isn't an installed command yet — it runs via
          npm run dev
        - npm assumes any --flag belongs to npm itself and swallows it
          before our tool sees it, so flags silently vanish
        - the lone "--" means "everything after this belongs to my tool":
          npm run dev -- audit --prompt examples/prompt.md --dataset examples/golden-dataset.jsonl





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

        The inputs (what the loop hands us each call):
        modelId      — which of the 3 Claude models to ask (an ID
                       string like "claude-haiku-4-5" — it's a name,
                       not a number)
        systemPrompt — the user's prompt file contents; the model's
                       standing instructions, sent with every call
        userInput    — the `input` field of ONE golden dataset example
                       (the question being asked this call). "User"
                       here means the API's user-message slot — NOT
                       our tool's user. The example's `expected` field
                       is NEVER sent — it's the answer key, and only
                       our scorer sees it.

        The outputs (why each field must come back):
        text         — the model's answer; the scorer grades this
                       against the example's `expected`
        inputTokens / outputTokens — the meter readings. Anthropic
                       counts tokens (the chunks models read/write,
                       ~3/4 of a word each) for billing and attaches
                       the counts to every response as `usage` — we
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
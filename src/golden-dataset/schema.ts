/*
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
*/
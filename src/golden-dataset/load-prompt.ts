/*
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
*/
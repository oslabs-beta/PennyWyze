/*
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
*/
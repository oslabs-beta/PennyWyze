/*
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
*/


interface Scorer {
  score(actual: string, expected: string): Promise<boolean>;
}

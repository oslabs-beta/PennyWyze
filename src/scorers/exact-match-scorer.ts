/*
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
*/

import type { Scorer } from "./scorer.js";

const normalize = (text:string):string => {
  let s = text
    .trim()
    .replace(/```[a-z]*\n?/g, "")
    .replace(/```/g, "")
    .trim()
  s = s.replace(/^["']|["']$/g, "")
  return s.toLowerCase().replace(/[.!]+$/, "")
}

export const exactMatchScorer: Scorer = {
  async score(modelOutput: string, expected: string): Promise<boolean> {
    return normalize(modelOutput) === normalize(expected)
  }
}
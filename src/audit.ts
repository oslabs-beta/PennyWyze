/*
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
*/

type AuditResult = {
  modelId: string;
  question: string;
  answer: string;
  pass: boolean
  inputTokens: number;
  outputTokens:number;
}
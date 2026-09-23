import type { ModelProvider } from './providers/provider.js'
import type { GoldenExample } from './golden-dataset/schema.js';
import type { Scorer } from './scorers/scorer.js';
import { MODELS_BY_ID } from './providers/anthropic-models.js';

export type AuditResult = {
  modelId: string;
  question: string;
  answer: string;
  expected: string;
  pass: boolean;
  inputTokens: number;
  outputTokens: number;
  /**
   * 'graded' — a real answer that the scorer judged.
   * 'incomplete' — the call never produced a gradeable answer (network
   * failure, truncation, refusal). Deliberately NOT a miss: counting it as
   * one would lower a model's score for something it never got wrong.
   */
  status: 'graded' | 'incomplete';
  /** Why the call was incomplete. Absent on graded results. */
  note?: string;
}

// Display label only — no effect on grading or cost. Read from the catalog
// rather than sniffed from the id, because substring matching silently
// mislabels anything it doesn't recognize. Unknown ids show their full id,
// which is wrong-looking rather than wrongly-attributed.
// When a second provider lands, this should come from the provider instead.
const getTierName = (modelId: string): string =>
  MODELS_BY_ID.get(modelId)?.label ?? modelId

/**
 * How the loop reports progress. Supplied by the caller so this file never
 * writes to a terminal: the CLI passes one that draws a bar, tests pass
 * nothing, and a non-terminal caller can pass its own.
 */
export type AuditProgress = {
  /** Called before each question, with 1-based position in this model's run. */
  onQuestion?: (tier: string, current: number, total: number) => void
  /** Called once per model, when its run ends and why. */
  onModelDone?: (
    tier: string,
    outcome: 'complete' | 'early_stop' | 'incomplete',
    detail: { questionsRun: number; total: number; note: string | null },
  ) => void
}

export const runAudit = async (
  provider: ModelProvider, 
  dataset: GoldenExample[], 
  prompt: string, 
  modelIds: string[],
  passBar: number, // a fraction, 0–1 (cli converts from the 0–100 flag)
  scorer: Scorer,
  progress: AuditProgress = {},
): Promise<AuditResult[]> => {
  const results: AuditResult[] = []

  // Same threshold applies to every model — computed once, not per model,
  // since it only depends on dataset size and the pass bar, not the model.
  const allowedFailures = Math.floor(dataset.length * (1 - passBar))

    for(const modelId of modelIds){
      // Tier name is only for display — has no effect on grading or cost
      const tier = getTierName(modelId)

      let questionCount = 0 // resets per model — each tier's progress reads 1/N fresh
      let failures = 0 // counts this model's misses — early stopping compares it to the bar
      let incompleteNote: string | null = null // set when a call never produced a gradeable answer

      for(const example of dataset){
        questionCount++

        progress.onQuestion?.(tier, questionCount, dataset.length)

        // A failed call ends this model's run, not the audit. Every result
        // already collected has been paid for, and the other models are
        // unaffected by one provider having a bad minute.
        let response
        try {
          response = await provider.run(modelId, prompt, example.input);
        } catch (err) {
          incompleteNote =
            err instanceof Error ? err.message : 'provider call failed'
          results.push({
            modelId,
            question: example.input,
            answer: '',
            expected: example.expected,
            pass: false,
            inputTokens: 0,
            outputTokens: 0,
            status: 'incomplete',
            note: incompleteNote,
          })
          break
        }

        // Anything other than a finished turn is not an attempt at the
        // question: 'max_tokens' is a cut-off response, 'refusal' a declined
        // one. Both would otherwise be graded as wrong answers.
        if (response.stopReason && response.stopReason !== 'end_turn') {
          incompleteNote = `stopped with '${response.stopReason}'`
          results.push({
            modelId,
            question: example.input,
            answer: response.text,
            expected: example.expected,
            pass: false,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            status: 'incomplete',
            note: incompleteNote,
          })
          break
        }

        // Graded by whatever scorer was handed in — swappable without
        // touching the loop, same pattern as the provider
        const passed = await scorer.score(response.text, example.expected)

        if (!passed) failures++

        results.push({
          modelId,
          question: example.input,
          answer: response.text,
          expected: example.expected,
          pass: passed,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          status: 'graded',
        })

        // Stop once this model mathematically can't reach the pass bar —
        // e.g. 50 questions at 90% allows 5 misses; break on the 6th
        if (failures > allowedFailures) break   
      }

        // Resolve the ticker into a permanent line — green if it survived,
        // red if it failed early; \n releases the line for the next model
        const outcome = incompleteNote
          ? 'incomplete'
          : questionCount === dataset.length
            ? 'complete'
            : 'early_stop'

        progress.onModelDone?.(tier, outcome, {
          questionsRun: questionCount,
          total: dataset.length,
          note: incompleteNote,
        })
    }
  return results
}
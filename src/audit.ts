import type { ModelProvider } from './providers/provider.js'
import type { GoldenExample } from './golden-dataset/schema.js';
import chalk from 'chalk'
import type { Scorer } from './scorers/scorer.js';

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

// Matches by substring, so it only recognizes opus/sonnet/haiku today.
// Falls back to 'haiku' for anything else — display label only, doesn't
// affect grading or cost, but will mislabel a future 4th tier (see roadmap).
const getTierName = (modelId: string):string => {
  if (modelId.includes('opus')) return 'opus'
  if (modelId.includes('sonnet')) return 'sonnet'
  return 'haiku'
}

// barWidth is capped so the bar can't wrap in narrow terminals
const renderProgress = (tier: string, current: number, total:number, barWidth = 20) => {
  const percentage = Math.min(1, Math.max(0, current / total))
  const filledLength = Math.round(barWidth * percentage)
  const emptyLength = barWidth - filledLength

  const bar = '█'.repeat(filledLength) + chalk.dim('░'.repeat(emptyLength))
  // \x1b[K clears from cursor to end of line, avoiding hardcoded spaces
  process.stdout.write(
    chalk.bold.cyan(`\r Auditing ▷ ${tier} ${bar} ${current}/${total}\x1b[K`),
  );
}

export const runAudit = async (
  provider: ModelProvider, 
  dataset: GoldenExample[], 
  prompt: string, 
  modelIds: string[],
  passBar: number, // a fraction, 0–1 (cli converts from the 0–100 flag)
  scorer: Scorer
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

        renderProgress(tier, questionCount, dataset.length)

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
        const completedAll = questionCount === dataset.length && !incompleteNote;
        const statusMsg = incompleteNote
        ? chalk.yellow(`\r ! ${tier} incomplete — ${incompleteNote}\x1b[K\n`)
        : completedAll
        ? chalk.green(`\r ✓ ${tier} audited — ${dataset.length} questions\x1b[K\n`)
        : chalk.red(`\r ✗ ${tier} failed — stopped at question ${questionCount}\x1b[K\n`);
      process.stdout.write(statusMsg);
    }
  return results
}
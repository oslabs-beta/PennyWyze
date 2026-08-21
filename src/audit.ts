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
}

//Helper: Extract tier name cleanly for progress display
const getTierName = (modelId: string):string => {
  if (modelId.includes('opus')) return 'opus'
  if (modelId.includes('sonnet')) return 'sonnet'
  return 'haiku'
}

// Helper: Draw live progress bar ticker (Capped width to prevent terminal wrapping)
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

  // Calculate max allowed failures once per audit run
  const allowedFailures = Math.floor(dataset.length * (1 - passBar))

    for(const modelId of modelIds){
      // tier name only for display
      const tier = getTierName(modelId)

      let questionCount = 0 // resets per model — each tier's progress reads 1/N fresh
      let failures = 0 // counts this model's misses — early stopping compares it to the bar

      for(const example of dataset){
        questionCount++

        renderProgress(tier, questionCount, dataset.length)

        const response = await provider.run(modelId, prompt, example.input);

        //graded by whatever scorer was handed in — swappable without
        //touching the loop, same pattern as the provider
        const passed = await scorer.score(response.text, example.expected)

        if (!passed) failures++

        results.push({
          modelId,
          question: example.input,
          answer: response.text,
          expected: example.expected,
          pass: passed,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens
        })

        //stop once this model mathematically can't reach the pass bar —
        //e.g. 50 questions at 90% allows 5 misses; break on the 6th
        if (failures > allowedFailures) break   
      }

        //resolve the ticker into a permanent line — green if it survived,
        //red if it failed early; \n releases the line for the next model
        const completedAll = questionCount === dataset.length;
        const statusMsg = completedAll
        ? chalk.green(`\r ✓ ${tier} audited — ${dataset.length} questions\x1b[K\n`)
        : chalk.red(`\r ✗ ${tier} failed — stopped at question ${questionCount}\x1b[K\n`);
      process.stdout.write(statusMsg);
    }
  return results
}
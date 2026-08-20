import type { ModelProvider } from './providers/provider.js'
import type { GoldenExample } from './golden-dataset/schema.js';
import chalk from 'chalk'

export type AuditResult = {
  modelId: string;
  question: string;
  answer: string;
  expected: string;
  pass: boolean;
  inputTokens: number;
  outputTokens: number;
}


export const runAudit = async (
  provider: ModelProvider, 
  dataset: GoldenExample[], 
  prompt: string, 
  modelIds: string[]
): Promise<AuditResult[]> => {
  const results: AuditResult[] = []

  for(const modelId of modelIds){
    // tier name only for display — full IDs (esp. haiku's dated one) overflow a ticker line
    const tier = modelId.includes('opus') ? 'opus' : modelId.includes('sonnet') ? 'sonnet' : 'haiku'

    let questionCount = 0 // resets per model — each tier's progress reads 1/N fresh

    for(const example of dataset){
      questionCount++

      // visual bar: filled blocks for done, dim for remaining
      const bar = '█'.repeat(questionCount) + chalk.dim('░'.repeat(dataset.length - questionCount))

      // \r repaints the same line instead of stacking logs — a live ticker.
      // written BEFORE the call so the user sees what they're waiting on.
      // trailing spaces paint over leftovers when tier names change length
      process.stdout.write(chalk.bold.cyan(`\r Auditing ▷ ${tier} ${bar} ${questionCount}/${dataset.length}   `))

      const response = await provider.run(modelId, prompt, example.input);

      //naive check on purpose — real grading is Milestone 2; it wrongly
      //failing the fake's quoted answer is expected, don't fix here
      const passed = response.text === example.expected;

      const result: AuditResult = {
        modelId,
        question: example.input,
        answer: response.text,
        expected: example.expected,
        pass: passed,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens
      }
      results.push(result)
    }

    // model finished — resolve the ticker into a permanent green line;
    // the \n releases it so the next model's ticker starts fresh below
    process.stdout.write(chalk.green(`\r ✓ ${tier} audited — ${dataset.length} questions      \n`))
  }

  return results
}
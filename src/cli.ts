import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import chalk from 'chalk';

import { loadGoldenDataset } from './golden-dataset/load-golden-dataset.js';
import { runAudit, type AuditResult } from './audit.js';
import { printReport } from './report.js';
import { fakeProvider } from './providers/fake-provider.js';
import { anthropicProvider } from './providers/anthropic-provider.js';
import { ANTHROPIC_MODELS } from './providers/anthropic-models.js';
import { costOfCall } from './cost/calculator.js';
import { exactMatchScorer } from './scorers/exact-match-scorer.js';

const program = new Command();
const MODEL_IDS = Object.values(ANTHROPIC_MODELS).map(model => model.id);

//Load prompt file and strip invisible control characters & BOM markers
const loadAndSanitizePrompt = (filePath: string): string => {
  if (!existsSync(filePath)) {
    throw new Error(`Prompt file not found: '${filePath}'`);
  }

  const raw = readFileSync(filePath, 'utf8')

  // Strip UTF-8 BOM (\uFEFF) and zero-width spaces/joiners (\u200B-\u200D)
  const sanitized = raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  if (!sanitized.trim()) {
    throw new Error(`Prompt file '${filePath}' contains no readable text.`);
  }

  return sanitized;
}
//Helper: Calculate total execution cost for a set of audit results
const calculateResultsCost = (results: AuditResult[]): number => {
  return results.reduce((sum, result) => {
    const model = Object.values(ANTHROPIC_MODELS).find(m => m.id === result.modelId)!;
    return (
      sum +
      costOfCall(
        result.inputTokens,
        result.outputTokens,
        model.inputPrice,
        model.outputPrice,
      )
    );
  }, 0);
};

// Helper: Save unique failed examples for grader testing
// capture real misses as grader fixtures — dedupe against what's already saved
const saveMissFixtures = (misses: AuditResult[]): void => {
  if (misses.length === 0) return;

  const fixturesDir = 'tests/scorers/fixtures';
  if (!existsSync(fixturesDir)) mkdirSync(fixturesDir, { recursive: true });

  const filePath = `${fixturesDir}/real-misses.jsonl`;
  const existingLines = existsSync(filePath)
    ? readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean)
    : [];

  const newLines = misses.map(m =>
    JSON.stringify({ answer: m.answer, expected: m.expected }),
  );
  const allLines = [...new Set([...existingLines, ...newLines])];

  writeFileSync(filePath, allLines.join('\n') + '\n');
};

//the audit command — its name, flags, description, and receiving function
program
  .name('pennywyze')
  .command('audit')
  .description(
    'Benchmark Claude tiers against your golden dataset to return the lowest-cost passing model with projected monthly savings',
  )
  .requiredOption('--prompt <filepath>', 'path to your prompt file')
  .requiredOption('--dataset <filepath>', 'path to your golden dataset file')
  .option(
    '--volume <message-count>',
    'number of messages your AI feature handles per month',
    '100000',
  )
  .option('--fake', 'use the FakeProvider instead of calling the real API')
  .option(
    '--pass-rate <percentage>',
    'minimum pass rate required, 0-100',
    '100',
  )
  .action(async options => {
    //Validate CLI input arguments
    //Convert flags from text into numbers - everything typed in a terminal arrives as a string
    const volume = Number(options.volume);
    if (Number.isNaN(volume) || volume <= 0){
      return program.error('Error: Volume must be a positive number.');
    }

    const passRate = Number(options.passRate);
    if (Number.isNaN(passRate) || passRate < 1 || passRate > 100){
      return program.error('Error: Pass rate must be a number between 1 and 100.');
    }
    const passBar = passRate / 100;

    // Load dataset and provider cleanly inside an error-handling boundary
    let prompt: string
    let dataset: ReturnType<typeof loadGoldenDataset>

    try {
      // Prompt & dataset loaders throw descriptive errors for missing files, empty files, or invalid JSON lines
      // Load prompt and dataset cleanly with file existence, non-empty, and sanitization checks
      prompt = loadAndSanitizePrompt(options.prompt);
      dataset = loadGoldenDataset(options.dataset);
    } catch (err:any) {
      // Intercept errors and print clean CLI messages without leaking Node stack traces
      return program.error(`Error: ${err.message}`)
    }

    const provider = options.fake ? fakeProvider : anthropicProvider;

    // Execute audit loop
    // Helper to restore terminal cursor on exit or signal
    const restoreCursor = () => {
      process.stdout.write('\x1b[?25h')
    }

    // Listen for Ctrl+C so the cursor is restored before exiting
    process.on('SIGINT', () => {
      restoreCursor(); // 1. Turn the cursor back on (\x1b[?25h)
      process.stdout.write('\n'); // 2. Drop to a new line
      process.exit(130); // 3. Stop the program immediately
    })

    let results: AuditResult[]

    try {
      // Hide cursor ONCE at the start of execution
      process.stdout.write('\x1b[?25l')

      results = await runAudit(
        provider,
        dataset,
        prompt,
        MODEL_IDS,
        passBar, // passBar (as a fraction) travels into the loop — early stopping needs it for its can-this-model-still-recover math.
        exactMatchScorer,
      );
    } catch (err: any) {
      restoreCursor(); // Ensure cursor is back before exiting

      // Catch network failures or timeouts cleanly
      const isNetworkOrTimeout = 
        err.name === 'APIConnectionError' || 
        err.name === 'APIConnectionTimeoutError' ||
        err.message?.toLowerCase().includes('timeout') ||
        err.message?.toLowerCase().includes('timed out');

      if (isNetworkOrTimeout) {
        return program.error('Error: Could not connect to Anthropic API. Check your network connection.');
      }

      // Tells TypeScript: execution stops here for any other error
      return program.error(`Error: ${err.message}`);
    } finally {
      // GUARANTEED Cleanup: Always restore cursor on success, error, or early return
      restoreCursor();
    }

    // console.log(results)
    
    // Summarize per-model performance
    // The bridge between the loop and the report.
    // One row per model: pile its records, count passes, build the row.
    // passed = met the user's pass bar (default 100)
    const summaries = MODEL_IDS.map(modelId => {
      const records = results.filter(r => r.modelId === modelId);
      const passes = records.filter(r => r.pass).length;
      const isEarlyStopped = records.length < dataset.length

      const score = isEarlyStopped
        ? `${passes}/${dataset.length} ${chalk.dim('(stopped)')}`
        : `${passes}/${dataset.length}`

      const model = Object.values(ANTHROPIC_MODELS).find(
        model => model.id === modelId,
      )!;

      const totalCost = calculateResultsCost(records)
      const averageCostPerCall = totalCost / records.length;
      const monthlyCost = averageCostPerCall * volume;

      const misses = records
        .filter(r => !r.pass)
        .map(r => ({
          input: r.question,
          answer: r.answer,
          expected: r.expected,
        }));

      return {
        name: modelId,
        score,
        monthlyCost,
        passed: passes / records.length >= passBar,
        misses,
      };
    });
  
    // Calculate total audit cost and save real-miss fixtures
    const auditCost = calculateResultsCost(results);
    if (!options.fake) {
      saveMissFixtures(results.filter(r => !r.pass));
    }

    // Render final CLI report
    printReport(summaries, auditCost, dataset.length);
  });

//everything above only describes the command — parse reads what was typed and acts on it
program.parse();

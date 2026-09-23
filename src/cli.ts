#!/usr/bin/env node

import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
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
// Derived from ANTHROPIC_MODELS so prices and IDs never drift out of sync.
// Object key order (opus, sonnet, haiku) is preserved here — that's why the
// report always prints in that order, without anyone sorting it explicitly.
const MODEL_IDS = Object.values(ANTHROPIC_MODELS).map(model => model.id);

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

// Opt-in only, via --capture-misses. Writes solely to the path the user named —
// never to a path we pick, because a relative default lands in whatever directory
// the command happened to be run from, which for an installed CLI is someone
// else's repo.
const saveMissFixtures = (misses: AuditResult[], filePath: string): void => {
  if (misses.length === 0) return;

  const dir = dirname(filePath);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Merge with whatever is already there so repeated runs accumulate
  // distinct misses instead of overwriting the file each time.
  const existingLines = existsSync(filePath)
    ? readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean)
    : [];

  const newLines = misses.map(m =>
    JSON.stringify({ answer: m.answer, expected: m.expected }),
  );
  const allLines = [...new Set([...existingLines, ...newLines])];

  writeFileSync(filePath, allLines.join('\n') + '\n');
};

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
  .option(
    '--capture-misses <filepath>',
    'append wrong answers to this file as grader fixtures',
  )
  .action(async options => {
    // Convert flags from text into numbers — everything typed in a terminal arrives as a string
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
      // Loaders throw descriptive errors for missing files, empty files, or invalid JSON lines
      prompt = loadAndSanitizePrompt(options.prompt);
      dataset = loadGoldenDataset(options.dataset);
    } catch (err:any) {
      // Intercept errors and print clean CLI messages without leaking Node stack traces
      return program.error(`Error: ${err.message}`)
    }

    const provider = options.fake ? fakeProvider : anthropicProvider;

    const restoreCursor = () => {
      process.stdout.write('\x1b[?25h')
    }

    // Listen for Ctrl+C so the cursor is restored before exiting
    process.on('SIGINT', () => {
      restoreCursor(); // 1. Turn the cursor back on (\x1b[?25h)
      process.stdout.write('\n'); 
      process.exit(130); 
    })

    let results: AuditResult[]

    try {
      // Hides the cursor for the whole run; restoreCursor() in the finally block below brings it back
      process.stdout.write('\x1b[?25l')

      results = await runAudit(
        provider,
        dataset,
        prompt,
        MODEL_IDS,
        passBar, // as a fraction — early stopping needs it to know if a model can still recover
        exactMatchScorer,
      );
    } catch (err: any) {
      restoreCursor(); 

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
      // Runs no matter how the try block exits — success, error, or the early return above
      restoreCursor();
    }
    
    // Bridge between the audit loop and the report: one row per model,
    // built by filtering this model's records out of the flat results list.
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
    const auditCost = calculateResultsCost(results);
    if (options.captureMisses) {
      saveMissFixtures(
        results.filter(r => !r.pass),
        options.captureMisses,
      );
    }
    printReport(summaries, auditCost, dataset.length);
  });

// Everything above only describes the command — parse() reads what was typed and acts on it
program.parse();

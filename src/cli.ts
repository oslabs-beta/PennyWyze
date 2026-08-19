import { Command } from "commander"
import { loadGoldenDataset } from "./golden-dataset/load-golden-dataset.js";
import { runAudit } from "./audit.js";
import { fakeProvider } from "./providers/fake-provider.js";
import { printReport } from "./report.js";
import { readFileSync } from "fs";
import { anthropicProvider } from './providers/anthropic-provider.js'

const program = new Command();

const MODEL_IDS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001']

program.name('pennywyze');


//the audit command — its name, flags, description, and receiving function
program.command('audit')
  .description('Benchmark Claude tiers against your golden dataset to return the lowest-cost passing model with projected monthly savings')
  .requiredOption('--prompt <filepath>', 'path to your prompt file')
  .requiredOption('--dataset <filepath>', 'path to your golden dataset file')
  .option('--volume <message-count>', 'number of messages your AI feature handles per month', '100000')
  .option('--fake', 'use the FakeProvider instead if calling the real API')
  .action(async (options)=>{
    //convert volume from text into a number — everything typed in a terminal arrives as a string
    const volume = Number(options.volume);
    if(Number.isNaN(volume) || volume <= 0) return program.error('Volume must be a positive number');
    
    const prompt = readFileSync(options.prompt, 'utf8')
    const dataset = loadGoldenDataset(options.dataset);

    const provider = options.fake ? fakeProvider : anthropicProvider

    const results = await runAudit(provider, dataset, prompt, MODEL_IDS)

    // SUMMARIZE — the bridge between the loop and the report.
    // runAudit returned 15 records (3 models × 5 questions, one per call),
    // but printReport wants 3 rows — one per MODEL: name, score, cost, passed.
    // For each model: grab its 5 records → count its passes → build its row.
    // monthlyCost is hardcoded 0 tonight — real money math is a Milestone 2 ticket.
    // passed = passed EVERYTHING (100% bar for now).
    const summaries = MODEL_IDS.map(modelId => {
      const records = results.filter(r => r.modelId === modelId)
      const passes = records.filter(r => r.pass).length

      const misses = records
        .filter(r => !r.pass)
        .map(r => {
          const example = dataset.find(ex => ex.input === r.question)
          return { input: r.question, answer: r.answer, expected: example?.expected ?? "" }
        })
        
      return {
        name: modelId,
        score: `${passes}/${records.length}`,
        monthlyCost: 0,
        passed: passes === records.length,
        misses
      }
    })

    printReport(summaries)

  });

//everything above only describes the command — parse reads what was typed and acts on it
program.parse();
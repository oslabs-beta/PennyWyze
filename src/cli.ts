import "dotenv/config"
import { Command } from "commander"
import { loadGoldenDataset } from "./golden-dataset/load-golden-dataset.js";
import { runAudit } from "./audit.js";
import { fakeProvider } from "./providers/fake-provider.js";
import { printReport } from "./report.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
  .option('--fake', 'use the FakeProvider instead of calling the real API')
  .option('--pass-rate <percentage>', 'minimum pass rate required, 0-100', '100')
  .action(async (options)=>{
    //convert flags from text into numbers — everything typed in a terminal arrives as a string
    const volume = Number(options.volume);
    if(Number.isNaN(volume) || volume <= 0) return program.error('Volume must be a positive number');

    const passRate = Number(options.passRate);
    if(Number.isNaN(passRate) || passRate < 1 || passRate > 100) return program.error('Pass rate must be a number between 1 and 100');
    const passBar = passRate / 100

    const prompt = readFileSync(options.prompt, 'utf8')
    const dataset = loadGoldenDataset(options.dataset);

    const provider = options.fake ? fakeProvider : anthropicProvider

    // passBar (as a fraction) travels into the loop — early stopping needs it for its can-this-model-still-recover math.
    // can-this-model-still-recover math
    const results = await runAudit(provider, dataset, prompt, MODEL_IDS, passBar)

    // SUMMARIZE — the bridge between the loop and the report.
    // One row per model: pile its records, count passes, build the row.
    // monthlyCost stays 0 until the real money ticket lands.
    // passed = met the user's pass bar (default 100)
    const summaries = MODEL_IDS.map(modelId => {
      const records = results.filter(r => r.modelId === modelId)
      const passes = records.filter(r => r.pass).length

      const misses = records
        .filter(r => !r.pass)
        .map(r => ({ input: r.question, answer: r.answer, expected: r.expected }))

      return {
        name: modelId,
        score: `${passes}/${records.length}`,
        monthlyCost: 0,
        passed: (passes / records.length) >= passRate / 100,
        misses
      }
    })

    // capture real misses as grader fixtures — dedupe against what's already saved
    if (!options.fake) {
      const misses = results.filter((r) => !r.pass)
      if (misses.length > 0) {
        const fixturesDir = "tests/scorers/fixtures"
        if (!existsSync(fixturesDir)) mkdirSync(fixturesDir, { recursive: true})

        const filePath = `${fixturesDir}/real-misses.jsonl`;
        const existingLines = existsSync(filePath)
          ? readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean)
          : []
        const newLines = misses.map((m) => JSON.stringify({ answer: m.answer, expected: m.expected}))
        const allLines = [...new Set([...existingLines, ...newLines])]
        writeFileSync(filePath, allLines.join("\n") + "\n")
      }
    }

    printReport(summaries)
  });

//everything above only describes the command — parse reads what was typed and acts on it
program.parse();
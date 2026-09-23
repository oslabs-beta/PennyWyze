import Table from 'cli-table3';
import chalk from 'chalk';

import type { ModelSummary } from './summarize.js';

// Formatting lives here, not in summarize() — the summary carries counts,
// this turns them into the "48/50 (stopped)" the table shows.
const formatScore = (model: ModelSummary): string =>
  model.stopped
    ? `${model.passes}/${model.total} ${chalk.dim('(stopped)')}`
    : `${model.passes}/${model.total}`;

export const printReport = (models: ModelSummary[], auditCost: number, datasetSize: number) => {
  console.log('\n' + chalk.bold.cyan('  PENNYWYZE AUDIT REPORT'))

  const table = new Table({
    head: ['MODEL', 'ACCURACY', 'EST. COST / MO'],
    colAligns: ['left', 'center', 'right'],
    style: { 
      head: ['bold', 'white'] ,
      border: ['dim']
    },
  });

  for (const model of models) {
    const statusTag = model.passed
      ? chalk.green.bold('PASS') 
      : chalk.red.bold('FAIL')

      table.push([
        chalk.white(model.name),
        `${formatScore(model)} ${statusTag}`,
        `$${model.monthlyCost.toFixed(2)} / mo`
      ])
  }

  console.log(table.toString() + '\n');

  const failedModels = models.filter(m => m.misses.length > 0)

  if (failedModels.length > 0) {
    console.log(chalk.bold.red('  FAILED TEST DETAILS'))
    console.log(chalk.dim('-'.repeat(55)))

    for (const model of failedModels) {
      console.log(`\n ${chalk.yellow('●')} ${chalk.bold(model.name)}`)

      model.misses.forEach((miss, index) => {
        const isLast = index === model.misses.length - 1
        const branch = isLast ? '└─' : '├─' // connector shown before this line
        const pipe = isLast ? '  ' : '│ ' // vertical continuation for the lines below
        const MAX_LENGTH = 60; // Set your preferred character cap

        // Only truncate if strictly longer than MAX_LENGTH, so a line at
        // exactly the cap isn't needlessly cut.
        const cleanInput = miss.input.length > MAX_LENGTH
          ? `${miss.input.slice(0, MAX_LENGTH - 3)}...`
          : miss.input

        console.log(chalk.dim(`   ${branch} Input:    `) + `"${cleanInput}"`)
        console.log(chalk.dim(`   ${pipe} Received: `) + chalk.red(JSON.stringify(miss.answer)))
        console.log(chalk.dim(`   ${pipe} Expected: `) + chalk.green(`"${miss.expected}"`))

        // Blank line between misses for readability, skipped after the last one
        if (!isLast) console.log(chalk.dim(`   │`))
      })
    console.log('\n' + chalk.dim('-'.repeat(55)) + '\n')
    }
  }

  // Only ever recommend a model that passed — a cheap wrong answer must never win
  const passed = models.filter(model => model.passed)
  const cheapest = passed.sort((a,b) => a.monthlyCost - b.monthlyCost)[0]

  // Savings compare against whichever model actually cost the most this
  // run, not a hardcoded tier — matters once more than three tiers exist.
  const maxCost = Math.max(...models.map(m => m.monthlyCost))
  const savings = cheapest ? maxCost - cheapest.monthlyCost : 0

  // Two ways there is nothing to switch to: nothing passed at all, or the
  // only passing model IS the priciest one, which nets zero. Both are
  // legitimate outcomes, not errors — the user is already on the cheapest
  // tier that meets their bar.
  if (!cheapest || savings <= 0) {
    console.log(
      chalk.bgRed.black.bold(' VERDICT ') +
      ' ' +
      chalk.bold('No cheaper model meets quality criteria.')
    )
    console.log(chalk.dim('  You are currently on the optimal pricing tier.'))
  } else {
    console.log(
      chalk.bgGreen.black.bold(' VERDICT ') +
      ` Switch to ${chalk.bold.cyan(cheapest.name)} - save ~$${savings.toFixed(2)}/mo.`
    )
  }

  console.log()
  if (datasetSize < 30) {
    console.log(chalk.yellow(`  ⚠ Small dataset: only ${datasetSize} examples tested (30+ recommended for statistical confidence).`))
  }
  console.log(chalk.bold(`  ℹ Audit cost: $${auditCost.toFixed(2)}\n`))
};

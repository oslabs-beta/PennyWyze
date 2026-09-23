import Table from 'cli-table3';
import chalk from 'chalk';

import type { ModelSummary } from './summarize.js';

// Formatting lives here, not in summarize() — the summary carries counts,
// this turns them into the "48/50 (stopped)" the table shows.
const formatScore = (model: ModelSummary): string => {
  const score = `${model.passes}/${model.total}`;
  if (model.incomplete > 0) return `${score} ${chalk.dim('(incomplete)')}`;
  if (model.stopped) return `${score} ${chalk.dim('(stopped)')}`;
  return score;
};

export const printReport = (
  models: ModelSummary[],
  auditCost: number,
  datasetSize: number,
  /**
   * The model the user is paying for today, from --current. Savings are
   * measured against it. Without it there is no way to know what the user
   * actually runs, so the priciest tier audited stands in — which overstates
   * savings for anyone not already on that tier.
   */
  currentModelId?: string,
) => {
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
      : model.incomplete > 0
        ? chalk.yellow.bold('N/A')
        : chalk.red.bold('FAIL')

      table.push([
        chalk.white(model.name),
        `${formatScore(model)} ${statusTag}`,
        `$${model.monthlyCost.toFixed(2)} / mo`
      ])
  }

  console.log(table.toString() + '\n');

  // Called out explicitly: an N/A row is missing data, not a quality failure,
  // and it is excluded from the verdict rather than counted as a loss.
  const incompleteModels = models.filter(m => m.incomplete > 0);
  if (incompleteModels.length > 0) {
    for (const model of incompleteModels) {
      console.log(
        chalk.yellow(`  ! ${model.name}: `) +
          `${model.incomplete} call${model.incomplete === 1 ? '' : 's'} did not complete — not eligible for the verdict.`,
      );
    }
    console.log();
  }

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

  // The baseline savings are measured against. --current names what the user
  // actually pays for today, which is the only honest comparison. Falling back
  // to the priciest tier audited keeps the old behaviour, but it overstates
  // savings for anyone not already on that tier — hence the note below.
  const current = currentModelId
    ? models.find(model => model.name === currentModelId)
    : undefined
  const baselineCost = current
    ? current.monthlyCost
    : Math.max(...models.map(m => m.monthlyCost))
  const savings = cheapest ? baselineCost - cheapest.monthlyCost : 0

  // Two ways there is nothing to switch to: nothing passed at all, or the
  // cheapest passing model is not actually cheaper than the baseline, which
  // nets zero or less. Both are legitimate outcomes, not errors — the user is
  // already on the cheapest tier that meets their bar.
  if (!cheapest || savings <= 0) {
    console.log(
      chalk.bgRed.black.bold(' VERDICT ') +
      ' ' +
      chalk.bold('No cheaper model meets quality criteria.')
    )
    console.log(chalk.dim('  You are currently on the optimal pricing tier.'))
  } else {
    const against = current ? ` vs ${current.name}` : ''
    console.log(
      chalk.bgGreen.black.bold(' VERDICT ') +
      ` Switch to ${chalk.bold.cyan(cheapest.name)} - save ~$${savings.toFixed(2)}/mo${against}.`
    )
    if (!current) {
      console.log(
        chalk.dim(
          '  Measured against the most expensive tier audited. Pass --current <model> for savings against what you pay today.',
        ),
      )
    }
  }

  console.log()
  if (datasetSize < 30) {
    console.log(chalk.yellow(`  ⚠ Small dataset: only ${datasetSize} examples tested (30+ recommended for statistical confidence).`))
  }
  console.log(chalk.bold(`  ℹ Audit cost: $${auditCost.toFixed(2)}\n`))
};

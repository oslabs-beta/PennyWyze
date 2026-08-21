import Table from 'cli-table3';
import chalk from 'chalk';

type ModelSummary = {
  name: string;
  score: string;
  monthlyCost: number;
  passed: boolean;
  misses: { input: string; answer: string; expected: string }[];
};

export const printReport = (models: ModelSummary[], auditCost: number, datasetSize: number) => {
  // Header Banner
  console.log('\n' + chalk.bold.cyan('  PENNYWYZE AUDIT REPORT'))

  // Main Comparison Table 
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
        `${model.score} ${statusTag}`,
        `$${model.monthlyCost.toFixed(2)} / mo`
      ])
  }

  console.log(table.toString() + '\n');

  // Failure Diagnostics / Misses (Structured tree view)
  const failedModels = models.filter(m => m.misses.length > 0)

  if (failedModels.length > 0) {
    console.log(chalk.bold.red('  FAILED TEST DETAILS'))
    console.log(chalk.dim('-'.repeat(55)))

    for (const model of failedModels) {
      console.log(`\n ${chalk.yellow('●')} ${chalk.bold(model.name)}`)

      model.misses.forEach((miss, index) => {
        const isLast = index === model.misses.length - 1
        const branch = isLast ? '└─' : '├─' // Main node connector
        const pipe = isLast ? '  ' : '│ ' // Continuous vertical line for child items

        const MAX_LENGTH = 60; // Set your preferred character cap

        // Clean truncating to prevent multi-line breaks on long input strings
        // Only cut and append dots if the text is strictly longer than MAX_LENGTH
        const cleanInput = miss.input.length > MAX_LENGTH
          ? `${miss.input.slice(0, MAX_LENGTH - 3)}...`
          : miss.input

        // Each property line explicitly reuses the tree connector
        console.log(chalk.dim(`   ${branch} Input:    `) + `"${cleanInput}"`)
        console.log(chalk.dim(`   ${pipe} Received: `) + chalk.red(JSON.stringify(miss.answer)))
        console.log(chalk.dim(`   ${pipe} Expected: `) + chalk.green(`"${miss.expected}"`))

        // Add a blank connecting line between items (except after the last item)
        if (!isLast) console.log(chalk.dim(`   │`))
      })
    console.log('\n' + chalk.dim('-'.repeat(55)) + '\n')
    }
  }

  // Reccomendation Verdict & Audit Notes
  const passed = models.filter(model => model.passed)
  const cheapest = passed.sort((a,b) => a.monthlyCost - b.monthlyCost)[0]

  if (!cheapest) {
    console.log(
      chalk.bgRed.black.bold(' VERDICT ') + 
      ' ' +
      chalk.bold('No cheaper model meets quality criteria.')
    )
    console.log(chalk.dim('  You are currently on the optimal pricing tier.'))
  } else {
    // Dynamically derive the most expensive model by monthly cost
    const maxCost = Math.max(...models.map(m => m.monthlyCost))
    const savings = maxCost - cheapest.monthlyCost

    console.log(
      chalk.bgGreen.black.bold(' VERDICT ') +
      ` Switch to ${chalk.bold.cyan(cheapest.name)} - save ~$${savings.toFixed(2)}/mo.`
    )
  }

  // Footer Metadata
  console.log()
  if (datasetSize < 30) {
    console.log(chalk.yellow(`  ⚠ Small dataset: only ${datasetSize} examples tested (30+ recommended for statistical confidence).`))
  }
  console.log(chalk.bold(`  ℹ Audit cost: $${auditCost.toFixed(2)}\n`))
};

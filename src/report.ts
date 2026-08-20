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
  const pass = chalk.green('PASS');
  const fail = chalk.red('FAIL');
  const table = new Table({
    head: ['MODEL', 'ACCURACY', 'COST / MONTH'],
    style: { head: ['cyan'] },
  });

  for (let i = 0; i < models.length; i++) {
    const accuracy = models[i]?.passed ? pass : fail;

    table.push([
      models[i]?.name,
      `${models[i]?.score} ${accuracy}`,
      `$${models[i]?.monthlyCost.toFixed(2)} / mo`,
    ]);
  }

  console.log(table.toString());

  for (const model of models) {
    if (!model.passed && model.misses.length > 0) {
      console.log(chalk.red(`\n${model.name} missed:`));
      for (const miss of model.misses) {
        console.log(` Input: "${miss.input}"`);
        console.log(` Got: ${JSON.stringify(miss.answer)}`);
        console.log(` Expected: "${miss.expected}"\n`);
      }
    }
  }

  const passed = models.filter(model => model.passed);
  const cheapest = passed.sort((a, b) => a.monthlyCost - b.monthlyCost)[0];

  if (!cheapest) {
    console.log('No cheaper model meets quality - youre not overpaying.')
    if (datasetSize < 30) {
      console.log(chalk.yellow(`Note: only ${datasetSize} examples tested, verdicts are more reliable with 30+.`))
    }
    console.log(`This audit cost $${auditCost.toFixed(2)}.`);
    return;
  }

  //models[0] assumes the most expensive model arrives first (true for now).
  //TODO: derive by price (max monthlyCost) once real, order-independent results flow.
  //?? cheapest satisfies the strict index check — never fires with a non-empty list.
  const mostExpensive = models[0] ?? cheapest;
  const savings = mostExpensive.monthlyCost - cheapest.monthlyCost;

  console.log(
    `VERDICT  Switch to ${cheapest.name}, same accuracy, save ~$${savings.toFixed(2)}/mo.`,
  );
  console.log(`This audit cost $${auditCost.toFixed(2)}.`);
};

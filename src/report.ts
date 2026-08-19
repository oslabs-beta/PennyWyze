import Table from "cli-table3"
import chalk from "chalk"

type ModelSummary =  {
  name: string;
  score: string;
  monthlyCost: number;
  passed: boolean;
  misses: { input:string; answer:string; expected:string}[];
} 

// const fakeModels:ModelSummary[] = [
//   {
//     name: "Opus",
//     score: "50/50",
//     monthlyCost: 325,
//     passed: true
//   },
//   {
//     name: "Sonnet",
//     score: "50/50",
//     monthlyCost: 195,
//     passed: true
//   },
//   {
//     name: "Haiku",
//     score: "46/50",
//     monthlyCost: 65,
//     passed: false
//   }
// ]

export const printReport = (models: ModelSummary[]) => {
  const pass = chalk.green("PASS")
  const fail = chalk.red("FAIL")
  const table = new Table({head: ["MODEL", "ACCURACY", "COST / MONTH"],
    style: { head: ["cyan"] }
  })


  for ( let i = 0; i < models.length; i++) {
    const accuracy = models[i]?.passed ? pass : fail

    table.push([ models[i]?.name, `${models[i]?.score} ${accuracy}`, `$${models[i]?.monthlyCost} / mo`])
  }

  console.log(table.toString())

  for (const model of models) {
    if (!model.passed && model.misses.length > 0) {
      console.log(chalk.red(`\n${model.name} missed:`))
      for (const miss of model.misses) {
        console.log(` Input: "${miss.input}"`)
        console.log(` Got: ${JSON.stringify(miss.answer)}`)
        console.log(` Expected: "${miss.expected}"\n`)
      }
    }
  }

  const passed = models.filter(model => model.passed)
  const cheapest = passed.sort((a,b) => a.monthlyCost - b.monthlyCost)[0]

  if (!cheapest) {
    console.log("No cheaper model meets quality - youre not overpaying.")
    return
  }

  // TODO: mostExpensive assumes array order (Opus first), fine with hardcoded
  // data, revisit once wired to real, order-independent results
  const mostExpensive = models[0]
  const savings = mostExpensive!.monthlyCost - cheapest.monthlyCost

  console.log(`VERDICT  Switch to ${cheapest.name}, same accuracy, save ~$${savings}/mo.`);
}
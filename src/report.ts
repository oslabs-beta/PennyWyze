import Table from "cli-table3"
import chalk from "chalk"

type FakeModel =  {
  name: string;
  score: string;
  monthlyCost: number;
  passed: boolean;
} 

const fakeModels:FakeModel[] = [
  {
    name: "Opus",
    score: "50/50",
    monthlyCost: 325,
    passed: true
  },
  {
    name: "Sonnet",
    score: "50/50",
    monthlyCost: 195,
    passed: true
  },
  {
    name: "Haiku",
    score: "50/50",
    monthlyCost: 65,
    passed: true
  }
]

export const printReport = (models: FakeModel[]) => {
  const pass = chalk.green("PASS")
  const fail = chalk.red("FAIL")
  const table = new Table({head: ["MODEL", "ACCURACY", "COST / MONTH"]})


  for ( let i = 0; i < models.length; i++) {
    const accuracy = models[i]?.passed ? pass : fail

    table.push([ models[i]?.name, `${models[i]?.score} ${accuracy}`, `$${models[i]?.monthlyCost} / mo`])
  }

  const passed = models.filter(model => model.passed)
  const cheapest = passed.sort((a,b) => a.monthlyCost - b.monthlyCost)[0]
  const mostExpensive = models[0]
  const savings = mostExpensive.monthlyCost - cheapest.monthlyCost

  console.log(table.toString())
  console.log(`VERDICT  Switch to ${cheapest.name}, same accuracy, save ~$${savings}/mo.`);
}

printReport(fakeModels)
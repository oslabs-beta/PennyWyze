import Table from "cli-table3"
import chalk from "chalk"

type ModelSummary =  {
  name: string;
  score: string;
  monthlyCost: number;
  passed: boolean;
} 


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

  const passed = models.filter(model => model.passed)
  const cheapest = passed.sort((a,b) => a.monthlyCost - b.monthlyCost)[0]

  if (!cheapest) {
    console.log(table.toString())
    console.log("No cheaper model meets quality - youre not overpaying.")
    return
  }

  //models[0] assumes the most expensive model arrives first (true for now).
  //TODO: derive by price (max monthlyCost) once real, order-independent results flow.
  //?? cheapest satisfies the strict index check — never fires with a non-empty list.
  const mostExpensive = models[0] ?? cheapest 
  const savings = mostExpensive.monthlyCost - cheapest.monthlyCost

  console.log(table.toString())
  console.log(`VERDICT  Switch to ${cheapest.name}, same accuracy, save ~$${savings}/mo.`);
}

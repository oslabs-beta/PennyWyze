/*
    THE FACE — report.ts
    The only part of the tool users ever see: everything else
    produces invisible data; this turns it into the printed table,
    the verdict, and the audit-cost line in the terminal.


    We Build ...
        1. The results table — one row per model: name, score
           (like 46/50), projected monthly cost
        2. The verdict line — the sentence the product exists for:
           "Sonnet passes at $780/mo — switching from Opus saves
           $520/month"
        3. The honesty line — "This audit made 150 calls and cost
           $0.42"

    What it Powers ...
        - This IS the product to the user: ~10 printed lines. The
          entire machine exists to make these lines truthful.
        - Built FIRST with made-up numbers (Milestone 1), on
          purpose: it forces the team to agree what the output
          looks like while changing it is cheap, and gives the
          whole build a visible target to fill in.


    Build No. 1 — the table
        - columns: Model | Score | Monthly cost
        - green scores for passing models, red for failing

    Build No. 2 — the verdict line
        - names the CHEAPEST PASSING model — not the cheapest model:
          a cheaper model that failed doesn't win
        - includes the savings vs. the most expensive passer, monthly
          (and yearly reads even better)
        - if only the top model passes, that's a real verdict too:
          "no cheaper option meets quality" = "you're not overpaying"

    Build No. 3 — the honesty line
        - print the audit's own total cost and call count, straight
          from the calculator's running total


    Tech ...
        cli-table3 (installed) → draws clean boxed tables in a terminal
        chalk (installed) → colors terminal text (green passing
        scores, red failing, bold verdict)


    Gotchas ...
        - Hardcode fake results for the first build — real numbers
          arrive when the pipeline wires up. Show the printed output
          to both teammates and agree it's right; this is the
          product's face, and changing it is cheapest now.
        - Cheapest PASSER, not cheapest model — the one logic rule
          this file owns, and the easiest to get subtly wrong.
*/
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
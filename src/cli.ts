/*
    THE FRONT DOOR — cli.ts
    Our tool is used by typing a line in the terminal. This file is what
    understands that typed line.


    We Build ...
        1. The description of our command — Commander (the library that
           sorts what users type) knows nothing about our command until
           we describe it here
        2. The receiving function — the code that runs once a valid
           command arrives, holding the sorted values

    What it Powers ...
        This file is the ignition: an audit only happens because a valid 
        command arrived here. The receiving function then drives the entire 
        pipeline in order — calls the two loaders, hands their output to 
        the audit loop, and sends the results to the report.



    Build No.1 - The Command
        - name: audit
        - --prompt <path>   REQUIRED — the user's instructions file
        - --dataset <path>  REQUIRED — their golden dataset (the quiz
          with answers we grade against)
        - --volume <n>      OPTIONAL, default 100000 — their messages
          per month; only scales the money numbers, never the verdict

    Build No.2 The Receiving Function
        - Commander calls it with the sorted values as one object:
          { prompt, dataset, volume }
        - In the skeleton it only prints those values back — proof the
          front door works; wiring to the real pipeline is its own ticket
        - Everything typed in a terminal arrives as TEXT — volume needs
          converting to a real number, and nonsense (words, zero,
          negatives) deserves one clear rejection sentence    



    Tech
        commander (installed) → import { Command } from "commander"


    Commander's Vocabulary — the 5 methods we use ...

        .command("audit")
            names our command; what the user types to invoke it

        .requiredOption("--x <val>")
            declares a flag the command refuses to run without —
            this is what buys the free missing-flag error messages

        .option("--x <val>", desc, default)
            declares an optional flag; the third argument is used
            when the user skips it

        .action(fn)
            hands Commander our receiving function — it calls fn
            with the sorted values once the command is valid

        .parse()
            "go" — reads what was actually typed and does the sorting

        (<val> = "a value must follow this flag" · full working
        pattern: Build Plan, Phase 1.1)


    Chain order when building a command: identity → inputs → behavior
        (.command + .description, then flags — required first —
        then .action last; Commander accepts any order, but this
        reads like the help screen it generates)

    
    Reminder During Development 
        - In dev, our tool isn't an installed command yet — it runs via
          npm run dev
        - npm assumes any --flag belongs to npm itself and swallows it
          before our tool sees it, so flags silently vanish
        - the lone "--" means "everything after this belongs to my tool":
          npm run dev -- audit --prompt examples/prompt.md --dataset examples/golden-dataset.jsonl
*/

//import Commander 
import { Command } from "commander"

//store the ready-made object from Commander
const program = new Command();


//let Commander know the name of our product 
program
  .name('pennywyze');


//make the object that represents our audit command and adds it to what Commander knows - existence and registration
//this is where will handle the command's name, flags, description, and receiving function 
program.command('audit') //names the command
  .description('Benchmark Claude tiers against your golden dataset to return the lowest-cost passing model with projected monthly savings')
  .requiredOption('--prompt <filepath>', 'path to your prompt file')
  .requiredOption('--dataset <filepath>', 'path to your golden dataset file')
  .option('--volume <message-count>', 'number of messages your AI feature handles per month', '100000')
  .action((options)=>{
    //convert the inputted volume from text into a number 
    const volume = Number(options.volume)
    if(Number.isNaN(volume) || volume <= 0) return console.error('Volume is invalid')
    console.log(options) //proof of life
  })

program.parse()
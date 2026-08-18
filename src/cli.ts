import { Command } from "commander"


const program = new Command();


program.name('pennywyze');


//the audit command — its name, flags, description, and receiving function
program.command('audit')
  .description('Benchmark Claude tiers against your golden dataset to return the lowest-cost passing model with projected monthly savings')
  .requiredOption('--prompt <filepath>', 'path to your prompt file')
  .requiredOption('--dataset <filepath>', 'path to your golden dataset file')
  .option('--volume <message-count>', 'number of messages your AI feature handles per month', '100000')
  .action((options)=>{
    //convert volume from text into a number — everything typed in a terminal arrives as a string
    const volume = Number(options.volume);
    if(Number.isNaN(volume) || volume <= 0) return program.error('Volume must be a positive number');
    //proof of life — temporary echo, replaced with the real pipeline calls at the wire-up ticket
    console.log(options);
  });

//everything above only describes the command — parse reads what was typed and acts on it
program.parse();
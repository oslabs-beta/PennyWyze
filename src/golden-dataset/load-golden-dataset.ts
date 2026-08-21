import { existsSync, readFileSync } from 'fs';
import { type GoldenExample, goldenExampleSchema } from './schema.js';

export function loadGoldenDataset(path: string): GoldenExample[] {
  // Prevent unhandled ENOENT stack traces on missing dataset files
  if (!existsSync(path)) {
    throw new Error(`Dataset file not found: '${path}`)
  }

  // Read and split the dataset into individual JSONL entries.
  const fileContents = readFileSync(path, 'utf8');
  const lines = fileContents.split(/\r?\n/);
  const examples: GoldenExample[] = [];

  // Parse and validate each dataset entry.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') continue; // skip blank lines

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      // bad line → stop immediately and identify the line
      throw new Error(
        `Line ${i + 1} of your golden dataset is not valid JSON.`,
      );
    }
    // validate
    const result = goldenExampleSchema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new Error(
        `Line ${i + 1} of your golden dataset is invalid:\n${issues}`,
      );
    }

    examples.push(result.data);
  }

  //Prevent division-by-zero math ($NaN / mo) on empty inputs
  if (examples.length === 0) {
    throw new Error(`Dataset file '${path}' is empty. Provide at least 1 test example.`);
  }
  
  return examples;
}

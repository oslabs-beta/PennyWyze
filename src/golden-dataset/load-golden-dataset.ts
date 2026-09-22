import { existsSync, readFileSync } from 'fs';
import { type GoldenExample, goldenExampleSchema } from './schema.js';

export function loadGoldenDataset(path: string): GoldenExample[] {
  // Prevent unhandled ENOENT stack traces on missing dataset files
  if (!existsSync(path)) {
    throw new Error(`Dataset file not found: '${path}`)
  }

  const fileContents = readFileSync(path, 'utf8');
  const lines = fileContents.split(/\r?\n/); // handles both Unix and Windows line endings
  const examples: GoldenExample[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      // Stop immediately and name the bad line, rather than skipping it and
      // silently continuing with fewer examples than the user believes.
      throw new Error(
        `Line ${i + 1} of your golden dataset is not valid JSON.`,
      );
    }
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

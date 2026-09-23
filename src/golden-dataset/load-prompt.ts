import { existsSync, readFileSync } from 'fs';

/**
 * Reads the user's prompt file and returns it verbatim, minus invisible
 * characters. Nothing else is interpreted or reformatted: whatever the user
 * wrote IS the prompt, and rewriting it would mean the audit tests something
 * other than their real instructions.
 */
export const loadPrompt = (filePath: string): string => {
  if (!existsSync(filePath)) {
    throw new Error(`Prompt file not found: '${filePath}'`);
  }

  const raw = readFileSync(filePath, 'utf8');

  // Strip UTF-8 BOM (﻿) and zero-width spaces/joiners (​-‍).
  // Editors and copy-paste insert these invisibly; they would otherwise be
  // sent to the model as part of the instructions.
  const sanitized = raw
    .replace(/^﻿/, '')
    .replace(/[​-‍﻿]/g, '');

  if (!sanitized.trim()) {
    throw new Error(`Prompt file '${filePath}' contains no readable text.`);
  }

  return sanitized;
};

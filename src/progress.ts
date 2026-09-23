import chalk from 'chalk';

import type { AuditProgress } from './audit.js';

/**
 * The terminal's implementation of the audit's progress hooks. All the cursor
 * tricks and ANSI escapes live here rather than in the loop, so the loop can
 * be tested without capturing stdout.
 *
 * `\x1b[K` clears from the cursor to end of line, which is what lets each
 * redraw overwrite the last one without padding it with spaces.
 */
export const terminalProgress = (barWidth = 20): AuditProgress => ({
  onQuestion(tier, current, total) {
    const percentage = Math.min(1, Math.max(0, current / total));
    const filled = Math.round(barWidth * percentage);

    const bar =
      '█'.repeat(filled) + chalk.dim('░'.repeat(barWidth - filled));

    process.stdout.write(
      chalk.bold.cyan(`\r Auditing ▷ ${tier} ${bar} ${current}/${total}\x1b[K`),
    );
  },

  // Resolves the live ticker into one permanent line per model — the \n is
  // what releases the line so the next model starts on a fresh one.
  onModelDone(tier, outcome, { questionsRun, total, note }) {
    const line =
      outcome === 'incomplete'
        ? chalk.yellow(`\r ! ${tier} incomplete — ${note}\x1b[K\n`)
        : outcome === 'complete'
          ? chalk.green(`\r ✓ ${tier} audited — ${total} questions\x1b[K\n`)
          : chalk.red(
              `\r ✗ ${tier} failed — stopped at question ${questionsRun}\x1b[K\n`,
            );

    process.stdout.write(line);
  },
});

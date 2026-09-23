import type { ModelProvider } from './provider.js';

//Emulates Claude at $0 for development — the real provider swaps in later.
//Variety is deliberate: the wrong label + quoted answer feed the grading
const answers: string[] = [
  'billing',
  'tech-problem',
  'complaint',
  'refund',
  '"billing"',
];

/**
 * Builds a fresh fake provider with its own position in the answer list.
 *
 * A factory rather than a single shared object: the position is state, and a
 * module-level counter leaks between tests in the same file, so which answers
 * a test receives depends on what ran before it. Each caller gets its own.
 */
export const createFakeProvider = (): ModelProvider => {
  let callCount = 0;

  return {
    async run() {
      const answer = answers[callCount % answers.length] ?? 'billing';

      callCount++;

      //Accepts the contract's three inputs but never reads them
      //each call just returns the next answer in the list
      return {
        text: answer,
        inputTokens: 50,
        outputTokens: 4,
        stopReason: 'end_turn',
      };
    },
  };
};

/** The instance `--fake` uses. One CLI run, one sequence. */
export const fakeProvider: ModelProvider = createFakeProvider();

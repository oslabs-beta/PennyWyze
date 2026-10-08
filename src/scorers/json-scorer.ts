import type { Scorer } from './scorer.js';
import { stripCodeFences } from './strip-code-fences.js';

/**
 * Grades structured answers by their data instead of their text.
 *
 * Exact matching fails a correct structured answer for reasons that have
 * nothing to do with accuracy: `{"a":1,"b":2}` and `{ "b": 2, "a": 1 }` are
 * the same answer written two ways, and a grader that calls the second one
 * wrong measures the model's formatting habits rather than its correctness.
 *
 * Deterministic and free — no model is asked anything. For free-text answers,
 * where deciding whether two phrasings mean the same thing genuinely needs
 * judgement, that is the LLM-as-judge grader's job, not this one.
 */

const parse = (text: string): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(stripCodeFences(text)) as unknown };
  } catch {
    // Not valid JSON. For the model's answer that is a real failure — it was
    // asked for structured output and didn't produce it.
    return { ok: false };
  }
};

/**
 * Structural comparison, with four deliberate rules. Each is arguable; they
 * are written here rather than discovered later.
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  // RULE 1 — key order is ignored. The whole point: JSON objects have no
  // meaningful key order, so {a,b} and {b,a} are the same answer.
  // (Falls out of comparing by key below rather than by position.)

  // RULE 3 — types are strict: 1 is not "1". A model that returns a string
  // where a number was expected is a real production bug, not a formatting
  // quirk — downstream code does arithmetic on that value.
  if (typeof a !== typeof b) return false;

  // Primitives, plus null (typeof null is 'object', but === settles it).
  if (a === null || b === null || typeof a !== 'object') return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // RULE 2 — array order is significant. Arrays are ordered by definition,
  // and when the task asked for a ranked list the order *is* the answer.
  // An unordered-collection use case would need its own flag.
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((item, index) => deepEqual(item, b[index]))
    );
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);

  // RULE 4 — extra keys fail. Asking for two fields and getting three is a
  // deviation from the output spec, the same way the exact grader rejects a
  // correct label buried in a sentence. Comparing key counts is what enforces
  // it; a subset mode would be a separate option.
  if (leftKeys.length !== Object.keys(right).length) return false;

  return leftKeys.every(
    key =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      deepEqual(left[key], right[key]),
  );
};

export const jsonScorer: Scorer = {
  async score(modelOutput: string, expected: string): Promise<boolean> {
    const actual = parse(modelOutput);
    const want = parse(expected);

    // An unparseable expected answer means the dataset is wrong, not the
    // model. Returning false is the honest outcome either way — this grader
    // can't compare what it can't parse — and the misses list shows the user
    // the raw text so they can see which side is at fault.
    if (!actual.ok || !want.ok) return false;

    return deepEqual(actual.value, want.value);
  },
};

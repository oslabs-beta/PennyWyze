import { describe, it, expect } from 'vitest';

import { jsonScorer } from '../../src/scorers/json-scorer.js';

const grade = (actual: string, expected: string) =>
  jsonScorer.score(actual, expected);

describe('jsonScorer — what it forgives', () => {
  it('ignores key order', async () => {
    // The reason this grader exists: exact matching fails this.
    expect(
      await grade('{"priority":"high","label":"billing"}', '{"label":"billing","priority":"high"}'),
    ).toBe(true);
  });

  it('ignores whitespace and indentation', async () => {
    expect(
      await grade('{\n  "label": "billing"\n}', '{"label":"billing"}'),
    ).toBe(true);
  });

  it('accepts an answer wrapped in a code fence', async () => {
    expect(
      await grade('```json\n{"label":"billing"}\n```', '{"label":"billing"}'),
    ).toBe(true);
  });

  it('ignores key order in nested objects', async () => {
    expect(
      await grade(
        '{"ticket":{"priority":"high","label":"billing"}}',
        '{"ticket":{"label":"billing","priority":"high"}}',
      ),
    ).toBe(true);
  });

  it('treats 1 and 1.0 as the same number', async () => {
    // Both parse to the same value, so this is equality, not leniency.
    expect(await grade('{"count":1.0}', '{"count":1}')).toBe(true);
  });
});

describe('jsonScorer — what it rejects', () => {
  it('fails a changed value', async () => {
    expect(
      await grade('{"label":"technical"}', '{"label":"billing"}'),
    ).toBe(false);
  });

  it('fails a reordered array, because arrays are ordered', async () => {
    // RULE 2. If the task asked for a ranked list, the order is the answer.
    expect(await grade('{"tags":["b","a"]}', '{"tags":["a","b"]}')).toBe(false);
  });

  it('fails a string where a number was expected', async () => {
    // RULE 3. Downstream code does arithmetic on this value.
    expect(await grade('{"count":"1"}', '{"count":1}')).toBe(false);
  });

  it('fails a boolean where a string was expected', async () => {
    expect(await grade('{"refund":true}', '{"refund":"true"}')).toBe(false);
  });

  it('fails an answer with extra keys', async () => {
    // RULE 4. Returning more than the output spec asked for is a deviation.
    expect(
      await grade(
        '{"label":"billing","confidence":0.9}',
        '{"label":"billing"}',
      ),
    ).toBe(false);
  });

  it('fails an answer missing a key', async () => {
    expect(
      await grade('{"label":"billing"}', '{"label":"billing","priority":"high"}'),
    ).toBe(false);
  });

  it('fails on capitalization, unlike the exact grader', async () => {
    // Deliberate asymmetry: the exact grader tolerates case because a
    // capitalized label is decoration. Inside JSON a value feeds a parser or
    // an enum, where "Billing" and "billing" are different strings.
    expect(await grade('{"label":"Billing"}', '{"label":"billing"}')).toBe(false);
  });

  it('fails when null stands in for a value', async () => {
    expect(await grade('{"label":null}', '{"label":"billing"}')).toBe(false);
  });

  it('fails an array where an object was expected', async () => {
    expect(await grade('["billing"]', '{"label":"billing"}')).toBe(false);
  });
});

describe('jsonScorer — when parsing fails', () => {
  it('fails an answer that is not JSON at all', async () => {
    // The model was asked for structured output and returned prose.
    expect(
      await grade('The label is billing.', '{"label":"billing"}'),
    ).toBe(false);
  });

  it('fails an answer with truncated JSON', async () => {
    expect(await grade('{"label":"billi', '{"label":"billing"}')).toBe(false);
  });

  it('fails rather than throwing when the expected answer is not JSON', async () => {
    // The dataset is at fault here, not the model — but this grader cannot
    // compare what it cannot parse, and it must not crash the audit.
    await expect(grade('{"label":"billing"}', 'billing')).resolves.toBe(false);
  });
});

describe('jsonScorer — non-object answers', () => {
  it('compares bare values too, not just objects', async () => {
    expect(await grade('"billing"', '"billing"')).toBe(true);
    expect(await grade('42', '42')).toBe(true);
    expect(await grade('true', 'true')).toBe(true);
  });

  it('handles arrays at the top level', async () => {
    expect(await grade('["a","b"]', '["a","b"]')).toBe(true);
    expect(await grade('["a"]', '["a","b"]')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { loadGoldenDataset } from './load-golden-dataset.js';

describe('loadGoldenDataset', () => {
  it('loads all valid golden dataset examples in order', () => {
    const result = loadGoldenDataset(
      new URL('./fixtures/valid.jsonl', import.meta.url).pathname,
    );

    expect(result).toEqual([
      {
        input: 'My card was charged twice',
        expected: 'billing',
      },
      {
        input: 'I forgot my password',
        expected: 'account',
      },
      {
        input: 'The API is returning an error',
        expected: 'technical',
      },
    ]);
  });

  it('throws with the line number when JSON has a missing quote', () => {
    const path = new URL('./fixtures/missing-quote.jsonl', import.meta.url)
      .pathname;

    expect(() => loadGoldenDataset(path)).toThrow(
      'Line 2 of your golden dataset is not valid JSON.',
    );
  });

  it('throws with the line number when JSON has a trailing comma', () => {
    const path = new URL('./fixtures/trailing-comma.jsonl', import.meta.url)
      .pathname;

    expect(() => loadGoldenDataset(path)).toThrow(
      'Line 2 of your golden dataset is not valid JSON.',
    );
  });

  it('throws with the line number when expected is missing', () => {
    const path = new URL('./fixtures/missing-expected.jsonl', import.meta.url)
      .pathname;

    expect(() => loadGoldenDataset(path)).toThrow(
      /Line 2 of your golden dataset is invalid:.*expected/s,
    );
  });
});

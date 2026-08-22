import { describe, it, expect } from 'vitest'
import { runAudit } from '../../src/audit.js'
import { fakeProvider } from '../../src/providers/fake-provider.js'
import { exactMatchScorer } from '../../src/scorers/exact-match-scorer.js'

// authored here so the tests own their truth — expecteds match the fake's
// first two deals, so this set passes cleanly
const tinyDataset = [
  { input: 'q1', expected: 'billing' },
  { input: 'q2', expected: 'tech-problem' },
]

// expecteds no dealt card can ever match — guarantees a miss on every
// question regardless of deck position
const impossibleDataset = [
  { input: 'q1', expected: 'purple-elephant' },
  { input: 'q2', expected: 'pink-mongoose' },
  { input: 'q3', expected: 'teal-walrus' },
]

describe('runAudit', () => {

  it('returns one record per model per question, with the right fields', async () => {
    const results = await runAudit(fakeProvider, tinyDataset, 'test prompt', ['model-a'], 1, exactMatchScorer)

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ modelId: 'model-a', question: 'q1', expected: 'billing' })
    expect(typeof results[0]?.pass).toBe('boolean')
    expect(typeof results[0]?.inputTokens).toBe('number')
  })

  it('stops a failing model early at the full pass bar', async () => {
    // full bar allows 0 misses — the first guaranteed miss breaks the loop
    const results = await runAudit(fakeProvider, impossibleDataset, 'test prompt', ['model-a'], 1, exactMatchScorer)

    expect(results).toHaveLength(1)
    expect(results[0]?.pass).toBe(false)
  })

  it('lets a model survive misses at a loosened pass bar', async () => {
    // 3 questions at 0.6 → floor(3 × 0.4) = 1 miss allowed —
    // survives the 1st, breaks on the 2nd: exactly 2 records
    const results = await runAudit(fakeProvider, impossibleDataset, 'test prompt', ['model-a'], 0.6, exactMatchScorer)

    expect(results).toHaveLength(2)
  })

})
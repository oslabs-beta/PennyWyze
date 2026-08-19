import { describe, it , expect } from 'vitest'
import { exactMatchScorer } from "../../src/scorers/exact-match-scorer"

describe("exactMatchScorer", () => {
  it("passes a quoted answer", async () => {
    expect(await exactMatchScorer.score("billing", "billing")).toBe(true)
  })

  it("passes a capitalized answer with a period", async () => {
    expect(await exactMatchScorer.score("Billing.", "billing")).toBe(true);
  });

  it("passes a code-fenced answer", async () => {
    expect(await exactMatchScorer.score("```\nbilling\n```", "billing")).toBe(true);
  });

  it("passes a code-fenced answer with a language label", async () => {
    expect(await exactMatchScorer.score("```json\nbilling\n```", "billing")).toBe(true);
  });

  it("fails a sentence-wrapped answer, on purpose", async () => {
    expect(await exactMatchScorer.score("The answer is billing.", "billing")).toBe(false);
  });

  it("fails a plainly wrong answer", async () => {
    expect(await exactMatchScorer.score("technical", "billing")).toBe(false);
  });
})
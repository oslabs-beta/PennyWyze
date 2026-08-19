import type { Scorer } from "./scorer.js";

const normalize = (text:string):string => {
  let s = text
    .trim()
    .replace(/```[a-z]*\n?/g, "")
    .replace(/```/g, "")
    .trim()
  s = s.replace(/^["']|["']$/g, "")
  return s.toLowerCase().replace(/[.!]+$/, "")
}

export const exactMatchScorer: Scorer = {
  async score(modelOutput: string, expected: string): Promise<boolean> {
    return normalize(modelOutput) === normalize(expected)
  }
}
import type { Scorer } from "./scorer.js";

const normalize = (text:string):string => {
  // Order matters: strip wrappers (code fences, quotes) before touching the
  // core text, so a quoted or fenced answer normalizes the same as a bare one.
  let s = text
    .trim()
    .replace(/```[a-z]*\n?/g, "")
    .replace(/```/g, "")
    .trim()
  s = s.toLowerCase().replace(/[.!]+$/, "");
  return s.replace(/^["']|["']$/g, "");
}

export const exactMatchScorer: Scorer = {
  async score(modelOutput: string, expected: string): Promise<boolean> {
    return normalize(modelOutput) === normalize(expected)
  }
}
import { describe, it, expect } from "vitest"
import { costOfCall } from "../../src/cost/calculator.js"
import { ANTHROPIC_MODELS } from "../../src/providers/anthropic-models.js"

// prices come from the models map (one source of truth — pricing updates flow
// in automatically), but expected values stay hand-computed: deriving them
// from the same math the function uses would just check the code against
// itself. If prices ever change, these fail on purpose — recompute by hand.
const haiku = Object.values(ANTHROPIC_MODELS).find(m => m.id.includes('haiku'))!

describe("costOfCall", () => {
  it("calculates input correctly", () => {
    const result = costOfCall(42, 0, haiku.inputPrice, haiku.outputPrice)
    expect(result).toBe(0.000042)
  })

  it("calculates output correctly", ()=> {
    const result = costOfCall(42, 3, haiku.inputPrice, haiku.outputPrice)
    expect(result).toBeCloseTo(0.000057)
  })
})

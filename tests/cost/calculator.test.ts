import { describe, it, expect } from "vitest"
import { costOfCall } from "../../src/cost/calculator.js"

describe("costOfCall", () => {
  it("calculates input correctly", () => {
    const result = costOfCall("haiku", 42, 0)
    expect(result).toBe(0.000042)
  })

  it("calculates output correctly", ()=> {
    const result = costOfCall("haiku", 42, 3)
    expect(result).toBeCloseTo(0.000057)
  })
})


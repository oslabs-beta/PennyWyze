/*
    THE CALCULATOR — calculator.ts
    Turns token counts into dollars: the machinery that reads the
    price list and produces every money number in the report.


    We Build ...
        1. costOfCall() — price one call: its tokens × its model's
           rates ÷ 1,000,000
        2. The summary math — each model's average cost per call, the
           monthly projection (× volume), and the audit's own total

    What it Powers ...
        - The headline number: each model's projected $/month is what
          the user acts on, forwards to their boss, and switches
          models over
        - The honesty number: the audit's own cost ("This audit cost
          $0.42") — a trust tool should be upfront that testing isn't
          free
        - The verdict's second half: score decides who passes; THESE
          numbers decide who wins among the passers


    Build No. 1 — costOfCall()
        - (inputTokens × that model's in-rate + outputTokens × that
          model's out-rate) ÷ 1,000,000
        - the divide exists because rates are quoted per million
          tokens

    Build No. 2 — the summary math
        - per model: price each of its calls, average them → true cost
          per call → × volume → the monthly projection
        - running total across ALL calls, every model → the audit's
          own cost


    Tech ...
        the price list → import { PRICING } from "./pricing"
        the results shape → import type { AuditResult } from "../audit"


    Gotchas ...
        - Forgetting the ÷ 1,000,000 is THE classic bug — the code
          still runs, every number is silently wrong by a factor of a
          million.
        - Tests use answers computed BY HAND ON PAPER first (42 tokens
          at $1/M = $0.000042). Expected values produced by running
          the code being tested prove nothing.
        - Sanity check the spread: the cheapest tier should land
          roughly 5x cheaper than the top tier. A wildly different
          spread means a math bug, not unusual models.
*/

import { claudePricing } from "./pricing.js"

export const costOfCall = (tier: "haiku" | "opus" | "sonnet", inputTokens:number, outputTokens:number):number => {
  const rates = claudePricing[tier]
  return (inputTokens * rates.in + outputTokens * rates.out) / 1_000_000
}
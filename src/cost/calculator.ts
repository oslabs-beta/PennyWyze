import { claudePricing } from "./pricing.js"

export const costOfCall = (tier: "haiku" | "opus" | "sonnet", inputTokens:number, outputTokens:number):number => {
  const rates = claudePricing[tier]
  if (!rates) {
    throw new Error(`Unknown tier: "${tier}". Expected haiku, opus, or sonnet.`);
  }
  return (inputTokens * rates.in + outputTokens * rates.out) / 1_000_000
}
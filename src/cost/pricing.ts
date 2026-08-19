/*
    THE PRICE LIST — pricing.ts

    Source: Anthropic's official pricing page.
    Date checked: August 16, 2026

    Sonnet's intro pricing ($2/$10) ends August 31, 2026, then becomes
    $3/$15. This file needs a real update after that date, not before.

    Note: Opus 5 runs "adaptive thinking" by default, and thinking
    tokens bill at the output rate. Our live test showed 0 thinking
    tokens for this project's simple classification task, so it's not
    adding real cost right now, but worth knowing if costs ever look
    higher than expected later.
*/

type ModelPricing = {
  in: number;
  out: number
}

type ClaudePricing = {
  haiku: ModelPricing;
  opus: ModelPricing;
  sonnet: ModelPricing
}

export const claudePricing = {
  "haiku": { in: 1, out: 5 },
  "opus":{ in: 5, out: 25 },
  "sonnet": { in: 2, out: 10 }
}


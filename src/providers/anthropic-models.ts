export const ANTHROPIC_MODELS = {
  // Prices are dollars per million tokens (divided out in cost/calculator.ts).
  // Source: docs/api-validation.md — verify against Anthropic's current
  // pricing before editing, these change.
  opus: {
    id: 'claude-opus-5',
    inputPrice: 5,
    outputPrice: 25,
  },
  sonnet: {
    id: 'claude-sonnet-5',
    inputPrice: 2,
    outputPrice: 10,
  },
  haiku: {
    id: 'claude-haiku-4-5-20251001',
    inputPrice: 1,
    outputPrice: 5,
  },
} as const;

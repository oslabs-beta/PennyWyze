// src/providers/anthropic-models.ts

export const ANTHROPIC_MODELS = {
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

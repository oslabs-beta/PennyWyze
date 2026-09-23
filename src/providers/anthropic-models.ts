export const ANTHROPIC_MODELS = {
  // Prices are dollars per million tokens (divided out in cost/calculator.ts).
  // Source: docs/api-validation.md — verify against Anthropic's current
  // pricing before editing, these change.
  //
  // `effort` caps how much reasoning a model spends before answering. It is
  // set for every model that accepts it, because on Claude 5 models thinking
  // is ON by default and thinking tokens bill at the OUTPUT rate — so without
  // it, the pricier tiers are charged for deliberation this task never asked
  // for, and the cost comparison this tool exists to produce is skewed toward
  // whichever tier thinks most. Omitted where the API rejects the parameter.
  opus: {
    id: 'claude-opus-5',
    label: 'opus',
    inputPrice: 5,
    outputPrice: 25,
    effort: 'low',
    // Thinking models can take a while on a hard input; 20s was cutting real
    // answers off and surfacing them as network errors.
    timeoutMs: 120_000,
  },
  sonnet: {
    id: 'claude-sonnet-5',
    label: 'sonnet',
    inputPrice: 2,
    outputPrice: 10,
    effort: 'low',
    timeoutMs: 120_000,
  },
  haiku: {
    // Canonical id — the dated variant 'claude-haiku-4-5-20251001' is not the
    // published form and shouldn't be pinned here.
    id: 'claude-haiku-4-5',
    label: 'haiku',
    inputPrice: 1,
    outputPrice: 5,
    timeoutMs: 60_000,
    // No effort: Claude Haiku 4.5 rejects output_config.effort with a 400.
    // It also has no default thinking to cap, so there is nothing to equalize.
    effort: null,
  },
} as const;

export type AnthropicModel =
  (typeof ANTHROPIC_MODELS)[keyof typeof ANTHROPIC_MODELS];

/** Model config by API id, so callers don't re-scan the object per call. */
export const MODELS_BY_ID: ReadonlyMap<string, AnthropicModel> = new Map(
  Object.values(ANTHROPIC_MODELS).map(model => [model.id, model]),
);

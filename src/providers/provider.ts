/** What one model call gives back, normalized across providers. */
export type ProviderResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /**
   * Why the model stopped, in this tool's vocabulary rather than the
   * provider's.
   *
   * `'end_turn'` means a complete answer and is graded. Any other string
   * marks the answer incomplete and keeps it out of the score, because the
   * text is not a real attempt at the question and must not be counted as a
   * wrong one — `max_tokens` is a truncated response, `refusal` a declined
   * request.
   *
   * `null` means the provider reports nothing about why it stopped; those
   * answers are graded, since there is no basis to call them incomplete.
   *
   * Adapters translate rather than pass through: a provider that signals
   * completion as `"stop"` or `"STOP"` maps it to `'end_turn'`, or none of
   * its answers are ever graded. Returning `null` to satisfy this type, from
   * a provider that could report truncation, hides truncation entirely.
   */
  stopReason: string | null;
};

// The shape every model-caller must fit — lets the fake and real providers swap without anything else changing
export interface ModelProvider {
  run(
    modelId: string,
    systemPrompt: string,
    userInput: string,
  ): Promise<ProviderResponse>;
}

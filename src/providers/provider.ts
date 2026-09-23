/** What one model call gives back, normalized across providers. */
export type ProviderResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /**
   * Why the model stopped. `end_turn` is a complete answer; anything else
   * means the text is not a real attempt at the question and must not be
   * graded as a wrong answer. `max_tokens` is a truncated response,
   * `refusal` is a declined request. Null when a provider doesn't report one.
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

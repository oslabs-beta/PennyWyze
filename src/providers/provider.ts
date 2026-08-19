//the shape every model-caller must fit — lets the fake and real providers swap without anything else changing
export interface ModelProvider {
    run(
        modelId: string,
        systemPrompt: string,
        userInput: string
    ): Promise<{ text: string; inputTokens: number; outputTokens: number }>
}
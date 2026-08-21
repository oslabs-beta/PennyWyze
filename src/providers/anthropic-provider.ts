import type { ModelProvider } from './provider.js'
import Anthropic from '@anthropic-ai/sdk'

// created once and shared by every call — reads ANTHROPIC_API_KEY from the
// environment on its own; maxRetries handles rate-limit hiccups with growing waits
const client = new Anthropic({ maxRetries: 4, timeout: 20000 })

export const anthropicProvider: ModelProvider = {
  async run(modelId, systemPrompt, userInput){
    const response = await client.messages.create({
      model: modelId,
      // system is a TOP-LEVEL field on Anthropic's API, not a message role
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput}],
      //required by the API — generous ceiling for one-word answers
      max_tokens: 1000 // Raised from 300 so adaptive thinking doesn't starve the text block
      //no temperature: the Claude 5 models reject the parameter (400 error);
      //haiku is left at default for consistency across all three tiers.
      //repeatability is proven by the M3 verdict-stability run instead.
    })

    // Search for the text block instead of assuming it's at index 0 —
    // Opus's adaptive thinking can insert a 'thinking' block first
    const textBlock = response.content.find((block) => block.type === "text");
    const text: string = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  }
}
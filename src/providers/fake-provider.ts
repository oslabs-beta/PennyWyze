import type { ModelProvider } from './provider.js'

//emulates Claude at $0 for development — the real provider swaps in later.
//variety is deliberate: the wrong label + quoted answer feed the grading
const answers: string[] = [
  'billing',
  'tech-problem',
  'complaint',
  'refund',
  '"billing"'
]

let callCount = 0


export const fakeProvider: ModelProvider = {
  async run(modelId, systemPrompt, userInput){
    const answer = answers[callCount % answers.length] ?? 'billing'

    callCount++

    //accepts the contract's three inputs but never reads them
    //each call just returns the next answer in the list
    return {
      text: answer,
      inputTokens: 50,
      outputTokens: 4
    }
  }
}
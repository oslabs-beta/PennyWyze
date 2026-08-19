import type { ModelProvider } from './providers/provider.js'
import type { GoldenExample } from './golden-dataset/schema.js';

export type AuditResult = {
  modelId: string;
  question: string;
  answer: string;
  pass: boolean
  inputTokens: number;
  outputTokens:number;
}


export const runAudit = async (
  provider: ModelProvider, 
  dataset: GoldenExample[], 
  prompt: string, 
  modelIds: string[]
): Promise<AuditResult[]> => {
  const results: AuditResult[] = []

  for(const modelId of modelIds){
    for(const example of dataset){
      const response = await provider.run(modelId, prompt, example.input);

      //naive check on purpose — real grading is Milestone 2; it wrongly
      //failing the fake's quoted answer is expected, don't fix here
      const passed = response.text === example.expected;

      const result: AuditResult = {
        modelId,
        question: example.input,
        answer: response.text,
        pass: passed,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens
      }
      results.push(result)
    }
  }
  return results
}

//async on purpose — current graders don't wait
//but a future LLM-judge makes API calls; declaring Promise now means it drops in without rewiring
export interface Scorer {
  score(actual: string, expected: string): Promise<boolean>;
}

//the grader: the scorer contract, plus the clean-then-compare logic that judges each answer right or wrong.

interface Scorer {
  score(actual: string, expected: string): Promise<boolean>;
}

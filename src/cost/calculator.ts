export const costOfCall = (
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number,
): number => {
  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000;
};

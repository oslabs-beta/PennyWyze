export const costOfCall = (
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number,
): number => {
  // Rates are quoted per million tokens — this is the one line where
  // forgetting the divide would silently make every price wrong by 1,000,000x.
  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000;
};

import type { AuditResult } from './audit.js';
import { ANTHROPIC_MODELS } from './providers/anthropic-models.js';
import { costOfCall } from './cost/calculator.js';

export type Miss = {
  input: string;
  answer: string;
  expected: string;
};

export type ModelSummary = {
  name: string;
  passes: number;
  total: number;
  /** True when early stopping cut this model short of the full dataset. */
  stopped: boolean;
  monthlyCost: number;
  passed: boolean;
  misses: Miss[];
};

/** Total USD spent on the given calls, priced per model from real token counts. */
export const calculateResultsCost = (results: AuditResult[]): number =>
  results.reduce((sum, result) => {
    const model = Object.values(ANTHROPIC_MODELS).find(
      m => m.id === result.modelId,
    );
    if (!model) return sum;

    return (
      sum +
      costOfCall(
        result.inputTokens,
        result.outputTokens,
        model.inputPrice,
        model.outputPrice,
      )
    );
  }, 0);

/**
 * The bridge between the audit loop and the report: turns one flat list of
 * per-question results into one row per model.
 *
 * Returns plain numbers and booleans, never formatted strings — rendering is
 * the report's job, so this stays testable and reusable by non-terminal
 * callers.
 */
export const summarize = (
  results: AuditResult[],
  modelIds: string[],
  datasetSize: number,
  volume: number,
  passBar: number,
): ModelSummary[] =>
  modelIds.map(modelId => {
    const records = results.filter(r => r.modelId === modelId);
    const passes = records.filter(r => r.pass).length;

    // Cost per call is averaged over the calls actually made, so an
    // early-stopped model still projects a fair per-message rate.
    const averageCostPerCall = calculateResultsCost(records) / records.length;

    return {
      name: modelId,
      passes,
      total: datasetSize,
      stopped: records.length < datasetSize,
      monthlyCost: averageCostPerCall * volume,
      // Measured against calls made, not dataset size. Early stopping only
      // triggers once a model can no longer reach the bar, so a stopped model
      // can never pass this check.
      passed: passes / records.length >= passBar,
      misses: records
        .filter(r => !r.pass)
        .map(r => ({
          input: r.question,
          answer: r.answer,
          expected: r.expected,
        })),
    };
  });

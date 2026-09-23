import type { AuditResult } from './audit.js';
import { MODELS_BY_ID } from './providers/anthropic-models.js';
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
  /** Calls that never produced a gradeable answer — failures, truncations. */
  incomplete: number;
  monthlyCost: number;
  passed: boolean;
  misses: Miss[];
};

/** Total USD spent on the given calls, priced per model from real token counts. */
export const calculateResultsCost = (results: AuditResult[]): number =>
  results.reduce((sum, result) => {
    const model = MODELS_BY_ID.get(result.modelId);
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

    // Only graded answers say anything about quality or cost. An incomplete
    // call is missing data, not a wrong answer.
    const graded = records.filter(r => r.status === 'graded');
    const incomplete = records.length - graded.length;
    const passes = graded.filter(r => r.pass).length;

    // Cost per call is averaged over the calls actually graded, so an
    // early-stopped model still projects a fair per-message rate.
    const averageCostPerCall = graded.length
      ? calculateResultsCost(graded) / graded.length
      : 0;

    return {
      name: modelId,
      passes,
      total: datasetSize,
      stopped: records.length < datasetSize,
      incomplete,
      monthlyCost: averageCostPerCall * volume,
      // A model with any incomplete call cannot be recommended: part of its
      // score is unknown, so "it passed" would be a claim the data can't
      // support. Otherwise measured against calls made, not dataset size —
      // early stopping only fires once the bar is already unreachable, so a
      // stopped model can never pass this check.
      passed:
        incomplete === 0 &&
        graded.length > 0 &&
        passes / graded.length >= passBar,
      misses: graded
        .filter(r => !r.pass)
        .map(r => ({
          input: r.question,
          answer: r.answer,
          expected: r.expected,
        })),
    };
  });

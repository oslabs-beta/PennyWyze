/**
 * Removes a markdown code fence wrapper from a model's answer.
 *
 * Shared by the graders because models fence structured output whether or not
 * you asked them to — ```json\n{...}\n``` is a correctly-formatted answer
 * wearing decoration, and rejecting it would measure the model's formatting
 * habits rather than its accuracy.
 *
 * This is the only part of the exact grader's cleanup the JSON grader can
 * reuse: lowercasing would alter keys and values, and stripping surrounding
 * quotes would break the JSON itself.
 */
export const stripCodeFences = (text: string): string =>
  text
    .trim()
    .replace(/```[a-z]*\n?/g, '')
    .replace(/```/g, '')
    .trim();

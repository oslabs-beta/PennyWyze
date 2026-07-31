/* 
    THE PROVIDER CONTRACT
 
    What an interface is: a shape description, not working code. It says
    "anything claiming to be a ModelProvider must have a run() function with
    exactly these inputs and outputs." TypeScript enforces it — any provider
    that doesn't match this shape gets flagged the moment it's typed. The
    interface itself vanishes when the code compiles; it exists only to keep
    every provider identical in shape.
 
    Why we need it: two different providers will take turns in the same spot —
    the FakeProvider (canned answers, free, for development) and the
    AnthropicProvider (real Claude calls, built in Milestone 2). Because both
    are built to this one shape, swapping fake for real is a one-line change
    and nothing else in the tool notices. It also lets us build in parallel:
    the audit loop is written against this shape, not against any finished
    provider.
 
    What a provider does in the machine: the audit loop walks the golden
    dataset and, for EACH question, calls provider.run() once — one question
    per call, three models each taking the same exam. The provider's whole job
    is: take the instructions + one question, get this model's answer, hand it
    back with the token counts.

    The inputs (what the loop hands us each call):
    modelId      — which of the 3 Claude models to ask (an ID string like
                  "claude-haiku-4-5" — it's a name, not a number)
    systemPrompt — the user's prompt file contents; the model's standing
                   instructions, sent with every call
    userInput    — the `input` field of ONE golden dataset example (the
                   question being asked this call). "User" here means the
                   API's user-message slot — NOT our tool's user. The
                   example's `expected` field is NEVER sent — it's the
                   answer key, and only our scorer sees it.
 
    The outputs (why each field must come back):
    text         — the model's answer; the scorer grades this against the
                   example's `expected`
    inputTokens / outputTokens — the meter readings. Anthropic counts tokens
                   (the chunks models read/write, ~3/4 of a word each) for
                   billing and attaches the counts to every response as
                   `usage` — we just pass them through. ALL of our cost math
                   runs on these two numbers.
 
  Wrapped in a Promise because the real provider waits on the internet;
  the fake answers instantly but wears the same wrapper so both fit one shape.

 */

  
interface ModelProvider {
    run(
        modelId: string,
        systemPrompt: string,
        userInput: string
    ): Promise<{ text: string; inputTokens: number; outputTokens: number }>
}
/*
    THE REAL CALLER — anthropic-provider.ts
    The provider that actually contacts Anthropic: same contract shape
    as the FakeProvider, but run() makes a real API call and returns
    real Claude's answer with real token counts. (Built in Milestone 2.)


    We Build ...
        1. The AnthropicProvider — a run() matching the contract, using
           the Anthropic SDK to make the call and plucking the answer
           + token counts out of the reply

    What it Powers ...
        - Truth: the moment this swaps in for the fake, every answer,
          score, and dollar figure becomes real. The tool starts
          telling the truth here.
        - Each call costs a fraction of a cent on the user's own key
          and takes a couple of seconds — this file is where the
          audit's runtime and its cost both live.


    Build No. 1 — the AnthropicProvider
        - create the client once, with maxRetries: 4 — the SDK
          automatically retries "slow down" (rate limit) errors with
          growing waits; we configure, not hand-build
        - each run(): call the SDK's message-create with:
          · model: the modelId passed in
          · system: the systemPrompt — a TOP-LEVEL field, not inside
            the messages (gotcha coming from OpenAI)
          · messages: one user message holding userInput
          · temperature: 0 — ONLY on models that accept it; two dropped 
            the setting (see the verify-reality note for which). Repeatability 
            is proven either way by M3's run-the-audit-twice test
          · max_tokens: required by the API — a couple hundred is
            plenty for short answers
        - pull the answer out: response.content is a LIST of blocks —
          find the text block, return its text
        - token counts come straight off response.usage — pass them
          through as inputTokens / outputTokens


    Tech ...
        @anthropic-ai/sdk (installed) → import Anthropic from "@anthropic-ai/sdk"
        the key: the SDK auto-reads ANTHROPIC_API_KEY from the
        environment — no key handling in our code, ever


    Gotchas ...
        - This is the ONLY file in the project that touches the
          Anthropic SDK — everything else talks to "a provider."
        - If a call still fails after all retries: record that question
          as errored and KEEP GOING — one bad call must never crash
          the whole audit at question 37 of 150.
        - The prompt goes in the system field, not the messages —
          and max_tokens is not optional.
*/
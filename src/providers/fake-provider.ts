/*
    THE STUNT DOUBLE — fake-provider.ts
    A provider that fakes the work: fits the provider contract
    perfectly, but instead of contacting Claude it instantly returns
    canned answers from a list we wrote. No internet, no key, no cost.


    We Build ...
        1. The FakeProvider — a ~10-line object with a run() matching
           the contract: ignores its inputs, returns the next canned
           answer plus made-up token counts

    What it Powers ...
        - All of Milestone 1: the whole pipeline (loop, grading, cost
          math, report) gets built and tested against this for weeks,
          instantly, offline, at exactly $0
        - The planted variety is a feature: mostly-correct answers,
          a couple of wrong ones, and one correct-but-messy answer
          (like "billing" in quotes) — so the grader gets to fail
          things, the report gets to show a losing model, and real
          Claude's mess is previewed before a cent is spent


    Build No. 1 — the FakeProvider
        - a pre-written answer list with deliberate variety: correct
          labels, wrong labels, one wrapped in quotes or odd formatting
        - run() ignores modelId, systemPrompt, and userInput entirely —
          grabs the next answer off the list (cycling), returns it with
          invented token counts (e.g. inputTokens: 50, outputTokens: 3)
        - async, matching the contract's Promise — instant, but wearing
          the same wrapper as the real provider


    Tech ...
        our contract → import type { ModelProvider } from "./provider"


    Gotchas ...
        - Don't make it smarter. Its job is fitting the shape, not
          answering correctly — the machinery downstream just needs
          stuff flowing through it.
        - The loop must RECEIVE this as a parameter, never create its
          own — that's the entire swap mechanism for fake-now,
          real-later.
        - If any real API money gets spent during Milestone 1,
          something bypassed this file — find it before Milestone 2.
*/
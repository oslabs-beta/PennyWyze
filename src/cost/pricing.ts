/*
    THE PRICE LIST — pricing.ts
    The six known prices (3 models × what each charges for input and
    output tokens), written down in ONE labeled spot. This is data,
    not machinery — a lookup chart the calculator consults.


    We Build ...
        1. The PRICING lookup — each model ID mapped to its input rate
           and output rate, in dollars per MILLION tokens

    What it Powers ...
        - Every dollar figure the tool ever prints starts as a lookup
          here: the calculator reads these rates against each call's
          token counts
        - One spot means price changes are a one-line edit instead of
          a hunt through the code — and prices DO change (Sonnet's
          intro pricing literally ends 9 days after our demo)


    Build No. 1 — the PRICING lookup
        - three entries, keyed by the exact model IDs from the
          verify-reality note
        - each entry: { in: <rate>, out: <rate> } — output rates are
          higher (generating costs more than reading)
        - a comment block noting: the source (Anthropic's pricing
          page), the date checked, and that Sonnet's intro pricing
          ends Aug 31


    Tech ...
        none — a plain exported object


    Gotchas ...
        - Rates are per MILLION tokens — the ÷ 1,000,000 happens in
          the calculator, not here. These are the raw published rates.
        - This is not a visual table — nothing here prints. The
          report's on-screen table is a different thing entirely.
        - When prices change, update the date-checked comment too —
          it's what makes these numbers trustworthy months later.
*/
# Anthropic API Validation

**Date:** August 12, 2026

## Models Tested

- **Opus 5:** `claude-opus-5`
- **Sonnet 5:** `claude-sonnet-5`
- **Haiku 4.5:** `claude-haiku-4-5-20251001`

---

## Validation Script

The following throwaway script was used to make direct calls to the Anthropic API.

```ts
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
// loads your .env variables into process.env, new Anthropic() automatically reads process.env.ANTHROPIC_API_KEY

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 50,
  messages: [
    {
      role: 'user',
      content: 'What is 2 + 2? Answer with only the number.',
    },
  ],
});

console.dir(response, { depth: null });
```

The `model` was changed for each test to:

- `claude-opus-5`
- `claude-sonnet-5`
- `claude-haiku-4-5-20251001`

`temperature: 0` was then added to each request individually to test whether the model accepted it.

`import 'dotenv/config'` loads the `.env` variables into `process.env`, and `new Anthropic()` automatically reads `process.env.ANTHROPIC_API_KEY`.

## API Response

All three models returned a `usage` object containing input and output token counts.

### Example Response — Opus 5

```js
{
  model: 'claude-opus-5',
  id: 'msg_011CdyweXZEgHh1D39hJPV3d',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: '4' }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 23,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: {
      ephemeral_5m_input_tokens: 0,
      ephemeral_1h_input_tokens: 0
    },
    output_tokens: 3,
    output_tokens_details: {
      thinking_tokens: 0
    },
    service_tier: 'standard',
    inference_geo: 'global'
  }
}
```

This confirms PennyWyze can use:

```text
usage.input_tokens
usage.output_tokens
```

for token-based cost calculations.

---

## Temperature

Anthropic marks `temperature` as deprecated for newer models.

Results from the real API:

| Model         | `temperature: 0` | Result                                                |
| ------------- | ---------------- | ----------------------------------------------------- |
| **Opus 5**    | ❌ Rejected      | HTTP 400 — `temperature` is deprecated for this model |
| **Sonnet 5**  | ❌ Rejected      | HTTP 400 — `temperature` is deprecated for this model |
| **Haiku 4.5** | ✅ Accepted      | Request completed successfully                        |

PennyWyze should not assume that `temperature: 0` is supported across all models.

Our previous approach used `temperature: 0` to reduce randomness and improve repeatability. That strategy needs to be removed or redesigned for newer models.

---

## Current Pricing

**As of August 12, 2026:**

| Model         | Input Tokens | Output Tokens |
| ------------- | -----------: | ------------: |
| **Fable 5**   |     $10 / 1M |      $50 / 1M |
| **Opus 5**    |      $5 / 1M |      $25 / 1M |
| **Sonnet 5**  |      $2 / 1M |      $10 / 1M |
| **Haiku 4.5** |      $1 / 1M |       $5 / 1M |

Sonnet 5's `$2 / $10` per million input/output token pricing was originally announced as introductory pricing through August 31, 2026. Anthropic has since made this the standard price, and the previously planned increase to `$3 / $15` on September 1 will not occur.

Pricing should not be assumed to remain static. PennyWyze's pricing data will need to be maintained as Anthropic changes model pricing.

---

## Test Call Costs

Using the actual token counts returned by the API and the current pricing:

| Model         | Input Tokens | Output Tokens | Approx. Cost |
| ------------- | -----------: | ------------: | -----------: |
| **Opus 5**    |           23 |             3 |    $0.000190 |
| **Sonnet 5**  |           23 |             3 |    $0.000076 |
| **Haiku 4.5** |           22 |             5 |    $0.000047 |

---

## Additional Finding: Fable 5

Anthropic now has a fourth generally available tier:

```text
claude-fable-5
```

Fable 5 currently costs:

- **Input:** $10 / 1M tokens
- **Output:** $50 / 1M tokens

PennyWyze was designed around the following audit ladder:

```text
Opus → Sonnet → Haiku
```

We should discuss whether Fable belongs in the audit ladder before changing the implementation.

---

## Conclusions

The API spike confirmed:

- ✅ Current Opus, Sonnet, and Haiku model IDs.
- ✅ All three models provide `input_tokens` and `output_tokens`.
- ⚠️ Opus 5 and Sonnet 5 reject `temperature: 0`.
- ✅ Haiku 4.5 still accepts `temperature: 0`.
- ⚠️ Our repeatability strategy needs to be reconsidered for newer models.
- ⚠️ Model IDs and pricing need to be maintained as Anthropic's lineup evolves.
- ⚠️ Fable 5 introduces a fourth generally available model that may need to be added to PennyWyze's audit ladder.

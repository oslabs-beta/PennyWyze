## Golden Dataset Format

Golden dataset files use two fields:

- `input` — the prompt or question sent to the AI.
- `expected` — the correct answer used to evaluate the AI's response.

All dataset entries must use these exact field names.

The file must be **JSONL** (JSON Lines): one complete JSON object per
line — no wrapping array, no commas between lines.

jsonl 
{"input": "My card was charged twice", "expected": "billing"}
{"input": "App crashes on upload", "expected": "tech-problem"}


**JSONL vs regular JSON:** regular JSON is one structure parsed all at
once — a single missing comma breaks the whole file with no location
given. JSONL parses line-by-line, which is what lets PennyWyze report
"line 3 is invalid" instead of "something's wrong somewhere." Have
regular JSON? Convert first — each array entry becomes its own line.

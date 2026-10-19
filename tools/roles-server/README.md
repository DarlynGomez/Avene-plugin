# Role suggestion server

Runs on the study computer only. Takes a crop of one text element, asks the frozen vision model on
the GenAI Manager which kind of text it is, and answers with one label from a fixed list. See
`docs/ROLES_SPEC.md` sections 7 to 11 and ADR-037.

## Run

1. `cp .env.example .env` and fill in `GENAI_BASE_URL`, `GENAI_API_KEY`, `GENAI_MODEL` and
   `GENAI_TIMEOUT_SECONDS`. The `.env` file is git ignored. Never commit a key.
2. `./start.sh` (or `start.bat` on Windows). It makes a virtual environment on first run.
3. Before every session, call `GET /selftest`, or use "Check role server" in the researcher panel.

The server listens on `127.0.0.1`, port 8750 unless `ROLES_PORT` says otherwise, and refuses to start
with any other address. It warms the model once before it accepts requests.

## Endpoints

- `POST /v1/role` takes `{requestId, image (base64 PNG), crop, exportScale, fontSizePx, inputs,
  backgroundHex, mode}` and returns `{label, reason, model, ms}`. `inputs` may hold `sizeRatio`,
  `fontWeight`, `wordCount` and `centerYFraction`, plain numbers only. Every failure is
  `{label: "unsure", reason: ...}` with status 200.
- `GET /health` returns `{status, model, warm, thinking}` and makes no model call.
- `GET /selftest` sends three built-in crops and one free text probe, and reports whether image input
  worked, whether the schema was enforced, the model name and the latency. It also returns `hints`, a
  list of plain warnings: replies cut off for a model missing from `GENAI_THINKING_MODELS`, and an image
  that reported very few prompt tokens. The same cut-off warning is logged once at start when the
  warm-up reply is empty and cut off.

## Settings (environment only)

| Name | Default | Meaning |
| --- | --- | --- |
| GENAI_BASE_URL, GENAI_API_KEY, GENAI_MODEL | none | The service, the key and the frozen model tag |
| GENAI_TIMEOUT_SECONDS | 10 | How long a live request waits for the model |
| GENAI_PRECOMPUTE_TIMEOUT_SECONDS | 30 | The same for precompute runs |
| GENAI_WARMUP_TIMEOUT_SECONDS | 60 | The start-up request |
| GENAI_THINKING_MODELS | none | Comma separated tags of thinking models, which get `reasoning_effort` and a larger output limit. Never set it for a model that rejects `reasoning_effort` |
| GENAI_MAX_TOKENS, GENAI_THINKING_MAX_TOKENS | 64, 1500 | Output limits, a thinking model is held to at least 1000 |
| GENAI_MIN_IMAGE_PROMPT_TOKENS | 500 | Below this many prompt tokens for an image, the self-test warns the image may not have arrived |
| GENAI_TOKENS_PER_MINUTE | 10000 | The service limit the server paces itself under |
| ROLES_MAX_IMAGE_SIDE, ROLES_MIN_TEXT_PX | 1024, 14 | The image cap and the legibility floor |
| ROLES_PORT, ROLES_HOST | 8750, 127.0.0.1 | Loopback only |
| ROLES_LOG_PATH, ROLES_CROP_DIR | roles-server.log.jsonl, none | One JSON line per request, and where precompute crops are kept |

## Tests

`.venv/bin/python -m pytest` runs with a mocked GenAI Manager and needs no key.

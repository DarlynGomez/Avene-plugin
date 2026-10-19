# Role evaluation (S29)

Replays labelled crops through the role server and reports the measures of the decision gate. It
only reports. It never chooses a model, and it never reads a key: the server holds the key.

## What you need before a run

1. The crops, kept by the server in precompute mode with `ROLES_CROP_DIR` set: a folder of
   `<id>.png` and `<id>.json` pairs. One crop per element, for one `cropContext` (node or parent).
   The request id inside the JSON starts with the Figma node id, which matches a crop to a row of
   the truth file. The PNG is the prepared image the model saw, so it is replayed as it is.
2. The truth file, a CSV with the columns `node id, rater 1, rater 2, resolved, note`. Every row
   needs a `resolved` label from the seven (heading, body, caption, label, button text, decorative,
   unsure). A row with no resolved label stops the run. A resolved `unsure` can never be agreed
   with, so keep such elements out of the file unless that is what you want to measure.
3. The pass mark, a JSON file agreed with the advisor before any result exists:

   ```json
   {"agreedOn": "YYYY-MM-DD", "initials": ["DG", "GT"], "minAgreement": 0.0,
    "maxConfidentWrong": 0.0, "maxFailOrUnsure": 0.0, "maxLiveSeconds": 0.0}
   ```

   The tool refuses to run unless the file exists, names both people by initials, has every number,
   is committed in git with no later edits, and was committed before the run started
   (`git log -1 --format=%cI -- passmark.json`). That is the proof it was fixed first.
4. The server running with the candidate model, and its self-test passing. The tool calls
   `/selftest` first and refuses to run if it does not pass.

## Setup

```
cd tools/roles-eval
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## The S29 commands

Start the server for one candidate (see `tools/roles-server/README.md`), then, for each crop
context and each candidate:

```
cd tools/roles-eval
.venv/bin/python -m roles_eval \
  --crops ../roles-server/crops-node --truth truth-node.csv --passmark passmark.json \
  --repeats 3 --label qwen2.5vl-32b-node

.venv/bin/python -m roles_eval \
  --crops ../roles-server/crops-parent --truth truth-parent.csv --passmark passmark.json \
  --repeats 3 --label qwen2.5vl-32b-parent
```

Then stop the server, start it with the other candidate, and repeat both commands with a label
such as `gemma4-26b-node` (set `GENAI_THINKING_MODELS` for a thinking model).

`--server` defaults to `http://localhost:8750`, `--repeats` to 1, `--out` to `results`. Files are
named `results-<label>-<timestamp>.csv` and `summary-<label>-<timestamp>.json`. The exit code is 0
when every measure passes, 1 when a run finished but fails the pass mark, and 2 when it refused to run.

## Measures

Over every answer for the elements in the truth file, repeats pooled:

- agreement: share where the label equals the resolved label. `unsure` never agrees.
- confident wrong: among answers that are not `unsure`, the share that differ from resolved.
- fail or unsure: share whose reason is not `ok` or whose label is `unsure`. A reply that does not
  arrive within 13 s (the plugin's own wait) counts here as `client-timeout`.
- latency: median, 95th percentile (nearest rank) and maximum, in seconds, measured by the client.

Each is judged against the pass mark: agreement at least `minAgreement`, confident wrong and fail
or unsure at most their maximums, and the slowest reply at most `maxLiveSeconds`. The slowest
acceptable reply is compared with the maximum seen, so a single slow reply fails the run. If the
advisor means the 95th percentile instead, change `judge` in `roles_eval/measures.py` before the
pass mark is committed.

The output files hold labels, reasons and numbers only. They never hold an image, a key or any text.

## Tests

`.venv/bin/python -m pytest -q` uses a mocked server and a throwaway git repository. Nothing
leaves the machine.

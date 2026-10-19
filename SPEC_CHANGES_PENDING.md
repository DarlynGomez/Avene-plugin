# Spec changes pending

Each line names the spec section that is now out of date and the exact new wording. Copy them into the git ignored docs.

## C1 Timeouts

- ROLES_SPEC section 7 "Timeouts": the plugin waits 13 s for a live request and 60 s for a precompute request. The server waits 10 s for the model live, 30 s in precompute and 60 s for the warm-up. The plugin's wait is always at least 2 s longer than the server's, so the server answers first with its own timeout reason and the plugin treats it as an ordinary unsure reply. The plugin's own timer only fires when the server itself is hung, which stays a transport failure.
- ROLES_SPEC section 11 point 3: 5 seconds becomes 13 seconds.
- The final live value is the advisor's "slowest acceptable reply" row of the pass mark.

## C2 Self-test hints

- ROLES_SPEC section 11, self-test: the result also holds a `hints` list of plain warnings. Hint 1, "The replies were cut off. If GENAI_MODEL is a thinking model, add it to GENAI_THINKING_MODELS so it gets room to think and answer.", appears when a reply is empty with finish_reason length and the model is not in GENAI_THINKING_MODELS. Hint 2, "The service reported very few prompt tokens for an image, so the image may not have reached the model.", appears when an image request reports fewer prompt tokens than GENAI_MIN_IMAGE_PROMPT_TOKENS (default 500; qwen reports 1057 to 1290 for the self-test crops, gemma reported 221). At start the server logs hint 1 as a warning when the warm-up reply is empty and cut off.

## C3 Crops kept for replay

- ROLES_SPEC section 7 "What it keeps": in precompute mode, when ROLES_CROP_DIR is set, the server keeps for each request the prepared PNG as `<requestId>.png` and, beside it, `<requestId>.json` holding exactly requestId, crop, exportScale, fontSizePx, inputs, backgroundHex, and from the answer label, reason, model and ms. Both are written after the model answers, also when the answer is a failure (label unsure). The JSON never holds the image or any characters of the text. The request id starts with the Figma node id, which matches a crop to its layer. Nothing is kept in live mode.

## C4 Review by CSV

- ROLES_SPEC section 6 (review step): the review is a CSV round trip, as the spec allowed if S28 ran late, and no review panel is built. Menu command "Export role suggestions (researcher)" (export-role-suggestions) lists every visible text layer that holds a stored suggestion and offers a file with the columns screen, layer name, node id, model label, model, reviewed, input key, final label, note. Final label starts as the model label and reviewed as yes or no. The file holds layer names only and no characters of any text. Menu command "Import role review (researcher)" (import-role-review) reads the edited file and treats each row in this order: a node id that is unknown or not a text layer is skipped as "not found"; an input key that differs from the layer's current key is skipped as "layer changed since export"; a final label outside the seven is skipped as "label not on the list"; a row whose reviewed is not yes is left as it is; a final label of unsure removes the stored suggestion (an answer is kept); otherwise the suggestion is written with the final label, reviewed true, live false, the same input key, the model kept and at set to now. The panel then shows the counts imported, removed and skipped by reason, and nothing else. A suggestion is shown to a participant only after this import (or when it is a live one).
- ROLES_SPEC section 16, "Not built" line: remove the review step. Still not built: a review panel inside the plugin (the CSV path replaces it).

## C5 Evaluation tool

- ROLES_SPEC section 12 (S29, the gate): the measures are computed by tools/roles-eval, which replays the crops kept by the server (C3) through POST /v1/role in live mode after a passing self-test. Agreement: unsure counts as not agreeing. Confident wrong: among answers that are not unsure. Fail or unsure: reason not ok or label unsure, including a reply the client gave up on after 13 s. Latency: median, 95th percentile and maximum, measured by the client. The pass mark is a committed JSON file (agreedOn, initials of both people, minAgreement, maxConfidentWrong, maxFailOrUnsure, maxLiveSeconds) whose commit date must precede the run, which is how it is shown to have been fixed before any result existed. The slowest acceptable reply (maxLiveSeconds) is compared with the maximum latency seen. The exit code is 0 for pass, 1 for fail and 2 for refused.
- ROLES_SPEC section 12: the tool never chooses a model. It writes results-<label>-<timestamp>.csv and summary-<label>-<timestamp>.json, with no image, no text and no key.

## C6 Late suggestion

- ROLES_SPEC section 6 (the question in the panel): once the participant has opened the choices, the question and what their choice counts as (confirmed, changed) stay as they were when the choices opened. A suggestion that arrives meanwhile is shown only after they cancel or after their answer is stored, and the old text stays until the stored answer comes back.

## Blocked

Nothing so far.

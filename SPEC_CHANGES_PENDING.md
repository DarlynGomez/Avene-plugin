# Spec changes pending

Each line names the spec section that is now out of date and the exact new wording. Copy them into the git ignored docs.

## C1 Timeouts

- ROLES_SPEC section 7 "Timeouts": the plugin waits 13 s for a live request and 60 s for a precompute request. The server waits 10 s for the model live, 30 s in precompute and 60 s for the warm-up. The plugin's wait is always at least 2 s longer than the server's, so the server answers first with its own timeout reason and the plugin treats it as an ordinary unsure reply. The plugin's own timer only fires when the server itself is hung, which stays a transport failure.
- ROLES_SPEC section 11 point 3: 5 seconds becomes 13 seconds.
- The final live value is the advisor's "slowest acceptable reply" row of the pass mark.

## C2 Self-test hints

- ROLES_SPEC section 11, self-test: the result also holds a `hints` list of plain warnings. Hint 1, "The replies were cut off. If GENAI_MODEL is a thinking model, add it to GENAI_THINKING_MODELS so it gets room to think and answer.", appears when a reply is empty with finish_reason length and the model is not in GENAI_THINKING_MODELS. Hint 2, "The service reported very few prompt tokens for an image, so the image may not have reached the model.", appears when an image request reports fewer prompt tokens than GENAI_MIN_IMAGE_PROMPT_TOKENS (default 500; qwen reports 1057 to 1290 for the self-test crops, gemma reported 221). At start the server logs hint 1 as a warning when the warm-up reply is empty and cut off.

## Blocked

Nothing so far.

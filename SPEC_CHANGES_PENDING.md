# Spec changes pending

Each line names the spec section that is now out of date and the exact new wording. Copy them into the git ignored docs.

## C1 Timeouts

- ROLES_SPEC section 7 "Timeouts": the plugin waits 13 s for a live request and 60 s for a precompute request. The server waits 10 s for the model live, 30 s in precompute and 60 s for the warm-up. The plugin's wait is always at least 2 s longer than the server's, so the server answers first with its own timeout reason and the plugin treats it as an ordinary unsure reply. The plugin's own timer only fires when the server itself is hung, which stays a transport failure.
- ROLES_SPEC section 11 point 3: 5 seconds becomes 13 seconds.
- The final live value is the advisor's "slowest acceptable reply" row of the pass mark.

## Blocked

Nothing so far.

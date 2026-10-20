import { PRECOMPUTE_ROLES_COMMAND, requestPrecompute } from "./precompute";
import { requestReview } from "./review";

/** Remembers which researcher command opened the panel, any other command is ignored */
export function requestRoleCommand(command: string): void {
  if (command === PRECOMPUTE_ROLES_COMMAND) requestPrecompute();
  else requestReview(command);
}

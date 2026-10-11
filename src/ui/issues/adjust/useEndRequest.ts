import { useLayoutEffect, useRef } from "react";

/**
 * Runs the Cancel path once when an end is requested, so the preview restores and one
 * abandonment is logged, a layout effect so the sheet is gone before the next paint
 */
export function useEndRequest(endRequested: boolean, cancel: () => void) {
  const handled = useRef(false);

  useLayoutEffect(() => {
    if (endRequested && !handled.current) {
      handled.current = true;
      cancel();
    }
  });
}

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gives a conditionally-mounted dialog a real close transition.
 *
 * The parent still mounts/unmounts the dialog with `{open && <Dialog/>}`; this
 * hook delays the parent's `onClose` until the exit animation has run. Wire
 * every dismiss path (backdrop click, close button, Cancel, Escape) through the
 * returned `requestClose`, and put `data-closing={closing}` on the backdrop so
 * the stylesheet can play the reverse animation.
 */
export function useModalClose(onClose, durationMs = 200) {
  const [closing, setClosing] = useState(false);
  const timer = useRef(null);

  const requestClose = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onClose?.();
    }, durationMs);
  }, [onClose, durationMs]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return { closing, requestClose };
}

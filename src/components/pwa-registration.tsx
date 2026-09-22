import { useEffect } from "react";

/** Registers the offline shell only in browsers that support service workers. */
export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // The game itself stays playable; registration can fail in private previews.
    });
  }, []);

  return null;
}

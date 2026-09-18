/** Messages to parent spinner (iframe → spinner). */

export function postToParent(payload) {
  if (typeof window === "undefined") return;
  if (window.parent === window) return;
  try {
    window.parent.postMessage(payload, "*");
  } catch {
    /* ignore */
  }
}

export function postTourProgress(percent) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  postToParent({ type: "VR_TOUR_PROGRESS", percent: pct });
}

export function postTourReady() {
  postToParent({ type: "VR_TOUR_READY", percent: 100 });
}

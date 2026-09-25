import { CONFIG } from "./config";
import { FLOORS, getDefaultRoomViewId } from "../config/floorsConfig";

/**
 * Resolve starting panorama index from URL:
 *   ?view=<viewId>  — exact panorama
 *   ?floor=<floorId> — first available room on that floor (floorsConfig)
 * Falls back to views[0].
 */
export function resolveStartViewIndex(
  search = typeof window !== "undefined" ? window.location.search : ""
) {
  const params = new URLSearchParams(search);

  const viewParam = params.get("view");
  if (viewParam) {
    const idx = CONFIG.views.findIndex((v) => v.id === viewParam);
    if (idx >= 0) return idx;
  }

  const floorParam = params.get("floor");
  if (floorParam) {
    const floor = FLOORS.find((f) => f.id === floorParam);
    const viewId = getDefaultRoomViewId(floor);
    if (viewId) {
      const idx = CONFIG.views.findIndex((v) => v.id === viewId);
      if (idx >= 0) return idx;
    }
  }

  return 0;
}

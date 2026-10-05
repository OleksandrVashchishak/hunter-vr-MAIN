import { CONFIG } from "./config";
import { FLOORS, getDefaultRoomViewId } from "../config/floorsConfig";

/** Default spawn when opening the tour from the main menu (no ?view / ?floor). */
export const DEFAULT_START_VIEW_ID = "entry-hall-3";

/**
 * Resolve starting panorama index from URL:
 *   ?view=<viewId>  — exact panorama
 *   ?floor=<floorId> — first available room on that floor (floorsConfig)
 * Falls back to DEFAULT_START_VIEW_ID, then views[0].
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

  const defaultIdx = CONFIG.views.findIndex((v) => v.id === DEFAULT_START_VIEW_ID);
  return defaultIdx >= 0 ? defaultIdx : 0;
}

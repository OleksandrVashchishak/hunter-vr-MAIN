import { CONFIG, cubemapKey } from "./config.js";
import { FLOORS, findFloorForViewId } from "../config/floorsConfig.js";

function floorLabelSet(floor) {
  return new Set(Object.values(floor.rooms).map((room) => room.label));
}

/**
 * Unlocked views that live on this floor:
 * - room label listed in floorsConfig
 * - plus graph-connected orphans (e.g. Wellness Area) that aren't exclusive to another floor
 */
export function getViewsOnFloor(floor) {
  if (!floor) return [];

  const ownLabels = floorLabelSet(floor);
  const otherExclusive = new Set();
  for (const other of FLOORS) {
    if (other.id === floor.id) continue;
    for (const label of floorLabelSet(other)) {
      if (!ownLabels.has(label)) otherExclusive.add(label);
    }
  }

  const byId = new Map(CONFIG.views.map((view) => [view.id, view]));
  const result = new Map();

  for (const view of CONFIG.views) {
    if (view.locked) continue;
    if (ownLabels.has(view.room)) result.set(view.id, view);
  }

  const queue = Object.values(floor.rooms)
    .map((room) => room.viewId)
    .filter(Boolean);
  const seen = new Set(queue);

  while (queue.length) {
    const id = queue.shift();
    const view = byId.get(id);
    if (!view || view.locked) continue;
    if (otherExclusive.has(view.room)) continue;

    result.set(view.id, view);

    for (const neighborId of view.views || []) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      const neighbor = byId.get(neighborId);
      if (!neighbor || neighbor.locked) continue;
      if (otherExclusive.has(neighbor.room)) continue;
      queue.push(neighborId);
    }
  }

  return [...result.values()];
}

export function getCubemapKeysOnFloor(floor) {
  const out = [];
  const seen = new Set();
  for (const view of getViewsOnFloor(floor)) {
    const key = cubemapKey(view);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Catalogue match, then orphan views discovered via floor graph (Wellness Area). */
export function resolveFloorForView(view) {
  if (!view) return null;
  const byCatalog = findFloorForViewId(view.id, view.room);
  if (byCatalog) return byCatalog;
  for (const floor of FLOORS) {
    if (getViewsOnFloor(floor).some((v) => v.id === view.id)) return floor;
  }
  return null;
}

/**
 * Load every cubemap on the view's floor. On floor change, drop the previous
 * floor except the still-displayed key (freed after navigate settle).
 * @returns {{ floorId: string|null, changed: boolean }}
 */
export async function ensureFloorCubemaps({
  scene,
  cache,
  view,
  loadedFloorIdRef,
  checkAlive,
  onProgress,
  /** Cubemap still bound to the screen (previous view) — must survive until settle. */
  displayKey = null,
}) {
  const floor = resolveFloorForView(view);
  if (!floor || !cache || !scene) {
    return { floorId: null, changed: false };
  }

  const keys = getCubemapKeysOnFloor(floor);
  const priorityKey = cubemapKey(view);
  const prevFloorId = loadedFloorIdRef.current;
  const sameFloor = prevFloorId === floor.id;
  const allResident =
    sameFloor && keys.length > 0 && keys.every((key) => cache.peek(key));

  if (allResident) {
    cache.pin(keys);
    cache.touch(priorityKey);
    return { floorId: floor.id, changed: false };
  }

  const changed = !sameFloor;
  if (changed) {
    // Free previous floor VRAM, but keep whatever is still on screen + target.
    const protect = [displayKey, priorityKey].filter(Boolean);
    cache.pin(protect);
    cache.retainOnly(protect);
  }

  const total = keys.length;
  let done = keys.filter((key) => cache.peek(key)).length;
  onProgress?.({ done, total, floorId: floor.id });

  // Priority first so the active panorama is never waiting behind the queue.
  if (priorityKey) {
    await cache.get(scene, priorityKey);
    if (checkAlive && !checkAlive()) return { floorId: floor.id, changed };
    done = Math.max(done, keys.filter((key) => cache.peek(key)).length);
    onProgress?.({ done, total, floorId: floor.id });
  }

  const pinDuringWarm = new Set(keys);
  if (displayKey) pinDuringWarm.add(displayKey);
  cache.pin([...pinDuringWarm]);

  await cache.warm(
    scene,
    keys,
    checkAlive,
    ({ done: warmDone, total: warmTotal }) => {
      onProgress?.({ done: warmDone, total: warmTotal, floorId: floor.id });
    }
  );

  if (checkAlive && !checkAlive()) return { floorId: floor.id, changed };

  // Keep displayKey until goToNextPoint settle swaps materials off it.
  const keep = new Set(keys);
  if (displayKey) keep.add(displayKey);
  cache.pin([...keep]);
  cache.retainOnly([...keep]);
  loadedFloorIdRef.current = floor.id;

  onProgress?.({ done: total, total, floorId: floor.id });
  return { floorId: floor.id, changed };
}

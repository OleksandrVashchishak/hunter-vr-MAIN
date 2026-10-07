import { Vector3 } from "@babylonjs/core";
import { worldPos } from "./config";

/** Optional per-view camera facing (degrees) for menu/minimap entry. */
export function viewLookYawDegrees(view) {
  if (view?.lookYaw == null || view.lookYaw === "") return null;
  const n = Number(view.lookYaw);
  return Number.isFinite(n) ? n : null;
}

export function radToLookYawDegrees(rad) {
  let deg = ((Number(rad) || 0) * 180) / Math.PI;
  // Normalize to (-180, 180] for nicer config snippets
  deg = ((((deg + 180) % 360) + 360) % 360) - 180;
  if (deg === -180) deg = 180;
  return Math.round(deg * 10) / 10;
}

export function cameraLookYawDegrees(camera) {
  if (!camera) return 0;
  return radToLookYawDegrees(camera.rotation.y);
}

/** Apply `lookYaw` (menu/minimap entry). No-op if unset. */
export function applyEntryLookYaw(camera, view) {
  if (!camera || !view) return false;
  const lookYaw = viewLookYawDegrees(view);
  if (lookYaw == null) return false;
  // If quaternion is set, Euler `rotation` is ignored — clear so yaw sticks every hop.
  camera.rotationQuaternion = null;
  camera.rotation.x = 0;
  camera.rotation.y = (lookYaw * Math.PI) / 180;
  camera.rotation.z = 0;
  return true;
}

/**
 * Initial spawn facing: `lookYaw` if set, else `look` target point.
 * Returns true if orientation was applied.
 */
export function applyCameraLook(camera, view) {
  if (!camera || !view) return false;
  if (applyEntryLookYaw(camera, view)) return true;

  if (view.look) {
    const look = worldPos(view.look);
    camera.setTarget(new Vector3(look.x, look.y, look.z));
    return true;
  }

  return false;
}

/** Live-edit: set camera yaw from degrees (level pitch). */
export function setCameraLookYawDegrees(camera, degrees) {
  if (!camera) return;
  const next = Math.round((Number(degrees) || 0) * 10) / 10;
  camera.rotationQuaternion = null;
  camera.rotation.x = 0;
  camera.rotation.y = (next * Math.PI) / 180;
  camera.rotation.z = 0;
  return next;
}

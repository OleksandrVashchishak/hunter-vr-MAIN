import { Vector3, Tools } from "@babylonjs/core";
import { CONFIG, worldPos } from "./config";

/** Pick nearest neighbor view id from a floor click. */
export const pickNextViewFromClick = (pickInfo, camera, currentIndex) => {
  if (!pickInfo.pickedPoint) return null;

  const clickDir = pickInfo.pickedPoint.subtract(camera.position).normalize();
  const curr = CONFIG.views[currentIndex.current];
  const neighbors = curr.views;
  let bestId = null;
  let bestAngle = Infinity;

  neighbors.forEach((neighborId) => {
    const neighbor = CONFIG.views.find((v) => v.id === neighborId);
    if (!neighbor || neighbor.locked) return;

    const np = worldPos(neighbor.position);
    const neighborDir = new Vector3(
      np.x - camera.position.x,
      np.y - camera.position.y,
      np.z - camera.position.z
    ).normalize();

    const dot = Vector3.Dot(clickDir, neighborDir);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle < bestAngle) {
      bestAngle = angle;
      bestId = neighborId;
    }
  });

  const THRESHOLD = Tools.ToRadians(80);
  return bestAngle < THRESHOLD ? bestId : null;
};

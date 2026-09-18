import { Vector3, Tools } from "@babylonjs/core";
import { CONFIG } from "./config";

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
    if (!neighbor) return;

    const neighborDir = new Vector3(
      neighbor.position.x - camera.position.x,
      neighbor.position.y - camera.position.y,
      neighbor.position.z - camera.position.z
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

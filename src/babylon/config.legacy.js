const Z_INT = 76;

/**
 * true  — GLB + camera fly + dual-cubemap projection (current tour)
 * false — no model; panoramas on a skybox; transitions via canvas blur
 */
export const USE_MODEL = false;

/**
 * Tour viewpoints.
 * - id: navigation / UI key
 * - cubemap: asset folder prefix when it differs from id (legacy filenames)
 * - views: neighbor ids for click-to-navigate
 */
export const CONFIG = {
  views: [
    {
      id: "main",
      position: { x: -159.99, y: 7.32, z: -37.99 + Z_INT },
      look: { x: -404.681, y: 7.32, z: -35.681 + Z_INT },
      views: ["piano", "corridor", "plasma"],
      room: "Living room",
    },
    {
      id: "plasma",
      position: { x: -160.99, y: 7.32, z: -328.351 + Z_INT },
      look: { x: -404.681, y: 159.32, z: -35.681 },
      views: ["main", "window", "kitchen"],
      room: "Living room",
    },
    {
      id: "window",
      position: { x: -400.681, y: 7.32, z: -334.351 + Z_INT },
      look: { x: -404.681, y: 159.32, z: -35.681 },
      views: ["main", "plasma", "kitchen", "piano"],
      room: "Living room",
    },
    {
      id: "piano",
      position: { x: -404.681, y: 7.32, z: -39.681 + Z_INT },
      look: { x: -404.681, y: 159.32, z: -35.681 },
      views: ["main", "window", "kitchen"],
      room: "Living room",
    },
    {
      id: "kitchen",
      cubemap: "newcithecn",
      position: { x: -581.656, y: 7, z: -37.99 + Z_INT },
      look: { x: -581.656, y: 159.32, z: -37.99 },
      views: ["window", "piano"],
      room: "Kitchen",
    },
    {
      id: "corridor",
      position: { x: 39.691, y: 7, z: -37.99 + Z_INT },
      look: { x: -1969.82, y: -1593.02, z: -305.42 },
      views: ["cabinet", "bedroom1", "main"],
      room: "Hall",
    },
    {
      id: "cabinet",
      position: { x: 90.134, y: 7, z: -235.968 + Z_INT },
      look: { x: -2474.25, y: -1593.02, z: 163.15 },
      views: ["corridor"],
      room: "Office",
    },
    {
      id: "bathroom",
      position: { x: 542.268, y: 7, z: 135.236 + Z_INT },
      look: { x: -4995.59, y: -1593.02, z: -2062.61 },
      views: ["corridor", "bedroom1"],
      room: "Bathroom",
    },
    {
      id: "bedroom1",
      cubemap: "badroom1",
      position: { x: 554.569, y: 7, z: -37.99 + Z_INT },
      look: { x: -4995.59, y: -1593.02, z: -305.42 },
      views: ["bedroom2", "corridor", "bathroom"],
      room: "Bedroom",
    },
    {
      id: "bedroom2",
      cubemap: "badroom2",
      position: { x: 554.569, y: 7, z: -241.781 + Z_INT },
      look: { x: -4995.59, y: -1593.02, z: 174.29 },
      views: ["bedroom1"],
      room: "Bedroom",
    },
  ],
};

/** Cubemap asset prefix (legacy filenames may differ from id). */
export function cubemapKey(view) {
  return view.cubemap || view.id;
}

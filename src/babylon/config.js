/**
 * true  — show debug toolbar (align + hotspot edit + panorama/model toggle)
 * false — hide those buttons in production
 */
export const DEV_MODE = true;

/**
 * true  — GLB + camera fly + dual-cubemap projection
 * false — no model; panoramas on a skybox; transitions via canvas blur
 */
export const USE_MODEL = true;

/**
 * true  — skip cubemaps; keep GLB materials (debug scale / cage)
 * false — normal projected panoramas
 */
export const HIDE_PANORAMS = false;

/**
 * Horizontal cam frame (Y/height stays as in config — already looks ok).
 * Config stores Max→Bab as (Mx, Mz, My) → (x, y, z).
 *
 * Try in order until you spawn inside:
 *   "negZ"      (x, y, -z)     ← current / Blender handedness
 *   "negXZ"     (-x, y, -z)    ← + mirror X
 *   "negX"      (-x, y, z)
 *   "none"      (x, y, z)
 *   "swap"      (z, y, x)      ← Max X/Y swapped into Bab X/Z
 *   "swapNegZ"  (z, y, -x)
 *   "swapNegX"  (-z, y, x)
 *   "swapNegXZ" (-z, y, -x)
 */
export const CAM_XZ = "negXZ";

/**
 * true  — floor transition points only for neighbor panoramas (view.views)
 * false — points for every panorama except the current one
 */
export const SHOW_NEAR_POINTS = true;

/** true — hide all floor transition points */
export const HIDE_POINTS = false;

/**
 * true  — hide floor points behind cage geometry (raycast vs GLB each ~2 frames)
 * false — skip occlusion; points stay visible while in visibleIds
 */
export const HOTSPOT_OCCLUSION = false;

/** Runtime cam frame. Use everywhere instead of raw view.position / look. */
export function worldPos({ x, y, z }) {
  switch (CAM_XZ) {
    case "negZ":
      return { x, y, z: -z };
    case "negX":
      return { x: -x, y, z };
    case "negXZ":
      return { x: -x, y, z: -z };
    case "swap":
      return { x: z, y, z: x };
    case "swapNegZ":
      return { x: z, y, z: -x };
    case "swapNegX":
      return { x: -z, y, z: x };
    case "swapNegXZ":
      return { x: -z, y, z: -x };
    case "none":
    default:
      return { x, y, z };
  }
}

/** Config/Max space ← runtime world (inverse of worldPos). */
export function configPos({ x, y, z }) {
  switch (CAM_XZ) {
    case "negZ":
      return { x, y, z: -z };
    case "negX":
      return { x: -x, y, z };
    case "negXZ":
      return { x: -x, y, z: -z };
    case "swap":
      return { x: z, y, z: x };
    case "swapNegZ":
      return { x: -z, y, z: x };
    case "swapNegX":
      return { x: z, y, z: -x };
    case "swapNegXZ":
      return { x: -z, y, z: -x };
    case "none":
    default:
      return { x, y, z };
  }
}

/** Floor marker XYZ in config space. Falls back to camera `position`. */
export function viewHotspotPos(view) {
  return view?.hotspot || view?.position;
}

/**
 * Tour viewpoints (coords from cordinates.txt, Max Z-up → Babylon Y-up).
 * Outdoor×3: coords in config, panos not in new-panorams yet.
 * bedroom-4-3: Bathroom 4 cam2 panos (id kept legacy).
 * bedroom-4-4: Bedroom 4 Camera 3 (↔ primary-hall-4).
 * bedroom-5-hall: ↔ office-2, office-bathroom-2, primary-hall-2/3.
 * bathroom-4-1: panos missing (coords from Camera_Bathroom_1).
 * mudroom-2: Corona Camera001-2.
 *
 * Optional per-view: `yaw` (degrees) — cubemap rotation around world Y
 * so a wrongly oriented bake aligns to the model. Tune via Align mode in toolbar.
 * Optional: `hotspot: { x, y, z }` — floor marker offset from camera `position`
 * (same Max→Bab space). Default = camera. Tune via Hotspot edit in toolbar.
 * Optional: `bigHotspot: true` — floating pulsating sphere at `hotspot`/`position`
 * (no floor snap; Y stays as config). Use for hard-to-see spots (stairs, voids).
 * Optional: `bigNeighborHotspots: ["view-id"]` — while standing on this view, those
 * neighbor markers render as big spheres (even if the neighbor has no `bigHotspot`).
 * Optional: `locked: true` — show gray floor hotspot, no click / no navigate.
 */
export const CONFIG = {
  views: [
    {
      id: "primary-bedroom-3",
      position: { x: 534.759, y: 905.829, z: 1254.816 },
      look: { x: 700.073, y: 905.829, z: 1488.588 },
      views: ["primary-bedroom-2", "primary-bedroom-1", "primary-hall-1"],
      room: "Primary Bedroom",
      yaw: 90,
    },
    {
      id: "primary-bedroom-1",
      position: { x: 328.025, y: 905.829, z: 1179.331 },
      look: { x: 700.073, y: 905.829, z: 1488.588 },
      views: ["primary-bedroom-3", "primary-bedroom-2", "primary-hall-1", 'closet'],
      room: "Primary Bedroom",
      yaw: 90,
    },
    {
      id: "primary-bedroom-2",
      position: { x: 700.073, y: 905.829, z: 1488.588 },
      look: { x: 534.759, y: 905.829, z: 1254.816 },
      views: ["primary-bedroom-1", "primary-bedroom-3"],
      room: "Primary Bedroom",
      yaw: 90,
      hotspot: { x: 720.215, y: 905.829, z: 1416.751 },
    },
    {
      id: "closet",
      position: { x: 99.284, y: 905.829, z: 1489.656 },
      look: { x: 700.073, y: 905.829, z: 1488.588 },
      views: [ "primary-bedroom-1", 'primary-hall-1'],
      room: "Closet",
      yaw: 90,
      hotspot: { x: 89.912, y: 905.829, z: 1286.042 },
    },
    {
      id: "primary-bathroom-1",
      position: { x: -226.291, y: 905.829, z: 792.284 },
      look: { x: -160.128, y: 905.829, z: 903.747 },
      views: ["primary-bathroom-2"],
      room: "Primary Bathroom",
      yaw: 90,
    },
    {
      id: "primary-bathroom-2",
      position: { x: -160.128, y: 905.829, z: 903.747 },
      look: { x: -226.291, y: 905.829, z: 792.284 },
      views: ["primary-bathroom-1", "primary-hall-2"],
      room: "Primary Bathroom",
      hotspot: { x: -202.118, y: 905.829, z: 971.902 },
      yaw: 90,
    },
    { 
      id: "primary-hall-1",
      position: { x: -51.59, y: 905.829, z: 1184.943 },
      look: { x: -205.162, y: 905.829, z: 1184.943 },
      views: ["primary-hall-2", "primary-bedroom-1", 'closet', "primary-bathroom-2"],
      room: "Primary Hall",
      yaw: 90,
    },
    {
      id: "primary-hall-2",
      position: { x: -205.162, y: 905.829, z: 1184.943 },
      look: { x: -51.59, y: 905.829, z: 1184.943 },
      views: ["primary-hall-1", "primary-hall-3", "bedroom-5-hall", 'primary-bathroom-2'],
      room: "Primary Hall",
      yaw: 90,
    },
    {
      id: "primary-hall-3",
      position: { x: -783.491, y: 905.829, z: 1246.964 },
      look: { x: -205.162, y: 905.829, z: 1184.943 },
      views: ["primary-hall-2", "primary-hall-4", "bedroom-5-hall", "stair-case-2"],
      room: "Primary Hall",
      yaw: 90,
    },
    {
      id: "primary-hall-4",
      position: { x: -1111.076, y: 905.829, z: 1188.22 },
      look: { x: -783.491, y: 905.829, z: 1246.964 },
      views: ["primary-hall-3", "bedroom-4-4"],
      room: "Primary Hall",
      yaw: 90,
    },
    {
      id: "bedroom-4-1",
      position: { x: -1478.81, y: 890.991, z: 1195.55 },
      look: { x: -1404.327, y: 890.991, z: 1017.223 },
      views: ["bedroom-4-2", "bedroom-4-3"],
      room: "Bedroom 4",
      yaw: -91,
    },
    {
      id: "bedroom-4-2",
      position: { x: -1404.327, y: 890.991, z: 1017.223 },
      look: { x: -1478.81, y: 890.991, z: 1195.55 },
      views: ["bedroom-4-1", "bedroom-4-4"],
      room: "Bedroom 4",
      yaw: -91,
    },
    {
      id: "bathroom-4-2",
      position: { x: -1236.243, y: 890.991, z: 1398.375 },
      look: { x: -1404.433, y: 890.991, z: 1372.846 },
      views: [ "bedroom-4-3"],
      room: "Bathroom 4",
      yaw: -91, 
    },
    {
      id: "bedroom-4-3",
      position: { x: -1404.433, y: 890.991, z: 1372.846 },
      look: { x: -1236.243, y: 890.991, z: 1398.375 },
      views: [  'bathroom-4-2', 'bedroom-4-1'],
      room: "Bathroom 4",
      yaw: -91,
    },
    {
      id: "bedroom-4-4",
      position: { x: -1244.82, y: 890.991, z: 1096.781 },
      look: { x: -1111.076, y: 905.829, z: 1188.22 },
      views: ["primary-hall-4",  "bedroom-4-2"],
      room: "Bedroom 4",
      yaw: -135,
    },
    {
      id: "bedroom-5-hall",
      position: { x: -357.524, y: 890.991, z: 1276.168 },
      look: { x: -359.542, y: 890.991, z: 1576.75 },
      views: ["office-2", "office-bathroom-2", "primary-hall-2", "primary-hall-3"],
      room: "Hall",
      yaw: -136,
    },
    {
      id: "office-1",
      position: { x: -111.088, y: 890.991, z: 1752.144 },
      look: { x: -359.542, y: 890.991, z: 1576.75 },
      views: ["office-2"],
      room: "Office",
      yaw: -91,
    },
    {
      id: "office-2",
      position: { x: -359.542, y: 890.991, z: 1576.75 },
      look: { x: -111.088, y: 890.991, z: 1752.144 },
      views: ["office-1", "office-bathroom-1", "office-bathroom-2", "bedroom-5-hall"],
      room: "Office",
      yaw: 179,
    },
    {
      id: "office-bathroom-1",
      position: { x: -239.285, y: 890.991, z: 1402.23 },
      look: { x: -290.145, y: 890.991, z: 1501.488 },
      views: ["office-bathroom-2"],
      room: "Office Bathroom",
      yaw: -91,
    },
    {
      id: "office-bathroom-2",
      position: { x: -290.145, y: 890.991, z: 1501.488 },
      look: { x: -239.285, y: 890.991, z: 1402.23 },
      views: ["office-bathroom-1", "office-2", "bedroom-5-hall"],
      room: "Office Bathroom",
      yaw: -91,
    },
    {
      id: "living",
      position: { x: 317.719, y: 555.764, z: 1380.343 },
      look: { x: -213.906, y: 555.764, z: 1368.082 },
      views: ["living-2", "living-3", "dining", "outdoor-1", "outdoor-2", "outdoor-3"],
      room: "Living Room",
      yaw: 126,
      hotspot: { x: 328.945, y: 555.764, z: 1477.062 },
    },
    {
      id: "living-3",
      position: { x: 765.358, y: 555.764, z: 1241.794 },
      look: { x: 317.719, y: 555.764, z: 1380.343 },
      views: ["living", 'outdoor-3'],
      room: "Living Room",
      yaw: 90,
      hotspot: { x: 774.613, y: 555.764, z: 1426.772 },
    },
    {
      id: "living-2",
      position: { x: 107.853, y: 555.647, z: 1118.265 },
      look: { x: 317.719, y: 555.647, z: 1380.343 },
      views: ["living", "dining", "kitchen"],
      room: "Living Room",
      yaw: 146,
      hotspot: { x: 20.877, y: 555.647, z: 1167.05 },
    },
    {
      id: "dining",
      position: { x: -213.906, y: 555.647, z: 1368.082 },
      look: { x: 317.719, y: 555.647, z: 1380.343 },
      views: ["dining-2", "living", "living-3", 'living-2', "kitchen", "kitchen-2"],
      room: "Dining Room",
      yaw: 126,
      hotspot: { x: -168.211, y: 555.647, z: 1309.208 },
    },
    {
      id: "dining-2",
      position: { x: -433.282, y: 555.647, z: 1210.377 },
      look: { x: -213.906, y: 555.647, z: 1368.082 },
      views: ["dining", "living",  "entry-hall-1", 'kitchen-2', "stair-case-2"],
      room: "Dining Room",
      yaw: 90,
    },
    {
      id: "kitchen",
      position: { x: -119.561, y: 555.647, z: 766.581 },
      look: { x: 317.719, y: 555.647, z: 1380.343 },
      views: ["dining", 'kitchen-2'],
      room: "Kitchen",
      yaw: 90,
      hotspot: { x: -76.012, y: 555.647, z: 825.743 },
    },
    {
      id: "kitchen-2",
      position: { x: -338.657, y: 555.706, z: 1019.756 },
      look: { x: -119.561, y: 555.706, z: 766.581 },
      views: [ "dining", 'living-2', 'kitchen'],
      room: "Kitchen",
      yaw: 90,
    },
    {
      id: "entry-hall-1",
      position: { x: -774.5, y: 555.647, z: 1157.144 },
      look: { x: -774.5, y: 555.647, z: 1023.059 },
      views: ["entry-hall-2", "entry-hall-3", "living", "dining-2", "stair-case", "stair-case-2"],
      room: "Entry Hall",
      yaw: 90,
    },
    {
      id: "entry-hall-2",
      position: { x: -1183.333, y: 555.647, z: 1135.721 },
      look: { x: -774.5, y: 555.647, z: 1157.144 },
      views: ["entry-hall-1", "main-powder", "bedroom-3-3"],
      room: "Entry Hall",
      yaw: 90,
    },
    {
      id: "entry-hall-3",
      position: { x: -774.5, y: 555.647, z: 1023.059 },
      look: { x: -774.5, y: 555.647, z: 1157.144 },
      views: ["entry-hall-1"],
      room: "Entry Hall",
      yaw: 8,
    },
    {
      id: "outdoor-1",
      position: { x: 266.265, y: 555.647, z: 2344.781 },
      look: { x: 869.57, y: 555.647, z: 1921.735 },
      views: ["outdoor-2"],
      room: "Outdoor",
      yaw: 10,
    },
    {
      id: "outdoor-2",
      position: { x: 869.57, y: 555.647, z: 1921.735 },
      look: { x: 266.265, y: 555.647, z: 2344.781 },
      views: [ "outdoor-1", "outdoor-3"],
      room: "Outdoor",
      yaw: 10,
    },
    {
      id: "outdoor-3",
      position: { x: 1026.008, y: 555.647, z: 1241.794 },
      look: { x: 765.358, y: 555.647, z: 1241.794 },
      views: [ "outdoor-2", 'living-3'],
      room: "Outdoor",
      yaw: 90,
    },
    {
      id: "stair-case",
      position: { x: -774.5, y: 386.247, z: 1476.864 },
      look: { x: -774.5, y: 555.647, z: 1023.059 },
      views: ['stair-foyer-3', 'stair-foyer-1', 'entry-hall-1'],
      room: "Stair Case",
      bigHotspot: true,
      bigNeighborHotspots: ["entry-hall-1"],
      hotspot: { x: -774.5, y: 320, z: 1476.864 },
    },
    {
      // Hall5 — stairs between Floor II and Floor III
      id: "stair-case-2",
      position: { x: -762.778, y: 715.769, z: 1476.599 },
      look: { x: -783.491, y: 905.829, z: 1246.964 },
      views: ['dining-2', 'primary-hall-3', 'entry-hall-1'],
      room: "Upper Stair Case",
      yaw: 90,
      bigHotspot: true,
      bigNeighborHotspots: ["primary-hall-3"],
    },
    {
      id: "bedroom-3-1",
      position: { x: -1515.576, y: 555.647, z: 1184.0 },
      look: { x: -1403.273, y: 555.647, z: 1397.857 },
      views: ["bedroom-3-2"],
      room: "Bedroom 3",
      yaw: -85,
    },
    {
      id: "bedroom-3-2",
      position: { x: -1403.273, y: 555.647, z: 1397.857 },
      look: { x: -1515.576, y: 555.647, z: 1184.0 },
      views: [ "bathroom-3-2", "bedroom-3-1", "bedroom-3-3"],
      room: "Bedroom 3",
      yaw: -85,
    },
    {
      id: "bedroom-3-3",
      position: { x: -1258.002, y: 555.647, z: 1270.051 },
      look: { x: -1403.273, y: 555.647, z: 1397.857 },
      views: ["entry-hall-2", "bedroom-3-2", "bathroom-3-2"],
      room: "Bedroom 3",
      yaw: 180,
    },
    {
      id: "bathroom-3-1",
      position: { x: -1142.074, y: 555.647, z: 1416.295 },
      look: { x: -1203.993, y: 555.647, z: 1423.739 },
      views: ["bathroom-3-2", "bedroom-3-2"],
      room: "Bathroom 3",
      yaw: 90,
    },
    {
      id: "bathroom-3-2",
      position: { x: -1203.993, y: 555.647, z: 1423.739 },
      look: { x: -1142.074, y: 555.647, z: 1416.295 },
      views: ["bathroom-3-1", "bedroom-3-2", "bedroom-3-3"],
      room: "Bathroom 3",
      yaw: 95,
    },
    {
      id: "main-powder",
      position: { x: -1275.452, y: 555.647, z: 946.044 },
      look: { x: -774.5, y: 555.647, z: 1157.144 },
      views: ["entry-hall-2"],
      room: "Main Powder Room",
      yaw: 25,
    },
    {
      id: "stair-foyer-1",
      position: { x: -838.593, y: 183.014, z: 1163.529 },
      look: { x: -956.286, y: 183.014, z: 1476.864 },
      views: ["stair-foyer-2", 'bedroom-1-2', "stair-foyer-3", "stair-case", "entry-hall-3", "game-room-2", "lower-powder-2"],
      room: "Stair Foyer",
      yaw: 90,
      hotspot: { x: -887.523, y: 183.014, z: 1240.629 },
    },
    {
      id: "stair-foyer-2",
      position: { x: -956.286, y: 183.014, z: 1476.864 },
      look: { x: -838.593, y: 183.014, z: 1163.529 },
      views: ["stair-foyer-1", "stair-foyer-3", "stair-foyer-4"],
      room: "Stair Foyer",
      yaw: 180,
    },
    {
      id: "stair-foyer-3",
      position: { x: -607.929, y: 183.014, z: 1020.832 },
      look: { x: -838.593, y: 183.014, z: 1163.529 },
      views: ["stair-foyer-1", 'stair-case',  "stair-foyer-2", "mudroom-1", "wellness-1", "entry-hall-3", "game-room-2"],
      room: "Stair Foyer",
      yaw: 180,
    },
    {
      id: "stair-foyer-4",
      position: { x: -958.346, y: 183.014, z: 1936.715 },
      look: { x: -956.286, y: 183.014, z: 1476.864 },
      views: ["stair-foyer-2", "bedroom-2-2"],
      room: "Stair Foyer",
      yaw: 225,
    },
    {
      id: "mudroom-1",
      position: { x: -657.957, y: 153.053, z: 685.729 },
      look: { x: -527.114, y: 153.053, z: 521.517 },
      views: ["mudroom-2", "stair-foyer-3"],
      room: "Mudroom",
      yaw: 90,
    },
    {
      id: "mudroom-2",
      position: { x: -527.114, y: 153.053, z: 521.517 },
      look: { x: -657.957, y: 153.053, z: 685.729 },
      views: ["mudroom-1",],
      room: "Mudroom",
      yaw: 180,
    },
    {
      id: "gym-1",
      position: { x: 232.278, y: 124.317, z: 1376.012 },
      look: { x: 118.884, y: 124.317, z: 1177.007 },
      views: ["gym-2"],
      room: "Gym",
      yaw: 170,
    },
    {
      id: "gym-2",
      position: { x: -4.377, y: 152.002, z: 1177.007 },
      look: { x: 232.278, y: 152.002, z: 1376.012 },
      views: ["gym-1", "wellness-2"],
      room: "Gym",
      yaw: 143,
    },
    // {
    //   id: "gym-3",
    //   position: { x: 118.884, y: 151.962, z: 1177.007 },
    //   look: { x: 232.278, y: 151.962, z: 1376.012 },
    //   views: ["gym-1", "gym-2", "wellness-1"],
    //   room: "Gym",
    // },
    {
      id: "wellness-1",
      position: { x: -380.193, y: 152.53, z: 1114.33 },
      look: { x: -380.294, y: 152.53, z: 1223.585 },
      views: ["wellness-2", "gym-2", "stair-foyer-3", "sauna-3"],
      room: "Wellness Area",
      yaw: 180,
      hotspot: { x: -376.976, y: 152.53, z: 1079.881 },
    },
    {
      id: "wellness-2",
      position: { x: -380.294, y: 152.002, z: 1223.585 },
      look: { x: -380.193, y: 152.002, z: 1114.33 },
      views: ["wellness-1", "gym-2", "massage-2", "sauna-3"],
      room: "Wellness Area",
      yaw: 170,
    },
    {
      id: "sauna-1",
      position: { x: -134.256, y: 182.798, z: 1794.043 },
      look: { x: -331.538, y: 182.798, z: 1913.838 },
      views: [ "sauna-3",],
      room: "Sauna",
      yaw: 180,
    },
    {
      id: "sauna-2",
      position: { x: -331.538, y: 182.798, z: 1913.838 },
      look: { x: -134.256, y: 182.798, z: 1794.043 },
      views: [ "sauna-3",],
      room: "Sauna",
    },
    {
      id: "sauna-3",
      position: { x: -353.943, y: 182.723, z: 1766.893 },
      look: { x: -134.256, y: 182.723, z: 1794.043 },
      views: ["sauna-1", "sauna-2", "wellness-2", "massage-2"],
      room: "Sauna",
      yaw: 170,
    },
    {
      id: "massage-1",
      position: { x: -137.001, y: 181.668, z: 1581.067 },
      look: { x: -309.749, y: 181.668, z: 1467.755 },
      views: ["massage-2"],
      room: "Massage Room",
      yaw: -80,
    },
    {
      id: "massage-2",
      position: { x: -309.749, y: 152.002, z: 1467.755 },
      look: { x: -137.001, y: 152.002, z: 1581.067 },
      views: ["massage-1", "wellness-2" ,'sauna-3'],
      room: "Massage Room",
      yaw: 90,
      hotspot: { x: -354.22, y: 152.002, z: 1464.788 },
    },
    {
      id: "bedroom-2-1",
      position: { x: 67.275, y: 103.285, z: 2225.562 },
      look: { x: -199.215, y: 103.285, z: 2071.556 },
      views: ['bedroom-2-2', 'bathroom-2-2'],
      room: "Bedroom 2",
      yaw: -90, 
    },
    {
      id: "bedroom-2-2",
      position: { x: -199.215, y: 103.285, z: 2071.556 },
      look: { x: 67.275, y: 103.285, z: 2225.562 },
      views: ["bedroom-2-1", "bathroom-2-2", "stair-foyer-4"],
      room: "Bedroom 2",
      yaw: -270,
    },
    {
      id: "bathroom-2-1",
      position: { x: 324.36, y: 116.904, z: 1851.858 },
      look: { x: 324.36, y: 116.904, z: 1988.079 },
      views: ["bathroom-2-2",],
      room: "Bathroom 2",
      yaw: 90,
    },
    {
      id: "bathroom-2-2",
      position: { x: 324.36, y: 116.904, z: 1988.079 },
      look: { x: 324.36, y: 116.904, z: 1851.858 },
      views: ["bathroom-2-1", 'bedroom-2-2', 'bedroom-2-1'],
      room: "Bathroom 2",
    },
    {
      id: "game-room-1",
      position: { x: -1743.641, y: 188.505, z: 914.537 },
      look: { x: -1321.269, y: 188.505, z: 1156.996 },
      views: ["game-room-2", "game-room-3"],
      room: "Game Room",
      hotspot: { x: -1732.915, y: 188.505, z: 1060.049 },
    },
    {
      id: "game-room-2",
      position: { x: -1321.269, y: 188.505, z: 1156.996 },
      look: { x: -1743.641, y: 188.505, z: 914.537 },
      views: ["game-room-1", "game-room-3", 'stair-foyer-1',  'stair-foyer-3'],
      room: "Game Room",
      yaw: -90,
    },
    {
      id: "game-room-3",
      position: { x: -1957.087, y: 188.505, z: 542.934 },
      look: { x: -1743.641, y: 188.505, z: 914.537 },
      views: ["game-room-1", "game-room-2"],
      room: "Game Room",
      yaw: 180,
      hotspot: { x: -1873.817, y: 188.505, z: 557.461 },
    },
    {
      id: "bedroom-1-1",
      position: { x: -1759.029, y: 188.505, z: 1488.221 },
      look: { x: -1423.943, y: 188.505, z: 1296.168 },
      views: ["bedroom-1-2", "game-room-1"],
      room: "Bedroom 1", 
      hotspot: { x: -1866.359, y: 188.505, z: 1536.033 },
    },
    {
      id: "bedroom-1-2",
      position: { x: -1423.943, y: 188.505, z: 1296.168 },
      look: { x: -1759.029, y: 188.505, z: 1488.221 },
      views: ["bedroom-1-1", "bathroom-1-2", "stair-foyer-1"],
      room: "Bedroom 1",
      yaw: 270,
      hotspot: { x: -1381.806, y: 188.505, z: 1282.125 },
    },
    {
      id: "bathroom-1-1",
      position: { x: -1234.418, y: 188.505, z: 1466.594 },
      look: { x: -1351.526, y: 188.505, z: 1365.581 },
      views: ["bathroom-1-2"],
      room: "Bathroom 1",
      yaw: 80,
    },
    {
      id: "bathroom-1-2",
      position: { x: -1351.526, y: 188.505, z: 1365.581 },
      look: { x: -1234.418, y: 188.505, z: 1466.594 },
      views: ["bathroom-1-1", "bedroom-1-2"],
      room: "Bathroom 1",
      yaw: 180,
    },
    {
      id: "lower-powder",
      position: { x: -833.452, y: 196.384, z: 915.714 },
      look: { x: -838.593, y: 196.384, z: 1163.529 },
      views: ["lower-powder-2"],
      room: "Lower Powder Room",
      yaw: -90,
    },
    {
      id: "lower-powder-2",
      position: { x: -895.835, y: 183.014, z: 995.913 },
      look: { x: -833.452, y: 183.014, z: 915.714 },
      views: ["lower-powder", "stair-foyer-1", 'stair-foyer-2'],
      room: "Lower Powder Room",
      yaw: 35,
    },
  ],
};

/** Cubemap asset prefix (legacy filenames may differ from id). */
export function cubemapKey(view) {
  return view.cubemap || view.id;
}

/** Outdoor cams sit outside the GLB cage — hide model, skybox-only. */
export function isExteriorView(view) {
  return !!view && (view.room === "Outdoor" || String(view.id || "").startsWith("outdoor-"));
}

/** Cubemap asset keys for all neighbor views (deduped, order preserved). */
export function neighborCubemapKeys(view) {
  if (!view?.views?.length) return [];
  const out = [];
  const seen = new Set();
  for (const id of view.views) {
    const neighbor = CONFIG.views.find((v) => v.id === id);
    if (!neighbor || neighbor.locked) continue;
    const key = cubemapKey(neighbor);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

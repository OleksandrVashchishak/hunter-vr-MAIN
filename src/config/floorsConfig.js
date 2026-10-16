/**
 * Shared floor / room catalogue.
 * - listOrder → Floor / Room selectors (RoomSelector)
 * - minimapOrder + hotspots → calibrate 3D→SVG projection (minimapProjection)
 * - pinPos: { [viewId]: [x, y] } → independent minimap pin overrides
 *   (drag via ?editMinimapHotspots=1)
 * - rooms.*.labelPos → minimap text position [x, y] in floor viewBox
 *   (fallback: legacy hotspots[i]; drag via ?editMinimapLabels=1)
 * Labels: `label` for list, `shortLabel` for minimap (falls back to label).
 */

import { CONFIG } from "../babylon/config.js";
import { getMinimapPins, projectViewOnFloor } from "./minimapProjection.js";

export const FLOORS = [
  {
    id: "floor-i",
    label: "Floor I",
    viewBox: { w: 258, h: 185 },
    hotspots: [
      [172.909, 92.909],
      [186.909, 9.909],
      [206.909, 108.909],
      [211.909, 49.909],
      [176.909, 58.909],
      [136.909, 174.909],
      [95.909, 116.909],
      [103.909, 145.909],
      [69.909, 88.909],
      [11.909, 154.909],
      [9.909, 99.909],
      [141.45, 127.908],
    ],
    pinPos: {
      "stair-foyer-3": [129.423, 136.36], // Foyer
      "mudroom-2": [138.499, 188.203], // Mudroom
      "gym-1": [206.932, 93.895], // Gym
      "wellness-1": [152.685, 127.467], // Wellness Center
      "sauna-3": [155.845, 62.145], // Sauna
      "massage-2": [162.488, 93.324], // Massage Room
      "bedroom-2-1": [200.14, 15.616], // Bedroom 2
      "bathroom-2-1": [221.191, 57.059], // Bath 2
      "game-room-2": [52.416, 127.418], // Lower Family Room
      "bedroom-1-1": [25.226, 93.584], // Bedroom 1
      "bathroom-1-2": [59.753, 100.987], // Bath 1
      "lower-powder": [85.518, 137.412], // Lower Powder
      "stair-case": [120.141, 90.717], // Stair Case
      "stair-foyer-1": [91.804, 115.95], // Foyer
      "stair-foyer-2": [99.676, 86.536], // Foyer
      "stair-foyer-4": [101.209, 51.274], // Foyer
      "mudroom-1": [133.498, 161.073], // Mudroom
      "gym-2": [181.569, 114.533], // Gym
      "sauna-1": [175.653, 57.762], // Sauna
      "sauna-2": [157.658, 48.179], // Sauna
      "massage-1": [173.037, 77.755], // Massage Room
      "bedroom-2-2": [172.352, 32.284], // Bedroom 2
      "bathroom-2-2": [222.693, 35.735], // Bathroom 2
      "game-room-1": [11.045, 139.95], // Lower Family Room
      "game-room-3": [3, 182], // Lower Family Room
      "bedroom-1-2": [77.868, 105.502], // Bedroom 1
      "bathroom-1-1": [74.998, 89.111], // Bathroom 1
      "lower-powder-2": [105.627, 143.241], // Lower Powder Room
    },
    rooms: {
      "stair-foyer": {
        label: "Foyer",
        viewId: "stair-foyer-3",
        labelPos: [119.243, 120.471],
      },
      "stair-case": { label: "Stair Case", viewId: "stair-case" },
      "bedroom-1": {
        label: "Bedroom 1",
        viewId: "bedroom-1-1",
        labelPos: [8.576, 79.243],
      },
      "bathroom-1": {
        label: "Bathroom 1",
        shortLabel: "Bath 1",
        viewId: "bathroom-1-2",
        labelPos: [57.909, 83.92],
      },
      "bedroom-2": {
        label: "Bedroom 2",
        viewId: "bedroom-2-1",
        labelPos: [201.576, -2.275],
      },
      "bathroom-2": {
        label: "Bathroom 2",
        shortLabel: "Bath 2",
        viewId: "bathroom-2-1",
        labelPos: [247.909, 46.346],
      },
      "game-room": {
        label: "Lower Family Room",
        viewId: "game-room-2",
        labelPos: [-6.758, 125.692],
      },
      mudroom: {
        label: "Mudroom",
        viewId: "mudroom-2",
        labelPos: [138.909, 205.091],
      },
      sauna: {
        label: "Sauna",
        viewId: "sauna-3",
        labelPos: [126.242, 64.61],
      },
      gym: {
        label: "Gym",
        viewId: "gym-1",
        labelPos: [211.575, 111.76],
      },
      wellness: {
        label: "Wellness Center",
        shortLabel: "Wellness Center",
        viewId: "wellness-1",
        labelPos: [210.117, 130.046],
      },
      "massage-room": {
        label: "Massage Room",
        viewId: "massage-2",
        labelPos: [160.243, 107.161],
      },
      "lower-powder": {
        label: "Lower Powder Room",
        shortLabel: "Lower Powder",
        viewId: "lower-powder",
        labelPos: [84.576, 158.024],
      },
    },
    listOrder: [
      "stair-foyer",
      "stair-case",
      "bedroom-1",
      "bathroom-1",
      "bedroom-2",
      "bathroom-2",
      "game-room",
      "mudroom",
      "sauna",
      "gym",
      "wellness",
      "massage-room",
      "lower-powder",
    ],
    // Figma Navigation Button order on floor plan SVG
    minimapOrder: [
      "massage-room",
      "bedroom-2",
      "gym",
      "bathroom-2",
      "sauna",
      "mudroom",
      "stair-foyer",
      "lower-powder",
      "bathroom-1",
      "game-room",
      "bedroom-1",
      "wellness",
    ],
  },
  {
    id: "floor-ii",
    label: "Floor II",
    viewBox: { w: 284, h: 123 },
    hotspots: [
      [150.317, 9.909],
      [184.955, 74.933],
      [271.609, 85.055],
      [149.955, 111.933],
      [96.955, 85.933],
      [9.909, 83.411],
      [43.955, 112.933],
      [53.955, 59.933],
      [180, 5],
      [250, 115],
      [100, 5],
    ],
    pinPos: {
      living: [195.543, 53.317], // Living Room
      dining: [146.354, 70.929], // Dining
      kitchen: [158.931, 119.856], // Kitchen
      "entry-hall-1": [96.884, 88.509], // Entry
      "entry-hall-2": [58.104, 92.779], // Main Powder
      "outdoor-3": [257.176, 70.553], // Pool
      "bedroom-3-2": [23.392, 76.098], // Bedroom 3
      "bathroom-3-2": [41.893, 65.538], // Bath 3
      "living-3": [240.206, 55.112], // Living Room
      "living-2": [165.645, 82.272], // Living Room
      "dining-2": [120.154, 81.136], // Dining Room
      "kitchen-2": [130.145, 97.277], // Kitchen
      "entry-hall-3": [97.93, 108.803], // Entry Hall
      "outdoor-1": [186.829, 3], // Outdoor
      "outdoor-2": [248.293, 11.207], // Outdoor
      "outdoor-4": [88.209, 3], // Outdoor
      "stair-case-2": [97.819, 59.75], // Upper Stair Case
      "bedroom-3-1": [12.111, 89.784], // Bedroom 3
      "bedroom-3-3": [41.599, 83.59], // Bedroom 3
      "bathroom-3-1": [60.766, 64.402], // Bathroom 3
      "main-powder": [43.438, 108.505], // Main Powder Room
    },
    rooms: {
      entry: {
        label: "Entry Hall",
        shortLabel: "Entry",
        viewId: "entry-hall-1",
        labelPos: [97.622, 71.681],
      },
      "stair-case-2": {
        label: "Upper Stair Case",
        shortLabel: "Stairs",
        viewId: "stair-case-2",
      },
      dining: {
        label: "Dining Room",
        shortLabel: "Dining",
        viewId: "dining",
        labelPos: [148.317, 47.676],
      },
      kitchen: {
        label: "Kitchen",
        viewId: "kitchen",
        labelPos: [161.955, 138.102],
      },
      "living-room": {
        label: "Living Room",
        viewId: "living",
        labelPos: [210.288, 72.082],
      },
      outdoor: { label: "Outdoor", viewId: "outdoor-1" },
      "bedroom-3": {
        label: "Bedroom 3",
        viewId: "bedroom-3-2",
        labelPos: [-17.333, 76.285],
      },
      "bathroom-3": {
        label: "Bathroom 3",
        shortLabel: "Bath 3",
        viewId: "bathroom-3-2",
        labelPos: [40.622, 44.968],
      },
      pool: {
        label: "Pool",
        viewId: "outdoor-3",
        labelPos: [257, 89.296],
      },
      "main-powder": {
        label: "Main Powder Room",
        shortLabel: "Main Powder",
        viewId: "entry-hall-2",
        labelPos: [51.955, 127.413],
      },
      "outside-dining-bbq": {
        label: "Outside dining & BBQ",
        viewId: null,
        labelPos: [188.667, -11.39],
      },
      "lawn-fireside": {
        label: "Lawn & Fireside lounge",
        viewId: null,
        labelPos: [50, -12.554],
      },
      "outside-fireplace": {
        label: "Outside fireplace",
        viewId: null,
        labelPos: [238.666, 27.09],
      },
    },
    listOrder: [
      "entry",
      "stair-case-2",
      "dining",
      "kitchen",
      "living-room",
      "outdoor",
      "bedroom-3",
      "bathroom-3",
      "pool",
      "main-powder",
    ],
    minimapOrder: [
      "dining",
      "living-room",
      "pool",
      "kitchen",
      "entry",
      "bedroom-3",
      "main-powder",
      "bathroom-3",
      "outside-dining-bbq",
      "lawn-fireside",
      "outside-fireplace",
    ],
  },
  {
    id: "floor-iii",
    label: "Floor III",
    viewBox: { w: 260, h: 159 },
    hotspots: [
      [156.909, 24.661],
      [159.909, 75.661],
      [172.909, 102.661],
      [190.909, 75.661],
      [236.909, 72.661],
      [159.909, 148.661],
      [91.909, 118.661],
      [9.909, 100.661],
      [56.909, 77.661],
    ],
    pinPos: {
      "primary-bedroom-1": [212.37, 104.594], // Primary Bedroom
      closet: [190.858, 73.611], // Closet #1
      "primary-bathroom-2": [164.958, 125.316], // Primary Bath
      "primary-hall-1": [181.678, 100.962], // Hall
      "primary-hall-3": [100.06, 91.552], // Landing
      "bedroom-4-2": [34.982, 114.277], // Bedroom 4
      "bedroom-4-3": [34.713, 80.725], // Bath 4
      "office-2": [145.277, 57.853], // Office
      "office-bathroom-2": [151.285, 77.988], // Office Bath
      "primary-bedroom-3": [236.439, 101.922], // Primary Bedroom
      "primary-bedroom-2": [257, 68.835], // Primary Bedroom
      "primary-bathroom-1": [161.656, 144.57], // Primary Bathroom
      "primary-hall-2": [159.251, 102.249], // Primary Hall
      "primary-hall-4": [61.218, 100.91], // Primary Hall
      "bedroom-4-1": [20.584, 101.271], // Bedroom 4
      "bathroom-4-2": [55.801, 77.987], // Bathroom 4
      "bedroom-4-4": [50.626, 115.493], // Bedroom 4
      "bedroom-5-hall": [143.989, 92.329], // Hall
      "office-1": [176.705, 32.643], // Office
      "office-bathroom-1": [166.257, 77.999], // Office Bathroom
    },
    rooms: {
      "primary-bath": {
        label: "Primary Bathroom",
        shortLabel: "Primary Bath",
        viewId: "primary-bathroom-2",
        labelPos: [117.909, 125.645],
      },
      "primary-bedroom": {
        label: "Primary Bedroom",
        viewId: "primary-bedroom-1",
        labelPos: [246.909, 123.256],
      },
      closet: {
        label: "Closet #1",
        viewId: "closet",
        labelPos: [192.91, 55.709],
      },
      office: {
        label: "Office",
        viewId: "office-2",
        labelPos: [114.243, 56.727],
      },
      "office-bath": {
        label: "Office Bathroom",
        shortLabel: "Office Bath",
        viewId: "office-bathroom-2",
        labelPos: [110.576, 76.373],
      },
      "bedroom-5-hall": {
        label: "Hall",
        shortLabel: "Hall",
        viewId: "bedroom-5-hall",
      },
      "bedroom-4": {
        label: "Bedroom 4",
        viewId: "bedroom-4-2",
        labelPos: [-7.424, 117.05],
      },
      "bathroom-4": {
        label: "Bathroom 4",
        shortLabel: "Bath 4",
        viewId: "bedroom-4-3",
        labelPos: [5.575, 81.224],
      },
      "primary-hall": {
        label: "Primary Hall",
        shortLabel: "Hall",
        viewId: "primary-hall-1",
        labelPos: [184.243, 117.625],
      },
      "top-landing": {
        label: "Top Landing",
        shortLabel: "Landing",
        viewId: "primary-hall-3",
        labelPos: [98.576, 108.685],
      },
    },
    listOrder: [
      "primary-bath",
      "primary-bedroom",
      "closet",
      "primary-hall",
      "top-landing",
      "office",
      "office-bath",
      "bedroom-5-hall",
      "bedroom-4",
      "bathroom-4",
    ],
    minimapOrder: [
      "office",
      "office-bath",
      "primary-hall",
      "closet",
      "primary-bedroom",
      "primary-bath",
      "top-landing",
      "bedroom-4",
      "bathroom-4",
    ],
  },
];

function resolveRoom(floor, roomId) {
  const room = floor.rooms[roomId];
  if (!room) return null;
  return { id: roomId, ...room };
}

/** Floor / Room selector list items (full labels). */
export function getListRooms(floor) {
  return floor.listOrder.map((id) => resolveRoom(floor, id)).filter(Boolean);
}

/** First available panorama on a floor (for floor-select entry). */
export function getDefaultRoomViewId(floor) {
  if (!floor) return null;
  return getListRooms(floor).find((room) => room.viewId)?.viewId || null;
}

/** Minimap labeled rooms (short labels), index-aligned with hotspots[]. */
export function getMinimapRooms(floor) {
  return floor.minimapOrder
    .map((id) => {
      const room = resolveRoom(floor, id);
      if (!room) return null;
      return {
        id: room.id,
        label: room.shortLabel || room.label,
        viewId: room.viewId,
        labelPos: room.labelPos || null,
      };
    })
    .filter(Boolean);
}

/**
 * Minimap text labels with resolved SVG coords.
 * Priority: draft override → room.labelPos → legacy hotspots[i].
 */
export function getMinimapLabels(floor, drafts = null) {
  if (!floor) return [];
  return floor.minimapOrder
    .map((roomId, index) => {
      const room = resolveRoom(floor, roomId);
      if (!room) return null;
      const draftKey = `${floor.id}:${roomId}`;
      const fromDraft = drafts?.[draftKey];
      const fromRoom = Array.isArray(room.labelPos) ? room.labelPos : null;
      const fromHotspot = floor.hotspots[index];
      const point = fromDraft || fromRoom || fromHotspot;
      if (!point) return null;
      const [x, y] = point;
      return {
        id: roomId,
        label: room.shortLabel || room.label,
        viewId: room.viewId || null,
        x,
        y,
        source: fromDraft ? "draft" : fromRoom ? "config" : "hotspot",
      };
    })
    .filter(Boolean);
}

/** Snippet to paste `labelPos` into floorsConfig rooms for one floor. */
export function formatMinimapLabelPositions(floor, drafts = null) {
  if (!floor) return "";
  const entries = getMinimapLabels(floor, drafts).map((item) => {
    const x = Math.round(item.x * 1000) / 1000;
    const y = Math.round(item.y * 1000) / 1000;
    return `  "${item.id}": [${x}, ${y}], // ${item.label}`;
  });
  return `// ${floor.id} — merge as rooms.*.labelPos\n{\n${entries.join("\n")}\n}`;
}

/** Snippet to paste `pinPos` into floorsConfig for one floor (all pins). */
export function formatMinimapPinPositions(floor, drafts = null) {
  if (!floor) return "";
  const pins = getMinimapPins(floor, FLOORS, drafts);
  const lines = pins.map((pin) => {
    const x = Math.round(pin.x * 1000) / 1000;
    const y = Math.round(pin.y * 1000) / 1000;
    const name = pin.label || pin.room || pin.viewId;
    return `  "${pin.viewId}": [${x}, ${y}], // ${name}`;
  });
  return `// ${floor.id} — paste as pinPos (independent per view)\npinPos: {\n${lines.join("\n")}\n},`;
}

/** Match room on a floor by entry viewId, or by shared room label (any panorama). */
export function findRoomOnFloor(floor, viewId, roomLabel) {
  if (!floor) return null;
  const rooms = getListRooms(floor);
  return (
    rooms.find((room) => room.viewId && room.viewId === viewId) ||
    (roomLabel ? rooms.find((room) => room.label === roomLabel) : null) ||
    null
  );
}

export function findFloorForViewId(viewId, roomLabel) {
  if (viewId) {
    const byView = FLOORS.find((floor) =>
      Object.values(floor.rooms).some((room) => room.viewId === viewId),
    );
    if (byView) return byView;
  }
  if (!roomLabel) return null;
  return (
    FLOORS.find((floor) =>
      Object.values(floor.rooms).some((room) => room.label === roomLabel),
    ) || null
  );
}

export function getActiveHotspot(floor, viewId, roomLabel, pinDrafts = null) {
  if (!floor || (!viewId && !roomLabel)) return null;

  const view =
    (viewId && CONFIG.views.find((item) => item.id === viewId)) ||
    (roomLabel && CONFIG.views.find((item) => item.room === roomLabel)) ||
    null;

  if (view) {
    const pins = getMinimapPins(floor, FLOORS, pinDrafts);
    const index = pins.findIndex((pin) => pin.viewId === view.id);
    if (index >= 0) {
      const pin = pins[index];
      return { index, x: pin.x, y: pin.y, viewId: view.id };
    }
    const projected = projectViewOnFloor(floor, view, FLOORS);
    if (projected) {
      return { index: -1, x: projected.x, y: projected.y, viewId: view.id };
    }
  }

  // Fallback: labeled room pin (legacy room-label snap).
  const rooms = getMinimapRooms(floor);
  let index = viewId ? rooms.findIndex((room) => room.viewId === viewId) : -1;
  if (index < 0 && roomLabel) {
    index = floor.minimapOrder.findIndex((id) => floor.rooms[id]?.label === roomLabel);
  }
  if (index < 0 && viewId?.startsWith("primary-hall-")) {
    const n = Number(String(viewId).split("-").pop());
    const pinId = Number.isFinite(n) && n >= 3 ? "top-landing" : "primary-hall";
    index = floor.minimapOrder.indexOf(pinId);
  }
  if (index < 0) return null;
  const roomId = floor.minimapOrder[index];
  const entryViewId = rooms[index]?.viewId || null;
  const draftKey = entryViewId ? `${floor.id}:${entryViewId}` : null;
  const fromDraft = draftKey && pinDrafts?.[draftKey];
  const fromPinPos = entryViewId && floor.pinPos?.[entryViewId];
  const point = fromDraft || fromPinPos || floor.hotspots[index];
  if (!point) return null;
  const [x, y] = point;
  return { index, x, y, viewId: entryViewId };
}

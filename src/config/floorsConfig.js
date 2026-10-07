/**
 * Shared floor / room catalogue.
 * - listOrder → Floor / Room selectors (RoomSelector)
 * - minimapOrder + hotspots → calibrate 3D→SVG projection (minimapProjection)
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
    rooms: {
      "stair-foyer": {
        label: "Stair Foyer",
        viewId: "stair-foyer-3",
        labelPos: [137.909, 105.507],
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
        labelPos: [63.909, 81.07],
      },
      "bedroom-2": {
        label: "Bedroom 2",
        viewId: "bedroom-2-1",
        labelPos: [195.576, 2],
      },
      "bathroom-2": {
        label: "Bathroom 2",
        shortLabel: "Bath 2",
        viewId: "bathroom-2-1",
        labelPos: [243.909, 35.657],
      },
      "game-room": {
        label: "Lower Family Room",
        viewId: "game-room-2",
        labelPos: [49.909, 153.484],
      },
      mudroom: {
        label: "Mudroom",
        viewId: "mudroom-2",
        labelPos: [171.576, 183],
      },
      sauna: {
        label: "Sauna",
        viewId: "sauna-1",
        labelPos: [178.909, 39.669],
      },
      gym: {
        label: "Gym",
        viewId: "gym-1",
        labelPos: [206.242, 120.311],
      },
      wellness: {
        label: "Wellness Center",
        shortLabel: "Wellness Center",
        viewId: "wellness-1",
        labelPos: [141.45, 127.908],
      },
      "massage-room": {
        label: "Massage Room",
        viewId: "massage-1",
        labelPos: [223.576, 72.956],
      },
      "lower-powder": {
        label: "Lower Powder Room",
        shortLabel: "Lower Powder",
        viewId: "lower-powder",
        labelPos: [152.576, 159.449],
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
    ],
    rooms: {
      entry: {
        label: "Entry Hall",
        shortLabel: "Entry",
        viewId: "entry-hall-1",
        labelPos: [97.622, 63.13],
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
        labelPos: [125.288, 121],
      },
      "living-room": {
        label: "Living Room",
        viewId: "living",
        labelPos: [212.288, 76.358],
      },
      outdoor: { label: "Outdoor", viewId: "outdoor-1" },
      "bedroom-3": {
        label: "Bedroom 3",
        viewId: "bedroom-3-2",
        labelPos: [4, 44.931],
      },
      "bathroom-3": {
        label: "Bathroom 3",
        shortLabel: "Bath 3",
        viewId: "bathroom-3-2",
        labelPos: [59.288, 43.543],
      },
      pool: {
        label: "Pool",
        viewId: "outdoor-3",
        labelPos: [266.333, 49.391],
      },
      "main-powder": {
        label: "Main Powder Room",
        shortLabel: "Main Powder",
        viewId: "entry-hall-2",
        labelPos: [37.288, 121],
      },
      "outside-dining-bbq": {
        label: "Outside dining & BBQ",
        viewId: null,
        labelPos: [180, 5],
      },
      "lawn-fireside": {
        label: "Lawn & Fireside lounge",
        viewId: null,
        labelPos: [250, 115],
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
    rooms: {
      "primary-bath": {
        label: "Primary Bathroom",
        shortLabel: "Primary Bath",
        viewId: "primary-bathroom-2",
        labelPos: [161.909, 157],
      },
      "primary-bedroom": {
        label: "Primary Bedroom",
        viewId: "primary-bedroom-1",
        labelPos: [246.909, 113.279],
      },
      closet: {
        label: "Closet #1",
        viewId: "closet",
        labelPos: [201.576, 59.984],
      },
      office: {
        label: "Office",
        viewId: "office-2",
        labelPos: [169.576, 7.558],
      },
      "office-bath": {
        label: "Office Bathroom",
        shortLabel: "Office Bath",
        viewId: "office-bathroom-1",
        labelPos: [111.909, 72.098],
      },
      "bedroom-5-hall": {
        label: "Hall",
        shortLabel: "Hall",
        viewId: "bedroom-5-hall",
      },
      "bedroom-4": {
        label: "Bedroom 4",
        viewId: "bedroom-4-2",
        labelPos: [21.242, 143.417],
      },
      "bathroom-4": {
        label: "Bathroom 4",
        shortLabel: "Bath 4",
        viewId: "bathroom-4-2",
        labelPos: [40.242, 57.708],
      },
      "primary-hall": {
        label: "Primary Hall",
        shortLabel: "Hall",
        viewId: "primary-hall-1",
        labelPos: [141.576, 104.799],
      },
      "top-landing": {
        label: "Top Landing",
        shortLabel: "Landing",
        viewId: "primary-hall-3",
        labelPos: [94.576, 114.385],
      },
      "main-powder": {
        label: "Main Powder Room",
        shortLabel: "Main Powder",
        viewId: "main-powder",
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

export function getActiveHotspot(floor, viewId, roomLabel) {
  if (!floor || (!viewId && !roomLabel)) return null;

  const view =
    (viewId && CONFIG.views.find((item) => item.id === viewId)) ||
    (roomLabel && CONFIG.views.find((item) => item.room === roomLabel)) ||
    null;

  if (view) {
    const projected = projectViewOnFloor(floor, view, FLOORS);
    if (projected) {
      const pins = getMinimapPins(floor, FLOORS);
      const index = pins.findIndex((pin) => pin.viewId === view.id);
      return { index, x: projected.x, y: projected.y, viewId: view.id };
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
  const point = floor.hotspots[index];
  if (!point) return null;
  const [x, y] = point;
  return { index, x, y, viewId: rooms[index]?.viewId || null };
}

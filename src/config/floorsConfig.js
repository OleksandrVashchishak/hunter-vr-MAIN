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
    ],
    rooms: {
      "stair-foyer": { label: "Stair Foyer", viewId: "stair-foyer-1" },
      "stair-case": { label: "Stair Case", viewId: "stair-case" },
      "bedroom-1": { label: "Bedroom 1", viewId: "bedroom-1-1" },
      "bathroom-1": { label: "Bathroom 1", shortLabel: "Bath 1", viewId: "bathroom-1-1" },
      "bedroom-2": { label: "Bedroom 2", viewId: "bedroom-2-1" },
      "bathroom-2": { label: "Bathroom 2", shortLabel: "Bath 2", viewId: "bathroom-2-1" },
      "game-room": { label: "Game Room", viewId: "game-room-2" },
      mudroom: { label: "Mudroom", viewId: "mudroom-2" },
      sauna: { label: "Sauna", viewId: "sauna-1" },
      gym: { label: "Gym", viewId: "gym-1" },
      wellness: { label: "Wellness Area", shortLabel: "Wellness", viewId: "wellness-1" },
      "massage-room": { label: "Massage Room", viewId: "massage-1" },
      "lower-powder": {
        label: "Lower Powder Room",
        shortLabel: "Lower Powder",
        viewId: "lower-powder",
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
    ],
    rooms: {
      entry: {
        label: "Entry Hall",
        shortLabel: "Entry",
        viewId: "entry-hall-1",
        labelPos: [96.955, 85.933],
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
        labelPos: [150.317, 9.909],
      },
      kitchen: { label: "Kitchen", viewId: "kitchen", labelPos: [149.955, 111.933] },
      "living-room": {
        label: "Living Room",
        viewId: "living",
        labelPos: [184.955, 74.933],
      },
      outdoor: { label: "Outdoor", viewId: "outdoor-1" },
      "bedroom-3": {
        label: "Bedroom 3",
        viewId: "bedroom-3-2",
        labelPos: [9.909, 83.411],
      },
      "bathroom-3": {
        label: "Bathroom 3",
        shortLabel: "Bath 3",
        viewId: "bathroom-3-1",
        labelPos: [53.955, 59.933],
      },
      pool: { label: "Pool", viewId: "outdoor-3", labelPos: [259, 33.001] },
      "main-powder": {
        label: "Main Powder Room",
        shortLabel: "Main Powder",
        viewId: "main-powder",
        labelPos: [43.955, 112.933],
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
        viewId: "primary-bathroom-1",
      },
      "primary-bedroom": { label: "Primary Bedroom", viewId: "primary-bedroom-1" },
      closet: { label: "Closet", viewId: "closet" },
      office: { label: "Office", viewId: "office-1" },
      "office-bath": {
        label: "Office Bathroom",
        shortLabel: "Office Bath",
        viewId: "office-bathroom-1",
      },
      "bedroom-5-hall": {
        label: "Hall",
        shortLabel: "Hall",
        viewId: "bedroom-5-hall",
      },
      "bedroom-4": { label: "Bedroom 4", viewId: "bedroom-4-2" },
      "bathroom-4": { label: "Bathroom 4", shortLabel: "Bath 4", viewId: "bathroom-4-2" },
      "primary-hall": {
        label: "Primary Hall",
        shortLabel: "Hall",
        viewId: "primary-hall-1",
      },
      "top-landing": {
        label: "Top Landing",
        shortLabel: "Landing",
        viewId: "primary-hall-3",
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

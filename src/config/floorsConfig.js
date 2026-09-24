/**
 * Shared floor / room catalogue.
 * - listOrder → Floor / Room selectors (RoomSelector)
 * - minimapOrder + hotspots → SVG Navigation Button indices (Minimap)
 * Labels: `label` for list, `shortLabel` for minimap (falls back to label).
 */

export const FLOORS = [
  {
    id: "floor-i",
    label: "Floor I",
    viewBox: { w: 307, h: 222 },
    hotspots: [
      [213.662, 110.662],
      [227.662, 27.6618],
      [248.662, 110.662],
      [257.662, 75.6618],
      [217.662, 76.6618],
      [177.662, 192.662],
      [136.662, 134.662],
      [144.662, 163.662],
      [110.662, 106.662],
      [122.662, 86.6618],
      [64.6618, 182.662],
      [63.6618, 115.662],
    ],
    rooms: {
      "stair-foyer": { label: "Stair Foyer", viewId: "stair-foyer-1" },
      "bedroom-1": { label: "Bedroom 1", viewId: "bedroom-1-1" },
      "bathroom-1": { label: "Bathroom 1", shortLabel: "Bath 1", viewId: "bathroom-1-1" },
      "bedroom-2": { label: "Bedroom 2", viewId: "bedroom-2-1" },
      "bathroom-2": { label: "Bathroom 2", shortLabel: "Bath 2", viewId: "bathroom-2-1" },
      "game-room": { label: "Game Room", viewId: "game-room-1" },
      mudroom: { label: "Mudroom", viewId: "mudroom-1" },
      sauna: { label: "Sauna", viewId: "sauna-1" },
      gym: { label: "Gym", viewId: "gym-1" },
      laundry: { label: "Laundry", viewId: null },
      "massage-room": { label: "Massage Room", viewId: "massage-1" },
      "lower-powder": {
        label: "Lower Powder Room",
        shortLabel: "Lower Powder",
        viewId: "lower-powder",
      },
    },
    listOrder: [
      "stair-foyer",
      "bedroom-1",
      "bathroom-1",
      "bedroom-2",
      "bathroom-2",
      "game-room",
      "mudroom",
      "sauna",
      "gym",
      "laundry",
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
      "lower-powder",
      "mudroom",
      "stair-foyer",
      "bathroom-1",
      "laundry",
      "game-room",
      "bedroom-1",
    ],
  },
  {
    id: "floor-ii",
    label: "Floor II",
    viewBox: { w: 340, h: 165 },
    hotspots: [
      [200.024, 29.6373],
      [261.275, 93.716],
      [321.316, 104.783],
      [200.024, 135.179],
      [144.426, 113.505],
      [59.6159, 103.139],
      [94.4821, 132.294],
      [108.617, 74.8693],
    ],
    rooms: {
      entry: { label: "Entry Hall", shortLabel: "Entry", viewId: "entry-hall-1" },
      dining: { label: "Dining Room", shortLabel: "Dining", viewId: "dining" },
      kitchen: { label: "Kitchen", viewId: "kitchen" },
      "living-room": { label: "Living Room", viewId: "living" },
      "bedroom-3": { label: "Bedroom 3", viewId: "bedroom-3-1" },
      "bathroom-3": { label: "Bathroom 3", shortLabel: "Bath 3", viewId: "bathroom-3-1" },
      pool: { label: "Pool", viewId: null },
      "main-powder": {
        label: "Main Powder Room",
        shortLabel: "Main Powder",
        viewId: "main-powder",
      },
    },
    listOrder: [
      "entry",
      "dining",
      "kitchen",
      "living-room",
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
    viewBox: { w: 331, h: 175 },
    hotspots: [
      [215.662, 30.6618],
      [218.662, 81.6618],
      [249.662, 81.6618],
      [295.662, 78.6618],
      [220.662, 146.662],
      [148.426, 145.505],
      [75.6618, 100.662],
      [115.662, 84.6618],
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
      "bedroom-4": { label: "Bedroom 4", viewId: "bedroom-4-1" },
      "bathroom-4": { label: "Bathroom 4", shortLabel: "Bath 4", viewId: "bathroom-4" },
      entry: { label: "Primary Hall", shortLabel: "Hall", viewId: "primary-hall-1" },
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
      "office",
      "office-bath",
      "bedroom-4",
      "bathroom-4",
    ],
    minimapOrder: [
      "office",
      "office-bath",
      "closet",
      "primary-bedroom",
      "primary-bath",
      "entry",
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

/** Minimap SVG hotspot items (short labels), index-aligned with hotspots[]. */
export function getMinimapRooms(floor) {
  return floor.minimapOrder
    .map((id) => {
      const room = resolveRoom(floor, id);
      if (!room) return null;
      return {
        id: room.id,
        label: room.shortLabel || room.label,
        viewId: room.viewId,
      };
    })
    .filter(Boolean);
}

export function findFloorForViewId(viewId) {
  if (!viewId) return null;
  return (
    FLOORS.find((floor) =>
      Object.values(floor.rooms).some((room) => room.viewId === viewId)
    ) || null
  );
}

export function getActiveHotspot(floor, viewId) {
  if (!floor || !viewId) return null;
  const rooms = getMinimapRooms(floor);
  const index = rooms.findIndex((room) => room.viewId === viewId);
  if (index < 0) return null;
  const point = floor.hotspots[index];
  if (!point) return null;
  const [x, y] = point;
  return { index, x, y };
}

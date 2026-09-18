/**
 * VR tour → spinner analytics bridge.
 * Tour postMessages room events; spinner attaches unit_id and forwards to Fortes analytics.
 */

const ALLOWED_ROOM_TYPES = new Set([
  "kitchen",
  "bathroom",
  "living",
  "bedroom",
  "terrace",
  "hall",
  "other",
]);

/** Map CONFIG.views[].room (and common aliases) → collector enum */
const ROOM_LABEL_MAP = {
  living: "living",
  "living room": "living",
  kitchen: "kitchen",
  bathroom: "bathroom",
  bedroom: "bedroom",
  terrace: "terrace",
  hall: "hall",
  corridor: "hall",
  office: "other",
  cabinet: "other",
};

/** Fallback when room label is missing/wrong — by view id */
const VIEW_NAME_HINTS = {
  corridor: "hall",
  kitchen: "kitchen",
  bathroom: "bathroom",
  bedroom1: "bedroom",
  bedroom2: "bedroom",
  cabinet: "other",
  main: "living",
  plasma: "living",
  window: "living",
  piano: "living",
};

let currentRoom = null; // { type, enteredAt }

function toAllowedRoomType(roomName, viewName) {
  const fromRoom = ROOM_LABEL_MAP[String(roomName || "").trim().toLowerCase()];
  if (fromRoom && ALLOWED_ROOM_TYPES.has(fromRoom)) return fromRoom;

  const fromView = VIEW_NAME_HINTS[String(viewName || "").trim().toLowerCase()];
  if (fromView && ALLOWED_ROOM_TYPES.has(fromView)) return fromView;

  return "other";
}

export function postBridgeEvent(name, payload = {}) {
  try {
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage({ fv: { name, payload } }, "*");
  } catch {
    // Bridge is best-effort and must stay failure-safe.
  }
}

export function emitTourEvent(name, payload = {}) {
  postBridgeEvent(name, payload);
}

export function getRoomTypeByViewName(view) {
  return toAllowedRoomType(view?.room, view?.id);
}

/** Enter a room; auto-exits previous room with dwell_ms when type changes. */
export function enterRoom(roomType) {
  if (!roomType || !ALLOWED_ROOM_TYPES.has(roomType)) return;

  if (currentRoom?.type === roomType) return;

  if (currentRoom) {
    const dwellMs = Math.max(0, Date.now() - currentRoom.enteredAt);
    emitTourEvent("tour_room_exited", {
      room_type: currentRoom.type,
      dwell_ms: dwellMs,
    });
  }

  currentRoom = { type: roomType, enteredAt: Date.now() };
  emitTourEvent("tour_room_entered", { room_type: roomType });
}

/** Flush exit for current room (pagehide / unmount). */
export function exitCurrentRoom() {
  if (!currentRoom) return;
  const dwellMs = Math.max(0, Date.now() - currentRoom.enteredAt);
  emitTourEvent("tour_room_exited", {
    room_type: currentRoom.type,
    dwell_ms: dwellMs,
  });
  currentRoom = null;
}

export function syncRoomFromView(view) {
  enterRoom(getRoomTypeByViewName(view));
}

/** Call once from the tour root to track rooms + abrupt close. */
export function initTourRoomAnalytics(getView) {
  try {
    const view = typeof getView === "function" ? getView() : getView;
    if (view) syncRoomFromView(view);
  } catch {
    /* ignore */
  }

  const onHide = () => exitCurrentRoom();
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);

  return () => {
    exitCurrentRoom();
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("beforeunload", onHide);
  };
}

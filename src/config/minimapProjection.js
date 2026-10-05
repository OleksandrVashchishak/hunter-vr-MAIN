/**
 * Project tour view XYZ (config space) onto minimap SVG coords.
 *
 * Designer hotspot positions are used only to calibrate an affine map
 * (world XZ → SVG xy). Every pin — labeled majors and secondary minors —
 * is drawn at the projected config coordinate.
 */

import { CONFIG, viewHotspotPos } from "../babylon/config.js";

function solve3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col += 1) {
    let piv = col;
    for (let r = col + 1; r < 3; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    [M[col], M[piv]] = [M[piv], M[col]];
    const div = M[col][col] || 1;
    for (let c = col; c < 4; c += 1) M[col][c] /= div;
    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c < 4; c += 1) M[r][c] -= f * M[col][c];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

function fitAffine(controls) {
  const ATA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const ATbx = [0, 0, 0];
  const ATby = [0, 0, 0];

  for (const p of controls) {
    const row = [p.wx, p.wz, 1];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) ATA[i][j] += row[i] * row[j];
      ATbx[i] += row[i] * p.sx;
      ATby[i] += row[i] * p.sy;
    }
  }

  const [a, b, c] = solve3(ATA, ATbx);
  const [d, e, f] = solve3(ATA, ATby);
  return { a, b, c, d, e, f };
}

function buildControls(floor) {
  const controls = [];
  floor.minimapOrder.forEach((roomId, index) => {
    const room = floor.rooms[roomId];
    const point = floor.hotspots[index];
    if (!room?.viewId || !point) return;
    const view = CONFIG.views.find((item) => item.id === room.viewId);
    if (!view) return;
    const world = viewHotspotPos(view);
    if (!world) return;
    controls.push({
      roomId,
      viewId: room.viewId,
      label: room.shortLabel || room.label,
      roomLabel: room.label,
      wx: world.x,
      wz: world.z,
      sx: point[0],
      sy: point[1],
    });
  });
  return controls;
}

const transformCache = new WeakMap();

function getFloorTransform(floor) {
  let cached = transformCache.get(floor);
  if (cached) return cached;

  const controls = buildControls(floor);
  const linear =
    controls.length >= 3
      ? fitAffine(controls)
      : { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };

  cached = { controls, ...linear };
  transformCache.set(floor, cached);
  return cached;
}

function clampToViewBox(floor, x, y) {
  const pad = 3;
  return {
    x: Math.min(floor.viewBox.w - pad, Math.max(pad, x)),
    y: Math.min(floor.viewBox.h - pad, Math.max(pad, y)),
  };
}

/** Same ownership rules as findFloorForViewId (exact viewId, else room label). */
export function viewBelongsToFloor(floor, view, floors) {
  if (!floor || !view || !floors?.length) return false;

  const exactOwner = floors.find((item) =>
    Object.values(item.rooms).some((room) => room.viewId && room.viewId === view.id),
  );
  if (exactOwner) return exactOwner.id === floor.id;

  if (!view.room) return false;
  const labelOwner = floors.find((item) =>
    Object.values(item.rooms).some((room) => room.label === view.room),
  );
  return labelOwner?.id === floor.id;
}

/** SVG xy for a view on this floor, or null if it does not belong here. */
export function projectViewOnFloor(floor, view, floors = []) {
  if (!floor || !view) return null;
  if (floors.length && !viewBelongsToFloor(floor, view, floors)) return null;

  const world = viewHotspotPos(view);
  if (!world) return null;

  const { controls, a, b, c, d, e, f } = getFloorTransform(floor);
  if (!controls.length) return null;

  if (!floors.length) {
    const onFloor =
      Object.values(floor.rooms).some((room) => room.viewId === view.id) ||
      Object.values(floor.rooms).some((room) => room.label === view.room);
    if (!onFloor) return null;
  }

  const major = controls.find((control) => control.viewId === view.id);
  const rawX = a * world.x + b * world.z + c;
  const rawY = d * world.x + e * world.z + f;
  const { x, y } = clampToViewBox(floor, rawX, rawY);

  if (major) {
    return {
      x,
      y,
      major: true,
      roomId: major.roomId,
      label: major.label,
    };
  }

  return {
    x,
    y,
    major: false,
    roomId: null,
    label: null,
  };
}

/**
 * Every panorama pin on a floor.
 * `major` = labeled entry view from minimapOrder (still projected from XYZ).
 */
export function getMinimapPins(floor, floors = []) {
  if (!floor) return [];

  const pins = [];
  const seen = new Set();

  for (const view of CONFIG.views) {
    const projected = projectViewOnFloor(floor, view, floors);
    if (!projected) continue;
    if (seen.has(view.id)) continue;
    seen.add(view.id);
    pins.push({
      viewId: view.id,
      room: view.room,
      x: projected.x,
      y: projected.y,
      major: projected.major,
      roomId: projected.roomId,
      label: projected.label,
    });
  }

  pins.sort((left, right) => Number(right.major) - Number(left.major));
  return pins;
}

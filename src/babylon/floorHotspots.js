import {
  Axis,
  Vector3,
  Ray,
  PointerEventTypes,
  TransformNode,
  MeshBuilder,
  DynamicTexture,
  StandardMaterial,
  Color3,
  Material,
} from "@babylonjs/core";
import {
  CONFIG,
  SHOW_NEAR_POINTS,
  HIDE_POINTS,
  HOTSPOT_OCCLUSION,
  worldPos,
  configPos,
  viewHotspotPos,
} from "./config";

const RING_RADIUS = 20;
const HIT_DIAMETER = RING_RADIUS * 2.4;
const HIT_HEIGHT = 12;
const FLOOR_OFFSET = 0.6;
const RAY_LENGTH = 200;
const WAVE_DURATION = 1.7;
const WAVE_SCALE_FROM = 1;
const WAVE_SCALE_TO = 1.85;
const WAVE_ALPHA = 0.5;
/** Floating sphere marker (`view.bigHotspot`) — world units, same scale as RING_RADIUS. */
const BIG_CORE_DIAMETER = 36;
const BIG_SHELL_DIAMETER = 36;
const BIG_HIT_DIAMETER = 72;
const BIG_WAVE_SCALE_TO = 2.15;
const BIG_WAVE_ALPHA = 0.42;
const BIG_CORE_IDLE_ALPHA = 0.72;
const BIG_CORE_HOVER_ALPHA = 0.9;
const BIG_CORE_SELECT_ALPHA = 1;
const IDLE_ALPHA = 0.55;
const HOVER_ALPHA = 0.75;
const SELECT_ALPHA = 0.95;
const LOCKED_ALPHA = 0.35;
const HOVER_LERP = 0.14;
/** ~180ms in/out at 60fps — soft pop without feeling sluggish */
const FADE_LERP = 0.22;
const FADE_SCALE_FROM = 0.72;
const PICK_FADE_MIN = 0.4;
const LOS_HEIGHT = 4;
const LOS_MARGIN = 2;
const OCCLUSION_EVERY_N_FRAMES = 2;
const LOCKED_COLOR = new Color3(0.55, 0.55, 0.55);
const SELECT_COLOR = new Color3(0.35, 0.85, 1);

export function createFloorHotspots(scene, { getPickMeshes, hoverRef, onEditChange }) {
  const hotspotsByActor = new Map();
  /** Runtime overrides in config space (after drag). */
  const overrides = new Map();
  const buttonTexture = createButtonTexture(scene);
  const waveMat = createWaveMaterial(scene);
  const bigWaveMat = makeGlowSphereMat(scene, "hotspotBigWaveMat", Color3.White(), BIG_WAVE_ALPHA);
  const inputEl = scene.getEngine().getInputElement();

  // Babylon resets canvas cursor every move unless meshUnderPointer has ActionManager.
  // Floor usually wins that pick, so we own the cursor ourselves.
  const prevDoNotHandleCursors = scene.doNotHandleCursors;
  scene.doNotHandleCursors = true;

  let hoveredActor = null;
  let currentActor = null;
  let currentIndex = 0;
  let selectedActor = null;
  let editMode = false;
  let dragging = false;
  /** @type {Set<string>} */
  let visibleIds = new Set();
  let frame = 0;
  let captureHidden = false;

  function applyCursor() {
    if (!inputEl) return;
    if (dragging) {
      inputEl.style.cursor = "grabbing";
      return;
    }
    if (editMode && hoveredActor) {
      inputEl.style.cursor = "grab";
      return;
    }
    inputEl.style.cursor = hoveredActor ? "pointer" : "default";
  }

  function setHovered(actor) {
    if (actor === hoveredActor) return;
    hoveredActor = actor;
    if (hoverRef) hoverRef.current = actor;
    applyCursor();
  }

  function emitEditChange() {
    if (!onEditChange) return;
    if (!selectedActor) {
      onEditChange(null);
      return;
    }
    const hotspot = getConfigHotspot(selectedActor);
    onEditChange(hotspot ? { viewId: selectedActor, hotspot } : null);
  }

  function getConfigHotspot(viewId) {
    if (overrides.has(viewId)) return { ...overrides.get(viewId) };
    const view = CONFIG.views.find((v) => v.id === viewId);
    if (!view) return null;
    const src = viewHotspotPos(view);
    return { x: src.x, y: src.y, z: src.z };
  }

  function markerSource(view) {
    if (overrides.has(view.id)) return overrides.get(view.id);
    return viewHotspotPos(view);
  }

  function pickHotspotActor() {
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) => !!mesh.metadata?.hotspotViewId && mesh.isEnabled()
    );
    return pick?.hit ? pick.pickedMesh.metadata.hotspotViewId : null;
  }

  function isOccluded(camera, rootPos, pickMeshes) {
    const target = rootPos.clone();
    target.y += LOS_HEIGHT;

    const toTarget = target.subtract(camera.position);
    const dist = toTarget.length();
    if (dist < 1) return true;

    const dir = toTarget.normalize();

    // behind camera
    const forward = camera.getDirection(Axis.Z);
    if (Vector3.Dot(forward, dir) < 0.02) return true;

    const ray = new Ray(camera.position, dir, Math.max(0.1, dist - LOS_MARGIN));
    const hit = scene.pickWithRay(ray, (m) => pickMeshes.includes(m));
    return !!(hit && hit.hit);
  }

  function syncWantVisible() {
    if (captureHidden) {
      hotspotsByActor.forEach((entry) => {
        entry.wantVisible = false;
      });
      return;
    }

    if (!HOTSPOT_OCCLUSION) {
      hotspotsByActor.forEach((entry) => {
        entry.wantVisible = visibleIds.has(entry.viewId);
      });
      return;
    }

    const camera = scene.activeCamera;
    if (!camera) return;

    const pickMeshes = getPickMeshes?.() || [];

    hotspotsByActor.forEach((entry) => {
      if (!visibleIds.has(entry.viewId)) {
        entry.wantVisible = false;
        return;
      }
      entry.wantVisible = !isOccluded(camera, entry.root.position, pickMeshes);
    });
  }

  function pickFloorPoint() {
    const pickMeshes = getPickMeshes?.() || [];
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) => pickMeshes.includes(mesh)
    );
    if (pick?.hit && pick.pickedPoint) {
      return pick.pickedPoint.clone();
    }

    // Fallback: horizontal plane at selected / hovered marker height
    const entry = hotspotsByActor.get(selectedActor || hoveredActor);
    const planeY = entry?.root.position.y ?? 0;
    const camera = scene.activeCamera;
    if (!camera) return null;

    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, null, camera);
    if (Math.abs(ray.direction.y) < 1e-5) return null;
    const t = (planeY - ray.origin.y) / ray.direction.y;
    if (t < 0) return null;
    return ray.origin.add(ray.direction.scale(t));
  }

  function applyDragPoint(viewId, worldPoint) {
    const entry = hotspotsByActor.get(viewId);
    const view = CONFIG.views.find((v) => v.id === viewId);
    if (!entry || !view || !worldPoint) return;

    // Big floating markers keep altitude; floor discs snap to pick + offset.
    const y = entry.big ? entry.root.position.y : worldPoint.y + FLOOR_OFFSET;
    entry.root.position.set(worldPoint.x, y, worldPoint.z);

    const cfg = entry.big
      ? configPos({ x: worldPoint.x, y, z: worldPoint.z })
      : configPos({ x: worldPoint.x, y: view.position.y, z: worldPoint.z });
    overrides.set(viewId, {
      x: roundCoord(cfg.x),
      y: roundCoord(entry.big ? cfg.y : view.position.y),
      z: roundCoord(cfg.z),
    });
    emitEditChange();
  }

  const pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
    const type = pointerInfo.type;

    if (type === PointerEventTypes.POINTERMOVE) {
      if (dragging && selectedActor) {
        applyDragPoint(selectedActor, pickFloorPoint());
        return;
      }
      setHovered(pickHotspotActor());
      return;
    }

    if (!editMode) return;

    if (type === PointerEventTypes.POINTERDOWN) {
      const evt = pointerInfo.event;
      if (evt?.button != null && evt.button !== 0) return;
      const actor = pickHotspotActor();
      if (!actor) return;
      selectedActor = actor;
      dragging = true;
      applyCursor();
      emitEditChange();
      applyDragPoint(actor, pickFloorPoint());
      evt?.preventDefault?.();
      return;
    }

    if (
      type === PointerEventTypes.POINTERUP ||
      type === PointerEventTypes.POINTERDOUBLETAP
    ) {
      if (!dragging) return;
      dragging = false;
      applyCursor();
    }
  });

  const pulseObserver = scene.onBeforeRenderObservable.add(() => {
    frame++;
    if (HOTSPOT_OCCLUSION && frame % OCCLUSION_EVERY_N_FRAMES === 0) {
      syncWantVisible();
    }

    const t = (performance.now() * 0.001 / WAVE_DURATION) % 1;
    const eased = 1 - Math.pow(1 - t, 2);
    const waveScale = WAVE_SCALE_FROM + (WAVE_SCALE_TO - WAVE_SCALE_FROM) * eased;
    const bigWaveScale = WAVE_SCALE_FROM + (BIG_WAVE_SCALE_TO - WAVE_SCALE_FROM) * eased;
    waveMat.alpha = WAVE_ALPHA * (1 - t);
    bigWaveMat.alpha = BIG_WAVE_ALPHA * (1 - t);

    hotspotsByActor.forEach((entry) => {
      const { root, button, wave, hitMesh, buttonMat, viewId, locked, big } = entry;
      const target = entry.wantVisible ? 1 : 0;
      entry.fade += (target - entry.fade) * FADE_LERP;
      if (entry.fade < 0.004) entry.fade = 0;
      else if (entry.fade > 0.996) entry.fade = 1;

      const showing = entry.fade > 0;
      root.setEnabled(showing);
      if (!showing) {
        hitMesh.isPickable = false;
        return;
      }

      const fadeScale = FADE_SCALE_FROM + (1 - FADE_SCALE_FROM) * entry.fade;
      button.visibility = entry.fade;
      button.scaling.setAll(fadeScale);
      wave.visibility = locked ? 0 : entry.fade;
      hitMesh.isPickable = !locked && entry.wantVisible && entry.fade >= PICK_FADE_MIN;

      if (locked) {
        wave.setEnabled(false);
        buttonMat.alpha = LOCKED_ALPHA;
        return;
      }
      wave.setEnabled(true);
      wave.scaling.setAll((big ? bigWaveScale : waveScale) * fadeScale);

      const selected = editMode && viewId === selectedActor;
      const targetAlpha = big
        ? selected
          ? BIG_CORE_SELECT_ALPHA
          : viewId === hoveredActor
            ? BIG_CORE_HOVER_ALPHA
            : BIG_CORE_IDLE_ALPHA
        : selected
          ? SELECT_ALPHA
          : viewId === hoveredActor
            ? HOVER_ALPHA
            : IDLE_ALPHA;
      buttonMat.alpha += (targetAlpha - buttonMat.alpha) * HOVER_LERP;

      if (selected) {
        buttonMat.emissiveColor.copyFrom(SELECT_COLOR);
        buttonMat.diffuseColor.copyFrom(SELECT_COLOR);
      } else {
        buttonMat.emissiveColor.set(1, 1, 1);
        buttonMat.diffuseColor.set(1, 1, 1);
      }
    });

    if (hoveredActor) {
      const hovered = hotspotsByActor.get(hoveredActor);
      if (!hovered?.wantVisible || hovered.fade < PICK_FADE_MIN) setHovered(null);
    }

    applyCursor();
  });

  function placeOnFloor(root, view) {
    const p = worldPos(markerSource(view));

    // Floating sphere: use config Y as-is (no floor snap).
    if (view.bigHotspot) {
      root.position.set(p.x, p.y, p.z);
      return;
    }

    const origin = new Vector3(p.x, p.y, p.z);
    const ray = new Ray(origin, Axis.Y.scale(-1), RAY_LENGTH);
    const pickMeshes = getPickMeshes?.() || [];
    const hit = scene.pickWithRay(ray, (m) => pickMeshes.includes(m));

    // Miss → keep near cam height (not y=0.5). Wrong depth looks like bad XZ when looking down.
    const y = hit?.hit && hit.pickedPoint
      ? hit.pickedPoint.y + FLOOR_OFFSET
      : p.y - 40;

    root.position.set(p.x, y, p.z);
  }

  function ensureHotspot(view) {
    let entry = hotspotsByActor.get(view.id);
    if (entry) return entry;

    const locked = !!view.locked;
    const big = !!view.bigHotspot;
    const root = new TransformNode(`hotspot_root_${view.id}`, scene);
    root.setEnabled(false);

    let button;
    let wave;
    let hitMesh;
    let buttonMat;

    if (big) {
      buttonMat = makeGlowSphereMat(
        scene,
        `hotspotBigBtnMat_${view.id}`,
        locked ? LOCKED_COLOR : Color3.White(),
        locked ? LOCKED_ALPHA : BIG_CORE_IDLE_ALPHA
      );

      button = MeshBuilder.CreateSphere(
        `hotspot_btn_${view.id}`,
        { diameter: BIG_CORE_DIAMETER, segments: 24 },
        scene
      );
      button.parent = root;
      button.material = buttonMat;
      button.isPickable = false;
      button.renderingGroupId = 1;

      wave = MeshBuilder.CreateSphere(
        `hotspot_wave_${view.id}`,
        { diameter: BIG_SHELL_DIAMETER, segments: 24 },
        scene
      );
      wave.parent = root;
      wave.material = bigWaveMat;
      wave.isPickable = false;
      wave.renderingGroupId = 1;
      wave.setEnabled(!locked);

      hitMesh = MeshBuilder.CreateSphere(
        `hotspot_hit_${view.id}`,
        { diameter: BIG_HIT_DIAMETER, segments: 12 },
        scene
      );
      hitMesh.parent = root;
      hitMesh.isVisible = false;
      hitMesh.isPickable = !locked;
      hitMesh.metadata = { hotspotViewId: locked ? null : view.id, locked };
    } else {
      buttonMat = makeUnlitAlphaMat(scene, `hotspotBtnMat_${view.id}`, buttonTexture);
      buttonMat.alpha = locked ? LOCKED_ALPHA : IDLE_ALPHA;
      if (locked) {
        buttonMat.emissiveColor = LOCKED_COLOR;
        buttonMat.diffuseColor = LOCKED_COLOR;
      }

      button = MeshBuilder.CreateDisc(
        `hotspot_btn_${view.id}`,
        { radius: RING_RADIUS, tessellation: 48 },
        scene
      );
      button.parent = root;
      button.rotation.x = Math.PI / 2;
      button.material = buttonMat;
      button.isPickable = false;
      button.renderingGroupId = 1;

      wave = MeshBuilder.CreateDisc(
        `hotspot_wave_${view.id}`,
        { radius: RING_RADIUS, tessellation: 48 },
        scene
      );
      wave.parent = root;
      wave.rotation.x = Math.PI / 2;
      wave.position.y = 0.15;
      wave.material = waveMat;
      wave.isPickable = false;
      wave.renderingGroupId = 1;
      wave.setEnabled(!locked);

      hitMesh = MeshBuilder.CreateCylinder(
        `hotspot_hit_${view.id}`,
        { diameter: HIT_DIAMETER, height: HIT_HEIGHT, tessellation: 24 },
        scene
      );
      hitMesh.parent = root;
      hitMesh.position.y = HIT_HEIGHT * 0.35;
      hitMesh.isVisible = false;
      hitMesh.isPickable = !locked;
      hitMesh.metadata = { hotspotViewId: locked ? null : view.id, locked };
    }

    entry = {
      root,
      button,
      wave,
      hitMesh,
      buttonMat,
      viewId: view.id,
      locked,
      big,
      wantVisible: false,
      fade: 0,
    };
    hotspotsByActor.set(view.id, entry);
    return entry;
  }

  function refresh(index) {
    const curr = CONFIG.views[index];
    if (!curr) return;

    currentIndex = index;
    currentActor = curr.id;
    visibleIds = HIDE_POINTS
      ? new Set()
      : SHOW_NEAR_POINTS && !editMode
        ? new Set(curr.views || [])
        : new Set(
            CONFIG.views.map((v) => v.id).filter((id) => id !== currentActor)
          );

    // Place once on create — re-raycasting every room change stalls the frame
    // (full GLB pick mesh list × every view).
    for (const view of CONFIG.views) {
      const isNew = !hotspotsByActor.has(view.id);
      const entry = ensureHotspot(view);
      if (isNew) placeOnFloor(entry.root, view);
    }

    syncWantVisible();

    if (hoveredActor === currentActor) {
      setHovered(null);
    }
    if (selectedActor === currentActor) {
      selectedActor = null;
      emitEditChange();
    }
  }

  function setVisible(visible) {
    captureHidden = !visible;
    if (!visible) {
      setHovered(null);
      // Instant hide for clean screenshots — no fade lag before capture.
      hotspotsByActor.forEach((entry) => {
        entry.wantVisible = false;
        entry.fade = 0;
        entry.root.setEnabled(false);
        entry.hitMesh.isPickable = false;
      });
      return;
    }
    syncWantVisible();
  }

  function setEditMode(enabled) {
    editMode = !!enabled;
    dragging = false;
    if (!editMode) {
      selectedActor = null;
      hotspotsByActor.forEach(({ buttonMat, locked }) => {
        if (locked) return;
        buttonMat.emissiveColor.set(1, 1, 1);
        buttonMat.diffuseColor.set(1, 1, 1);
      });
    }
    // Recompute visibility (edit shows all non-current markers).
    refresh(currentIndex);
    emitEditChange();
    applyCursor();
  }

  function isEditMode() {
    return editMode;
  }

  function isDragging() {
    return dragging;
  }

  /** True while editing and pointer is on a marker (or mid-drag) — blocks camera look. */
  function shouldBlockLook() {
    if (!editMode) return false;
    if (dragging) return true;
    return !!pickHotspotActor();
  }

  function viewIdFromPick(pickInfo) {
    const fromInfo = pickInfo?.pickedMesh?.metadata?.hotspotViewId;
    if (fromInfo) return fromInfo;
    return pickHotspotActor();
  }

  function dispose() {
    scene.onPointerObservable.remove(pointerObserver);
    scene.onBeforeRenderObservable.remove(pulseObserver);
    setHovered(null);
    scene.doNotHandleCursors = prevDoNotHandleCursors;
    if (inputEl) inputEl.style.cursor = "";
    hotspotsByActor.forEach(({ root, button, wave, hitMesh, buttonMat }) => {
      button.dispose();
      wave.dispose();
      hitMesh.dispose();
      buttonMat.dispose();
      root.dispose();
    });
    hotspotsByActor.clear();
    overrides.clear();
    buttonTexture.dispose();
    waveMat.dispose();
    bigWaveMat.dispose();
  }

  return {
    refresh,
    viewIdFromPick,
    setVisible,
    setEditMode,
    isEditMode,
    isDragging,
    shouldBlockLook,
    dispose,
  };
}

function roundCoord(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function createButtonTexture(scene) {
  const size = 256;
  const s = size / 40;
  const texture = new DynamicTexture(
    "hotspotBtnTex",
    { width: size, height: size },
    scene,
    false
  );
  const ctx = texture.getContext();
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx, cy, 19.5 * s, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 1.75 * s;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 10.3235 * s, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();

  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function createWaveMaterial(scene) {
  const size = 256;
  const s = size / 40;
  const texture = new DynamicTexture(
    "hotspotWaveTex",
    { width: size, height: size },
    scene,
    false
  );
  const ctx = texture.getContext();
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(cx, cy, 19.5 * s, 0, Math.PI * 2);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2.2 * s;
  ctx.stroke();

  texture.hasAlpha = true;
  texture.update();

  const mat = makeUnlitAlphaMat(scene, "hotspotWaveMat", texture);
  mat.alpha = WAVE_ALPHA;
  return mat;
}

function makeUnlitAlphaMat(scene, name, texture) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseTexture = texture;
  mat.opacityTexture = texture;
  mat.emissiveColor = Color3.White();
  mat.diffuseColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.useAlphaFromDiffuseTexture = true;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.zOffset = -20;
  mat.useLogarithmicDepth = true;
  return mat;
}

/** Untextured glowing sphere (core / pulse shell for `bigHotspot`). */
function makeGlowSphereMat(scene, name, color, alpha) {
  const mat = new StandardMaterial(name, scene);
  mat.emissiveColor = color.clone();
  mat.diffuseColor = color.clone();
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  mat.alpha = alpha;
  mat.backFaceCulling = false;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.zOffset = -20;
  mat.useLogarithmicDepth = true;
  return mat;
}

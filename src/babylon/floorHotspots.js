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
import { CONFIG, SHOW_NEAR_POINTS, HIDE_POINTS, worldPos } from "./config";

const RING_RADIUS = 20;
const HIT_DIAMETER = RING_RADIUS * 2.4;
const HIT_HEIGHT = 12;
const FLOOR_OFFSET = 0.6;
const RAY_LENGTH = 200;
const WAVE_DURATION = 1.7;
const WAVE_SCALE_FROM = 1;
const WAVE_SCALE_TO = 1.85;
const WAVE_ALPHA = 0.5;
const IDLE_ALPHA = 0.55;
const HOVER_ALPHA = 0.75;
const HOVER_LERP = 0.14;
const LOS_HEIGHT = 4;
const LOS_MARGIN = 2;
const OCCLUSION_EVERY_N_FRAMES = 2;

export function createFloorHotspots(scene, { getPickMeshes, hoverRef }) {
  const hotspotsByActor = new Map();
  const buttonTexture = createButtonTexture(scene);
  const waveMat = createWaveMaterial(scene);
  const inputEl = scene.getEngine().getInputElement();

  // Babylon resets canvas cursor every move unless meshUnderPointer has ActionManager.
  // Floor usually wins that pick, so we own the cursor ourselves.
  const prevDoNotHandleCursors = scene.doNotHandleCursors;
  scene.doNotHandleCursors = true;

  let hoveredActor = null;
  let currentActor = null;
  /** @type {Set<string>} */
  let visibleIds = new Set();
  let frame = 0;
  let captureHidden = false;

  function applyCursor() {
    if (!inputEl) return;
    inputEl.style.cursor = hoveredActor ? "pointer" : "default";
  }

  function setHovered(actor) {
    if (actor === hoveredActor) return;
    hoveredActor = actor;
    if (hoverRef) hoverRef.current = actor;
    applyCursor();
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

  function updateOcclusion() {
    if (captureHidden) {
      hotspotsByActor.forEach(({ root }) => root.setEnabled(false));
      return;
    }

    const camera = scene.activeCamera;
    if (!camera) return;

    const pickMeshes = getPickMeshes?.() || [];

    hotspotsByActor.forEach(({ root, viewId }) => {
      if (!visibleIds.has(viewId)) {
        root.setEnabled(false);
        return;
      }

      const occluded = isOccluded(camera, root.position, pickMeshes);
      root.setEnabled(!occluded);
    });

    if (hoveredActor) {
      const hovered = hotspotsByActor.get(hoveredActor);
      if (!hovered?.root.isEnabled()) setHovered(null);
    }
  }

  const pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERMOVE) return;
    setHovered(pickHotspotActor());
  });

  const pulseObserver = scene.onBeforeRenderObservable.add(() => {
    frame++;
    if (frame % OCCLUSION_EVERY_N_FRAMES === 0) {
      updateOcclusion();
    }

    const t = (performance.now() * 0.001 / WAVE_DURATION) % 1;
    const eased = 1 - Math.pow(1 - t, 2);
    const scale = WAVE_SCALE_FROM + (WAVE_SCALE_TO - WAVE_SCALE_FROM) * eased;
    waveMat.alpha = WAVE_ALPHA * (1 - t);

    hotspotsByActor.forEach(({ root, wave, buttonMat, viewId }) => {
      if (!root.isEnabled()) return;
      wave.scaling.setAll(scale);

      const targetAlpha = viewId === hoveredActor ? HOVER_ALPHA : IDLE_ALPHA;
      buttonMat.alpha += (targetAlpha - buttonMat.alpha) * HOVER_LERP;
    });

    applyCursor();
  });

  function placeOnFloor(root, view) {
    const p = worldPos(view.position);
    const origin = new Vector3(p.x, p.y, p.z);
    const ray = new Ray(origin, Axis.Y.scale(-1), RAY_LENGTH);
    const pickMeshes = getPickMeshes?.() || [];
    const hit = scene.pickWithRay(ray, (m) => pickMeshes.includes(m));

    const y = hit?.hit && hit.pickedPoint
      ? hit.pickedPoint.y + FLOOR_OFFSET
      : 0.5;

    root.position.set(p.x, y, p.z);
  }

  function ensureHotspot(view) {
    let entry = hotspotsByActor.get(view.id);
    if (entry) return entry;

    const root = new TransformNode(`hotspot_root_${view.id}`, scene);
    root.setEnabled(false);

    const buttonMat = makeUnlitAlphaMat(scene, `hotspotBtnMat_${view.id}`, buttonTexture);
    buttonMat.alpha = IDLE_ALPHA;

    const button = MeshBuilder.CreateDisc(
      `hotspot_btn_${view.id}`,
      { radius: RING_RADIUS, tessellation: 48 },
      scene
    );
    button.parent = root;
    button.rotation.x = Math.PI / 2;
    button.material = buttonMat;
    button.isPickable = false;
    button.renderingGroupId = 1;

    const wave = MeshBuilder.CreateDisc(
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

    const hitMesh = MeshBuilder.CreateCylinder(
      `hotspot_hit_${view.id}`,
      { diameter: HIT_DIAMETER, height: HIT_HEIGHT, tessellation: 24 },
      scene
    );
    hitMesh.parent = root;
    hitMesh.position.y = HIT_HEIGHT * 0.35;
    hitMesh.isVisible = false;
    hitMesh.isPickable = true;
    hitMesh.metadata = { hotspotViewId: view.id };

    entry = { root, button, wave, hitMesh, buttonMat, viewId: view.id };
    hotspotsByActor.set(view.id, entry);
    return entry;
  }

  function refresh(currentIndex) {
    const curr = CONFIG.views[currentIndex];
    if (!curr) return;

    currentActor = curr.id;
    visibleIds = HIDE_POINTS
      ? new Set()
      : SHOW_NEAR_POINTS
        ? new Set(curr.views || [])
        : new Set(
            CONFIG.views.map((v) => v.id).filter((id) => id !== currentActor)
          );

    CONFIG.views.forEach((view) => {
      const { root } = ensureHotspot(view);
      placeOnFloor(root, view);
      root.setEnabled(!captureHidden && visibleIds.has(view.id));
    });

    updateOcclusion();

    if (hoveredActor === currentActor) {
      setHovered(null);
    }
  }

  function setVisible(visible) {
    captureHidden = !visible;
    if (!visible) {
      setHovered(null);
      hotspotsByActor.forEach(({ root }) => root.setEnabled(false));
      return;
    }
    updateOcclusion();
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
    buttonTexture.dispose();
    waveMat.dispose();
  }

  return { refresh, viewIdFromPick, setVisible, dispose };
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

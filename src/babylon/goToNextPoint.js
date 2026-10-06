import { Vector3 } from "@babylonjs/core";
import { CONFIG, USE_MODEL, cubemapKey, isExteriorView, worldPos } from "./config";
import { easeInOutCubic } from "./easing";
import {
  setMaterialYaw,
  updateMaterialProjection,
  viewYawDegrees,
} from "./useCubemapsAndMaterials";
import { applyViewCageVisibility, syncNoModelSkybox } from "./noModelScene";

const MODEL_ANIM_FRAMES = 80;
/** Blur in → swap → blur out. ~0.9s at 60fps. */
const BLUR_ANIM_FRAMES = 54;
const BLUR_MAX_PX = 18;

function setCanvasBlur(scene, t01) {
  const canvas = scene?.getEngine()?.getRenderingCanvas?.();
  if (!canvas) return;
  if (t01 <= 0.001) {
    canvas.style.filter = "";
    return;
  }
  canvas.style.filter = `blur(${(t01 * BLUR_MAX_PX).toFixed(2)}px)`;
}

function clearCanvasBlur(scene) {
  setCanvasBlur(scene, 0);
}

function toVec3(p) {
  const w = worldPos(p);
  return new Vector3(w.x, w.y, w.z);
}

function settleCubemapCache(cache, nextView) {
  if (!cache || !nextView) return;
  const nextKey = cubemapKey(nextView);
  cache.touch(nextKey);
  // Floor is already pinned/resident after ensureFloorCubemaps — don't rebuild
  // the key list or retainOnly on every room hop.
}

function settleProjectionItems(items, nextCubemap, nextPos, nextYaw, nextView) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const mat = item.material;
    if (!mat || mat.isDisposed?.()) continue;
    mat.setTexture("cubemap", nextCubemap);
    mat.setTexture("cubemap2", nextCubemap);
    mat.setFloat("mixFactor", 0.0);
    setMaterialYaw(mat, nextYaw, nextYaw);
    if (item.holeFill || !USE_MODEL) {
      syncNoModelSkybox(item.mesh, mat, nextPos);
    } else {
      updateMaterialProjection(mat, nextPos, nextPos, 0.0);
    }
  }
  applyViewCageVisibility(items, nextView);
}

/**
 * @param {string} viewId
 * @param {object} refs
 * @param {object} cubemapCache
 * @param {{ transition?: "walk" | "blur" }} [options]
 *   walk — camera lerp (hotspots / floor click)
 *   blur — canvas blur + teleport (RoomSelector / Minimap)
 *   default: walk when USE_MODEL, else blur
 */
export const goToNextPoint = async (viewId, refs, cubemapCache, options = {}) => {
  const {
    isAnimatingRef,
    sceneRef,
    cameraRef,
    projectMeshesRef,
    indexRef,
    setCurrent,
    hidePanoramsRef,
    yawDegreesRef,
  } = refs;

  let transition =
    options.transition ?? (USE_MODEL ? "walk" : "blur");

  if (isAnimatingRef.current) return;
  isAnimatingRef.current = true;

  let animationStarted = false;

  try {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const curr = CONFIG.views[indexRef.current];
    const nextIndex = CONFIG.views.findIndex((v) => v.id === viewId);

    if (nextIndex === -1) {
      return;
    }

    const next = CONFIG.views[nextIndex];
    if (next.locked) {
      return;
    }
    // Outdoor sits outside the cage — never walk the GLB (dark exterior faces).
    if (isExteriorView(curr) || isExteriorView(next)) {
      transition = "blur";
    }
    const from = camera.position.clone();
    const to = toVec3(next.position);
    const currPos = toVec3(curr.position);
    const nextPos = toVec3(next.position);

    // Model-only view: fly camera, leave GLB materials alone.
    if (hidePanoramsRef?.current) {
      animationStarted = true;
      await new Promise((resolve) => {
        let animProgress = 0;
        const observer = scene.onBeforeRenderObservable.add(() => {
          animProgress++;
          const t = animProgress / MODEL_ANIM_FRAMES;
          camera.position = Vector3.Lerp(from, to, easeInOutCubic(t));
          if (animProgress >= MODEL_ANIM_FRAMES) {
            scene.onBeforeRenderObservable.remove(observer);
            setCurrent(nextIndex);
            isAnimatingRef.current = false;
            resolve();
          }
        });
      });
      return;
    }

    const currKey = cubemapKey(curr);
    const nextKey = cubemapKey(next);
    // Touch transition pair; pin set is owned by ensureFloorCubemaps
    // (full floor on desktop, neighborhood on mobile).
    cubemapCache?.touch(currKey);
    cubemapCache?.touch(nextKey);

    if (!cubemapCache) {
      throw new Error("Cubemap cache is not ready");
    }

    // Sync path when already warm — avoid await microtask hitch before anim starts.
    const nextCubemap =
      cubemapCache.peek(nextKey) || (await cubemapCache.get(scene, nextKey));
    const currYaw = yawDegreesRef?.current ?? viewYawDegrees(curr);
    const nextYaw = viewYawDegrees(next);

    const items = projectMeshesRef.current;
    for (let i = 0; i < items.length; i++) {
      const mat = items[i].material;
      mat.setTexture("cubemap2", nextCubemap);
      setMaterialYaw(mat, currYaw, nextYaw);
    }

    // UI jumps (select / minimap) and no-model mode: blur teleport, no wall-walk.
    if (transition === "blur" || !USE_MODEL) {
      animationStarted = true;
      await new Promise((resolve) => {
        runBlurTransition({
          scene,
          camera,
          projectMeshesRef,
          nextCubemap,
          nextPos,
          nextYaw,
          nextIndex,
          next,
          setCurrent,
          isAnimatingRef,
          cubemapCache,
          onDone: resolve,
        });
      });
      return;
    }

    animationStarted = true;
    const itemsWalk = projectMeshesRef.current;
    await new Promise((resolve) => {
      let animProgress = 0;
      const observer = scene.onBeforeRenderObservable.add(() => {
        animProgress++;
        const t = animProgress / MODEL_ANIM_FRAMES;
        const eased = easeInOutCubic(t);

        camera.position = Vector3.Lerp(from, to, eased);

        for (let i = 0; i < itemsWalk.length; i++) {
          updateMaterialProjection(itemsWalk[i].material, currPos, nextPos, eased);
        }

        if (animProgress >= MODEL_ANIM_FRAMES) {
          scene.onBeforeRenderObservable.remove(observer);
          settleProjectionItems(itemsWalk, nextCubemap, nextPos, nextYaw, next);
          setCurrent(nextIndex);
          settleCubemapCache(cubemapCache, next);
          isAnimatingRef.current = false;
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("[goToNextPoint]", error);
    clearCanvasBlur(sceneRef.current);
    const curr = CONFIG.views[indexRef.current];
    if (curr && cubemapCache) {
      cubemapCache.pin([cubemapKey(curr)]);
      cubemapCache.evictIfNeeded();
    }
  } finally {
    if (!animationStarted) {
      isAnimatingRef.current = false;
    }
  }
};

/**
 * Soft blur → teleport + cubemap swap at peak → unblur.
 * No camera fly (no model parallax to sell the walk).
 */
function runBlurTransition({
  scene,
  camera,
  projectMeshesRef,
  nextCubemap,
  nextPos,
  nextYaw,
  nextIndex,
  next,
  setCurrent,
  isAnimatingRef,
  cubemapCache,
  onDone,
}) {
  let animProgress = 0;
  let swapped = false;
  const half = BLUR_ANIM_FRAMES / 2;

  const observer = scene.onBeforeRenderObservable.add(() => {
    animProgress++;

    if (!swapped && animProgress >= half) {
      swapped = true;
      camera.position.copyFrom(nextPos);
      settleProjectionItems(
        projectMeshesRef.current,
        nextCubemap,
        nextPos,
        nextYaw,
        next
      );
      setCurrent(nextIndex);
      settleCubemapCache(cubemapCache, next);
    }

    // 0→1 over first half, 1→0 over second
    const raw =
      animProgress <= half
        ? animProgress / half
        : 1 - (animProgress - half) / half;
    setCanvasBlur(scene, easeInOutCubic(Math.min(1, Math.max(0, raw))));

    if (animProgress >= BLUR_ANIM_FRAMES) {
      scene.onBeforeRenderObservable.remove(observer);
      clearCanvasBlur(scene);
      isAnimatingRef.current = false;
      onDone?.();
    }
  });
}

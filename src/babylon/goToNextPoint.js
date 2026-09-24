import { Vector3 } from "@babylonjs/core";
import { CONFIG, USE_MODEL, HIDE_PANORAMS, cubemapKey, worldPos } from "./config";
import { easeInOutCubic } from "./easing";
import { updateMaterialProjection } from "./useCubemapsAndMaterials";
import { syncNoModelSkybox } from "./noModelScene";

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

export const goToNextPoint = async (viewId, refs, loadCubemap) => {
  const {
    isAnimatingRef,
    sceneRef,
    cameraRef,
    projectMeshesRef,
    indexRef,
    setCurrent,
  } = refs;

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
    const from = camera.position.clone();
    const to = toVec3(next.position);
    const currPos = toVec3(curr.position);
    const nextPos = toVec3(next.position);

    // Debug: fly camera only, leave GLB materials alone.
    if (HIDE_PANORAMS) {
      let animProgress = 0;
      animationStarted = true;
      const observer = scene.onBeforeRenderObservable.add(() => {
        animProgress++;
        const t = animProgress / MODEL_ANIM_FRAMES;
        camera.position = Vector3.Lerp(from, to, easeInOutCubic(t));
        if (animProgress >= MODEL_ANIM_FRAMES) {
          scene.onBeforeRenderObservable.remove(observer);
          setCurrent(nextIndex);
          isAnimatingRef.current = false;
        }
      });
      return;
    }

    const nextCubemap = await loadCubemap(scene, cubemapKey(next));

    projectMeshesRef.current.forEach((item) => {
      item.material.setTexture("cubemap2", nextCubemap);
    });

    if (!USE_MODEL) {
      animationStarted = true;
      runBlurTransition({
        scene,
        camera,
        projectMeshesRef,
        nextCubemap,
        nextPos,
        nextIndex,
        setCurrent,
        isAnimatingRef,
      });
      return;
    }

    let animProgress = 0;
    animationStarted = true;

    const observer = scene.onBeforeRenderObservable.add(() => {
      animProgress++;
      const t = animProgress / MODEL_ANIM_FRAMES;
      const eased = easeInOutCubic(t);

      camera.position = Vector3.Lerp(from, to, eased);

      projectMeshesRef.current.forEach((item) => {
        updateMaterialProjection(item.material, currPos, nextPos, eased);
      });

      if (animProgress >= MODEL_ANIM_FRAMES) {
        scene.onBeforeRenderObservable.remove(observer);

        projectMeshesRef.current.forEach((item) => {
          item.material.setTexture("cubemap", nextCubemap);
          item.material.setTexture("cubemap2", nextCubemap);
          item.material.setFloat("mixFactor", 0.0);
          updateMaterialProjection(item.material, nextPos, nextPos, 0.0);
        });

        setCurrent(nextIndex);
        isAnimatingRef.current = false;
      }
    });
  } catch (error) {
    console.error("[goToNextPoint]", error);
    clearCanvasBlur(sceneRef.current);
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
  nextIndex,
  setCurrent,
  isAnimatingRef,
}) {
  let animProgress = 0;
  let swapped = false;
  const half = BLUR_ANIM_FRAMES / 2;

  const observer = scene.onBeforeRenderObservable.add(() => {
    animProgress++;

    if (!swapped && animProgress >= half) {
      swapped = true;
      camera.position.copyFrom(nextPos);

      projectMeshesRef.current.forEach((item) => {
        item.material.setTexture("cubemap", nextCubemap);
        item.material.setTexture("cubemap2", nextCubemap);
        item.material.setFloat("mixFactor", 0.0);
        syncNoModelSkybox(item.mesh, item.material, nextPos);
      });

      setCurrent(nextIndex);
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
    }
  });
}

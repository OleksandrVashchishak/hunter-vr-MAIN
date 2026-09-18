import { Vector3 } from "@babylonjs/core";
import { CONFIG, cubemapKey } from "./config";
import { easeInOutCubic } from "./easing";
import { updateMaterialProjection } from "./useCubemapsAndMaterials";

export const goToNextPoint = async (viewId, refs, loadCubemap) => {
  const { isAnimatingRef, sceneRef, cameraRef, projectMeshesRef, indexRef, setCurrent } = refs;

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
    const to = new Vector3(next.position.x, next.position.y, next.position.z);
    const currPos = new Vector3(curr.position.x, curr.position.y, curr.position.z);
    const nextPos = new Vector3(next.position.x, next.position.y, next.position.z);

    const nextCubemap = await loadCubemap(scene, cubemapKey(next));

    projectMeshesRef.current.forEach((item) => {
      item.material.setTexture("cubemap2", nextCubemap);
    });

    let animProgress = 0;
    const animDuration = 80;
    animationStarted = true;

    const observer = scene.onBeforeRenderObservable.add(() => {
      animProgress++;
      const t = animProgress / animDuration;
      const eased = easeInOutCubic(t);

      camera.position = Vector3.Lerp(from, to, eased);

      projectMeshesRef.current.forEach((item) => {
        updateMaterialProjection(item.material, currPos, nextPos, eased);
      });

      if (animProgress >= animDuration) {
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
  } finally {
    if (!animationStarted) {
      isAnimatingRef.current = false;
    }
  }
};

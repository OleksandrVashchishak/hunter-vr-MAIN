import { useEffect, useRef, useState } from "react";
import { Engine, Scene, Color4, Vector3, SceneLoader, HemisphericLight } from "@babylonjs/core";
import "@babylonjs/loaders";
import {
  CONFIG,
  USE_MODEL,
  HIDE_PANORAMS,
  cubemapKey,
  neighborCubemapKeys,
  worldPos,
} from "./config";
import { registerShaders } from "./shaders";
import {
  createCubemapCache,
  createProjectionMaterial,
  setMaterialPanoOpacity,
  setMaterialYaw,
  updateMaterialProjection,
  viewYawDegrees,
} from "./useCubemapsAndMaterials";
import { pickNextViewFromClick } from "./pickNextViewFromClick";
import { goToNextPoint } from "./goToNextPoint";
import { attachTouchControls } from "./touchControls";
import { attachDesktopLookControls } from "./desktopLookControls";
import { attachZoomControls } from "./zoomControls";
import { createProjectedCursor } from "./projectedCursor";
import { createFloorHotspots } from "./floorHotspots";
import { createNoModelScene } from "./noModelScene";
import { isClick } from "./helpers/isClick";
import { initCamera } from "./initCamera";
import { initTourRoomAnalytics, syncRoomFromView } from "../analytics/fvAnalytics";

/** Initial load: first cubemap 0–25%, GLB download 25–100%. Without model / hide panos = skip cubemap bar. */
const LOAD_CUBEMAP_DONE = USE_MODEL && !HIDE_PANORAMS ? 25 : 100;

/**
 * Blender glTF often ships cm mesh data with node scale 0.01 (cm→m).
 * Tour cameras are in Max cm — undo that scale so projectors sit inside the cage.
 */
function undoBlenderMeterScale(meshes) {
  const seen = new Set();
  for (const mesh of meshes) {
    let node = mesh;
    while (node) {
      if (seen.has(node)) break;
      seen.add(node);
      const sx = node.scaling?.x;
      if (
        sx != null &&
        Math.abs(sx - 0.01) < 1e-4 &&
        Math.abs(node.scaling.y - 0.01) < 1e-4 &&
        Math.abs(node.scaling.z - 0.01) < 1e-4
      ) {
        node.scaling.setAll(1);
        // Translation was in meters; local mesh space already matches Max cm origin.
        node.position.setAll(0);
      }
      node = node.parent;
    }
  }
}

function isAlive(scene, aborted) {
  return !aborted && !!scene && !scene.isDisposed;
}

/**
 * Owns Babylon engine/scene lifecycle. UI stays in App.
 */
export function useBabylonTour() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const projectMeshesRef = useRef([]);
  const pickMeshesRef = useRef([]);
  const indexRef = useRef(0);
  const [currentIndex, setCurrent] = useState(0);
  const isAnimatingRef = useRef(false);
  const lastTouchRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [bootId, setBootId] = useState(0);
  const [panoramasVisible, setPanoramasVisible] = useState(!HIDE_PANORAMS);
  const [alignMode, setAlignMode] = useState(false);
  const [yawDegrees, setYawDegrees] = useState(() =>
    viewYawDegrees(CONFIG.views[0])
  );
  const aliveRef = useRef(true);
  const cubemapCacheRef = useRef(null);
  const cursorApiRef = useRef(null);
  const hotspotsRef = useRef(null);
  const hotspotHoverRef = useRef(null);
  const hidePanoramsRef = useRef(HIDE_PANORAMS);
  const debugLightRef = useRef(null);
  const removeResizeRef = useRef(null);
  const removeZoomRef = useRef(null);
  const removeDesktopLookRef = useRef(null);
  const removeTouchRef = useRef(null);
  const yawDegreesRef = useRef(yawDegrees);
  const alignModeRef = useRef(false);
  const panoOpacityRef = useRef(1);

  useEffect(() => {
    indexRef.current = currentIndex;
    hotspotsRef.current?.refresh(currentIndex);
    const view = CONFIG.views[currentIndex];
    if (!view) return;
    const y = viewYawDegrees(view);
    yawDegreesRef.current = y;
    setYawDegrees(y);
    applyYawToMeshes(y);
  }, [currentIndex]);

  useEffect(() => {
    const view = CONFIG.views[currentIndex];
    if (view) syncRoomFromView(view);
  }, [currentIndex]);

  const applyYawToMeshes = (yawDeg, yaw2Deg = yawDeg) => {
    for (const item of projectMeshesRef.current) {
      if (item.material && !item.material.isDisposed?.()) {
        setMaterialYaw(item.material, yawDeg, yaw2Deg);
      }
    }
  };

  const applyOpacityToMeshes = (opacity) => {
    panoOpacityRef.current = opacity;
    for (const item of projectMeshesRef.current) {
      if (item.material && !item.material.isDisposed?.()) {
        setMaterialPanoOpacity(item.material, opacity);
      }
    }
  };

  useEffect(() => {
    let aborted = false;
    aliveRef.current = true;

    const checkAlive = () => isAlive(sceneRef.current, aborted);
    const safeSetLoading = (value) => {
      if (!aborted) setLoading(value);
    };
    const safeSetPercent = (value) => {
      if (!aborted) setLoadingPercent(value);
    };
    const safeSetError = (message) => {
      if (!aborted) {
        setLoadError(message);
        setLoading(false);
      }
    };
    const safeSetCurrent = (value) => {
      if (aliveRef.current) setCurrent(value);
    };

    registerShaders();

    cubemapCacheRef.current?.disposeAll();
    const cubemapCache = createCubemapCache();
    cubemapCacheRef.current = cubemapCache;
    if (import.meta.env.DEV) {
      window.__cubemapCache = cubemapCache;
    }
    projectMeshesRef.current = [];
    pickMeshesRef.current = [];
    isAnimatingRef.current = false;
    hidePanoramsRef.current = HIDE_PANORAMS;
    debugLightRef.current = null;
    alignModeRef.current = false;
    panoOpacityRef.current = 1;
    if (!aborted) {
      setPanoramasVisible(!HIDE_PANORAMS);
      setAlignMode(false);
      const y0 = viewYawDegrees(CONFIG.views[0]);
      yawDegreesRef.current = y0;
      setYawDegrees(y0);
    }

    const navigate = (viewId) =>
      goToNextPoint(
        viewId,
        {
          isAnimatingRef,
          sceneRef,
          cameraRef,
          projectMeshesRef,
          indexRef,
          setCurrent: safeSetCurrent,
          hidePanoramsRef,
          yawDegreesRef,
        },
        cubemapCacheRef.current
      );

    async function initBabylon() {
      const canvas = canvasRef.current;
      if (!canvas || aborted) return;

      const engine = new Engine(canvas, true);

      engine.setHardwareScalingLevel(1);
      engine.setTextureFormatToUse(Engine.TEXTUREFORMAT_RGBA);
      engineRef.current = engine;
      const scene = new Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);
      hotspotHoverRef.current = null;
      cursorApiRef.current = USE_MODEL
        ? createProjectedCursor(scene, {
            isOverHotspot: () => !!hotspotHoverRef.current,
          })
        : null;
      const first = CONFIG.views[indexRef.current];
      const firstCubemapKey = cubemapKey(first);

      const camera = initCamera(scene, canvas, first);
      cameraRef.current = camera;
      removeTouchRef.current = attachTouchControls(canvas, camera, lastTouchRef);
      removeDesktopLookRef.current = attachDesktopLookControls(canvas, camera, scene);
      removeZoomRef.current = attachZoomControls(canvas, camera, lastTouchRef);

      try {
        if (!HIDE_PANORAMS) {
          await cubemapCache.get(scene, firstCubemapKey);
          if (!checkAlive()) return;
          cubemapCache.pin([firstCubemapKey]);
          safeSetPercent(LOAD_CUBEMAP_DONE);
          void cubemapCache.warm(
            scene,
            neighborCubemapKeys(first),
            checkAlive
          );
        } else {
          safeSetPercent(LOAD_CUBEMAP_DONE);
        }
      } catch (error) {
        console.error("[initCubemap]", firstCubemapKey, error);
        if (!checkAlive()) return;
        safeSetError("Couldn't load the starting panorama. Check your connection and try again.");
        return;
      }

      const finishSceneReady = () => {
        if (!checkAlive()) return;
        if (projectMeshesRef.current.length === 0) {
          safeSetError(
            USE_MODEL
              ? "3D model loaded empty. Please retry."
              : "Couldn't set up the panorama scene. Please retry."
          );
          return;
        }

        hotspotsRef.current?.dispose();
        hotspotsRef.current = createFloorHotspots(scene, {
          getPickMeshes: () => pickMeshesRef.current,
          hoverRef: hotspotHoverRef,
        });
        hotspotsRef.current.refresh(indexRef.current);

        safeSetPercent(100);
        safeSetLoading(false);
      };

      if (USE_MODEL) {
        SceneLoader.ImportMesh("", import.meta.env.BASE_URL, "model.glb", scene, (meshes) => {
          if (!checkAlive()) return;

          undoBlenderMeterScale(meshes);

          projectMeshesRef.current = [];

          if (HIDE_PANORAMS) {
            // Projection shader is unlit; raw GLB needs lights or it renders black.
            const hemi = new HemisphericLight("debugHemi", new Vector3(0.3, 1, 0.2), scene);
            hemi.intensity = 1.1;
            hemi.groundColor.set(0.35, 0.35, 0.4);
            debugLightRef.current = hemi;

            meshes.forEach((mesh) => {
              if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;
              mesh.isPickable = true;
              mesh.renderingGroupId = 0;
              projectMeshesRef.current.push({
                mesh,
                material: null,
                originalMaterial: mesh.material,
              });
            });
          } else {
            const cubemap1 = cubemapCache.peek(firstCubemapKey);
            if (!cubemap1) {
              safeSetError("Tour assets are incomplete. Please retry.");
              return;
            }

            const cubemap2 = cubemap1;
            const p = worldPos(first.position);
            const projectorPos = new Vector3(p.x, p.y, p.z);

            meshes.forEach((mesh) => {
              if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;

              const originalMaterial = mesh.material;
              const mat = createProjectionMaterial(
                scene,
                cubemap1,
                cubemap2,
                projectorPos,
                projectorPos,
                {
                  originalMaterial,
                  yawDeg: yawDegreesRef.current,
                  yaw2Deg: yawDegreesRef.current,
                  panoOpacity: panoOpacityRef.current,
                }
              );
              mesh.material = mat;
              mesh.isPickable = true;
              mesh.renderingGroupId = 0;

              projectMeshesRef.current.push({
                mesh,
                material: mat,
                originalMaterial,
              });
            });
          }

          pickMeshesRef.current = projectMeshesRef.current.map(({ mesh }) => mesh);
          finishSceneReady();
        }, (evt) => {
          if (!checkAlive()) return;
          if (evt.lengthComputable) {
            const glbShare = evt.loaded / evt.total;
            safeSetPercent(
              Math.round(LOAD_CUBEMAP_DONE + glbShare * (100 - LOAD_CUBEMAP_DONE))
            );
          }
        }, (error) => {
          console.error("[ImportMesh]", error);
          if (!checkAlive()) return;
          safeSetError("Couldn't load the 3D model. Check your connection and try again.");
        });
      } else {
        if (HIDE_PANORAMS) {
          safeSetError("HIDE_PANORAMS needs USE_MODEL=true.");
          return;
        }

        const cubemap1 = cubemapCache.peek(firstCubemapKey);
        if (!cubemap1) {
          safeSetError("Tour assets are incomplete. Please retry.");
          return;
        }

        const p = worldPos(first.position);
        const projectorPos = new Vector3(p.x, p.y, p.z);
        const { projectMeshes, pickMeshes } = createNoModelScene(scene, cubemap1, projectorPos);
        projectMeshesRef.current = projectMeshes;
        pickMeshesRef.current = pickMeshes;
        finishSceneReady();
      }

      let pointerDownTime = 0;
      let pointerDownPos = null;

      scene.onPointerDown = (evt) => {
        if (isAnimatingRef.current) return;
        if (evt.button !== 0 || pickMeshesRef.current.length === 0) return;

        pointerDownTime = performance.now();
        pointerDownPos = { x: evt.clientX, y: evt.clientY };
      };

      scene.onPointerUp = (evt, pickInfo) => {
        if (isAnimatingRef.current) return;
        if (evt.button !== 0 || pickMeshesRef.current.length === 0) return;
        if (isClick(pointerDownTime, pointerDownPos, evt)) {
          const hotspotViewId = hotspotsRef.current?.viewIdFromPick(pickInfo);
          const nextViewId =
            hotspotViewId ||
            pickNextViewFromClick(pickInfo, cameraRef.current, indexRef);
          if (nextViewId) {
            navigate(nextViewId);
          }
        }
      };

      engine.runRenderLoop(() => {
        if (scene.isDisposed) return;
        scene.render();
      });
      const handleResize = () => {
        if (!engineRef.current || engineRef.current.isDisposed) return;
        engine.resize();
      };
      window.addEventListener("resize", handleResize);
      removeResizeRef.current = () => window.removeEventListener("resize", handleResize);
    }

    initBabylon();

    const disposeRoomAnalytics = initTourRoomAnalytics(() => CONFIG.views[indexRef.current]);

    return () => {
      aborted = true;
      aliveRef.current = false;
      disposeRoomAnalytics?.();
      cursorApiRef.current?.dispose();
      cursorApiRef.current = null;
      hotspotsRef.current?.dispose();
      hotspotsRef.current = null;
      removeTouchRef.current?.();
      removeTouchRef.current = null;
      removeZoomRef.current?.();
      removeZoomRef.current = null;
      removeDesktopLookRef.current?.();
      removeDesktopLookRef.current = null;
      removeResizeRef.current?.();
      removeResizeRef.current = null;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
      projectMeshesRef.current = [];
      pickMeshesRef.current = [];
      cubemapCacheRef.current?.disposeAll();
      cubemapCacheRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.filter = "";
    };
  }, [bootId]);

  const navigateTo = (viewId) =>
    goToNextPoint(
      viewId,
      {
        isAnimatingRef,
        sceneRef,
        cameraRef,
        projectMeshesRef,
        indexRef,
        setCurrent: (value) => {
          if (aliveRef.current) setCurrent(value);
        },
        hidePanoramsRef,
        yawDegreesRef,
      },
      cubemapCacheRef.current
    );

  const retry = () => {
    setLoadError(null);
    setLoading(true);
    setLoadingPercent(0);
    setBootId((id) => id + 1);
  };

  const setOverlaysVisible = (visible) => {
    cursorApiRef.current?.setVisible(visible);
    hotspotsRef.current?.setVisible(visible);
  };

  const nudgeYaw = (delta) => {
    if (!USE_MODEL || loading || loadError || hidePanoramsRef.current) return;
    const next = Math.round((yawDegreesRef.current + delta) * 10) / 10;
    yawDegreesRef.current = next;
    setYawDegrees(next);
    applyYawToMeshes(next);
  };

  const setYawDegreesValue = (value) => {
    if (!USE_MODEL || loading || loadError || hidePanoramsRef.current) return;
    const next = Math.round((Number(value) || 0) * 10) / 10;
    yawDegreesRef.current = next;
    setYawDegrees(next);
    applyYawToMeshes(next);
  };

  const toggleAlignMode = async () => {
    if (!USE_MODEL || loading || loadError || isAnimatingRef.current) return;

    if (!alignModeRef.current) {
      if (hidePanoramsRef.current) {
        await togglePanoramas();
        if (hidePanoramsRef.current) return;
      }
      alignModeRef.current = true;
      setAlignMode(true);
      applyOpacityToMeshes(0.5);
      return;
    }

    alignModeRef.current = false;
    setAlignMode(false);
    applyOpacityToMeshes(1);
  };

  const togglePanoramas = async () => {
    if (!USE_MODEL || loading || loadError || isAnimatingRef.current) return;

    const scene = sceneRef.current;
    const items = projectMeshesRef.current;
    if (!scene || items.length === 0) return;

    const currentlyHidden = hidePanoramsRef.current;

    if (!currentlyHidden) {
      // Hide panos → show raw GLB materials.
      hidePanoramsRef.current = true;
      setPanoramasVisible(false);

      if (alignModeRef.current) {
        alignModeRef.current = false;
        setAlignMode(false);
        panoOpacityRef.current = 1;
      }

      if (!debugLightRef.current || debugLightRef.current.isDisposed?.()) {
        const hemi = new HemisphericLight("debugHemi", new Vector3(0.3, 1, 0.2), scene);
        hemi.intensity = 1.1;
        hemi.groundColor.set(0.35, 0.35, 0.4);
        debugLightRef.current = hemi;
      } else {
        debugLightRef.current.setEnabled(true);
      }

      items.forEach(({ mesh, originalMaterial }) => {
        mesh.material = originalMaterial;
      });
      return;
    }

    // Show panos → restore projection materials for current view.
    const view = CONFIG.views[indexRef.current];
    const cubemapCache = cubemapCacheRef.current;
    if (!view || !cubemapCache) return;

    try {
      const key = cubemapKey(view);
      const cubemap = await cubemapCache.get(scene, key);
      if (!aliveRef.current || scene.isDisposed) return;

      cubemapCache.pin([key]);
      void cubemapCache.warm(scene, neighborCubemapKeys(view), () => aliveRef.current && !scene.isDisposed);

      const p = worldPos(view.position);
      const projectorPos = new Vector3(p.x, p.y, p.z);
      const yawDeg = yawDegreesRef.current;
      const opacity = alignModeRef.current ? 0.5 : panoOpacityRef.current;

      for (const item of items) {
        let mat = item.material;
        if (!mat || mat.isDisposed?.()) {
          mat = createProjectionMaterial(
            scene,
            cubemap,
            cubemap,
            projectorPos,
            projectorPos,
            {
              originalMaterial: item.originalMaterial,
              yawDeg,
              yaw2Deg: yawDeg,
              panoOpacity: opacity,
            }
          );
          item.material = mat;
        } else {
          mat.setTexture("cubemap", cubemap);
          mat.setTexture("cubemap2", cubemap);
          mat.setFloat("mixFactor", 0);
          setMaterialYaw(mat, yawDeg, yawDeg);
          setMaterialPanoOpacity(mat, opacity);
          updateMaterialProjection(mat, projectorPos, projectorPos, 0);
        }
        item.mesh.material = mat;
      }

      panoOpacityRef.current = opacity;

      if (debugLightRef.current && !debugLightRef.current.isDisposed?.()) {
        debugLightRef.current.setEnabled(false);
      }

      hidePanoramsRef.current = false;
      setPanoramasVisible(true);
    } catch (error) {
      console.error("[togglePanoramas]", error);
    }
  };

  return {
    canvasRef,
    engineRef,
    cameraRef,
    currentIndex,
    loading,
    loadingPercent,
    loadError,
    panoramasVisible,
    alignMode,
    yawDegrees,
    navigateTo,
    retry,
    setOverlaysVisible,
    togglePanoramas,
    toggleAlignMode,
    nudgeYaw,
    setYawDegreesValue,
  };
}

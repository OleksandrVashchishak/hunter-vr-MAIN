import { useEffect, useRef, useState } from "react";
import { Engine, Scene, Color4, Vector3, SceneLoader } from "@babylonjs/core";
import "@babylonjs/loaders";
import { CONFIG, cubemapKey } from "./config";
import { registerShaders } from "./shaders";
import { createCubemapLoader, createProjectionMaterial } from "./useCubemapsAndMaterials";
import { pickNextViewFromClick } from "./pickNextViewFromClick";
import { goToNextPoint } from "./goToNextPoint";
import { attachTouchControls } from "./touchControls";
import { attachDesktopLookControls } from "./desktopLookControls";
import { attachZoomControls } from "./zoomControls";
import { createProjectedCursor } from "./projectedCursor";
import { createFloorHotspots } from "./floorHotspots";
import { isClick } from "./helpers/isClick";
import { initCamera } from "./initCamera";
import { initTourRoomAnalytics, syncRoomFromView } from "../analytics/fvAnalytics";

/** Initial load: first cubemap 0–25%, GLB download 25–100%. Preloads don't touch the bar. */
const LOAD_CUBEMAP_DONE = 25;

function isAlive(scene, aborted) {
  return !aborted && !!scene && !scene.isDisposed;
}

async function preloadCubemapsSequential(scene, firstKey, loadCubemapAsync, checkAlive) {
  for (const view of CONFIG.views) {
    if (!checkAlive()) return;
    const key = cubemapKey(view);
    if (key === firstKey) continue;

    try {
      await loadCubemapAsync(scene, key);
    } catch (error) {
      if (!checkAlive()) return;
      console.error("[preloadCubemap]", key, error);
    }

    await new Promise((r) => setTimeout(r, 200));
  }
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
  const indexRef = useRef(0);
  const [currentIndex, setCurrent] = useState(0);
  const preloadedCubemapsRef = useRef({});
  const isAnimatingRef = useRef(false);
  const lastTouchRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [bootId, setBootId] = useState(0);
  const aliveRef = useRef(true);
  const loadCubemapRef = useRef(null);
  const cursorApiRef = useRef(null);
  const hotspotsRef = useRef(null);
  const hotspotHoverRef = useRef(null);
  const removeResizeRef = useRef(null);
  const removeZoomRef = useRef(null);
  const removeDesktopLookRef = useRef(null);
  const removeTouchRef = useRef(null);

  useEffect(() => {
    indexRef.current = currentIndex;
    hotspotsRef.current?.refresh(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const view = CONFIG.views[currentIndex];
    if (view) syncRoomFromView(view);
  }, [currentIndex]);

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

    preloadedCubemapsRef.current = {};
    projectMeshesRef.current = [];
    isAnimatingRef.current = false;

    const loadCubemap = createCubemapLoader(preloadedCubemapsRef);
    loadCubemapRef.current = loadCubemap;

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
        },
        loadCubemapRef.current
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
      cursorApiRef.current = createProjectedCursor(scene, {
        isOverHotspot: () => !!hotspotHoverRef.current,
      });
      const first = CONFIG.views[indexRef.current];
      const firstCubemapKey = cubemapKey(first);

      const camera = initCamera(scene, canvas, first);
      cameraRef.current = camera;
      removeTouchRef.current = attachTouchControls(canvas, camera, lastTouchRef);
      removeDesktopLookRef.current = attachDesktopLookControls(canvas, camera, scene);
      removeZoomRef.current = attachZoomControls(canvas, camera, lastTouchRef);

      try {
        await loadCubemap(scene, firstCubemapKey);
        if (!checkAlive()) return;
        safeSetPercent(LOAD_CUBEMAP_DONE);
      } catch (error) {
        console.error("[initCubemap]", firstCubemapKey, error);
        if (!checkAlive()) return;
        safeSetError("Couldn't load the starting panorama. Check your connection and try again.");
        return;
      }

      preloadCubemapsSequential(scene, firstCubemapKey, loadCubemap, checkAlive);

      SceneLoader.ImportMesh("", import.meta.env.BASE_URL, "model.glb", scene, (meshes) => {
        if (!checkAlive()) return;

        safeSetPercent(100);

        const cubemap1 = preloadedCubemapsRef.current[firstCubemapKey];
        if (!cubemap1) {
          safeSetError("Tour assets are incomplete. Please retry.");
          return;
        }

        const cubemap2 = cubemap1;
        const projectorPos = new Vector3(first.position.x, first.position.y, first.position.z);

        projectMeshesRef.current = [];
        meshes.forEach((mesh) => {
          if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;

          const mat = createProjectionMaterial(scene, cubemap1, cubemap2, projectorPos, projectorPos);
          mesh.material = mat;
          mesh.isPickable = true;
          mesh.renderingGroupId = 0;

          projectMeshesRef.current.push({ mesh, material: mat });
        });

        if (projectMeshesRef.current.length === 0) {
          safeSetError("3D model loaded empty. Please retry.");
          return;
        }

        hotspotsRef.current?.dispose();
        hotspotsRef.current = createFloorHotspots(scene, {
          getPickMeshes: () => projectMeshesRef.current.map(({ mesh }) => mesh),
          hoverRef: hotspotHoverRef,
        });
        hotspotsRef.current.refresh(indexRef.current);

        safeSetLoading(false);
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

      let pointerDownTime = 0;
      let pointerDownPos = null;

      scene.onPointerDown = (evt) => {
        if (isAnimatingRef.current) return;
        if (evt.button !== 0 || projectMeshesRef.current.length === 0) return;

        pointerDownTime = performance.now();
        pointerDownPos = { x: evt.clientX, y: evt.clientY };
      };

      scene.onPointerUp = (evt, pickInfo) => {
        if (isAnimatingRef.current) return;
        if (evt.button !== 0 || projectMeshesRef.current.length === 0) return;
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
      preloadedCubemapsRef.current = {};
      loadCubemapRef.current = null;
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
      },
      loadCubemapRef.current
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

  return {
    canvasRef,
    engineRef,
    cameraRef,
    currentIndex,
    loading,
    loadingPercent,
    loadError,
    navigateTo,
    retry,
    setOverlaysVisible,
  };
}

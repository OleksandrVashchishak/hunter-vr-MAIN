import { useEffect, useRef, useState } from "react";
import { Engine, Scene, Color4, Vector3, SceneLoader, HemisphericLight } from "@babylonjs/core";
import "@babylonjs/loaders";
import {
  CONFIG,
  USE_MODEL,
  HIDE_PANORAMS,
  cubemapKey,
  worldPos,
} from "./config";
import { createTourEngine, isWebGLInitError } from "./createTourEngine";
import { createTourPipeline } from "./createTourPipeline";
import { registerShaders } from "./shaders";
import {
  createCubemapCache,
  createProjectionMaterial,
  setMaterialPanoOpacity,
  setMaterialYaw,
  updateMaterialProjection,
  viewYawDegrees,
} from "./useCubemapsAndMaterials";
import { getTourGpuProfile } from "./helpers/mobileProfile";
import { ensureFloorCubemaps, resolveFloorForView } from "./floorCubemaps";
import { pickNextViewFromClick } from "./pickNextViewFromClick";
import { goToNextPoint } from "./goToNextPoint";
import { attachTouchControls } from "./touchControls";
import { attachDesktopLookControls } from "./desktopLookControls";
import { attachZoomControls } from "./zoomControls";
import { createProjectedCursor } from "./projectedCursor";
import { createFloorHotspots } from "./floorHotspots";
import { createNoModelScene, createProjectionSkybox, applyViewCageVisibility } from "./noModelScene";
import { isClick } from "./helpers/isClick";
import { initCamera } from "./initCamera";
import {
  cameraLookYawDegrees,
  setCameraLookYawDegrees,
  viewLookYawDegrees,
} from "./cameraLook";
import { resolveStartViewIndex } from "./resolveStartView";
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

/** After parent scale/pos edits, picks use stale world matrices until the next render. */
function syncPickMeshTransforms(meshes) {
  for (const mesh of meshes) {
    if (!mesh || mesh.isDisposed?.()) continue;
    mesh.computeWorldMatrix(true);
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
  /** Minimap travel pin — set when a hop starts, cleared when settle updates currentIndex. */
  const [travelViewId, setTravelViewId] = useState(null);
  const isAnimatingRef = useRef(false);
  const lastTouchRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorLoadingPercent, setFloorLoadingPercent] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [bootId, setBootId] = useState(0);
  const [panoramasVisible, setPanoramasVisible] = useState(!HIDE_PANORAMS);
  const [alignMode, setAlignMode] = useState(false);
  const [lookMode, setLookMode] = useState(false);
  const [hotspotEditMode, setHotspotEditMode] = useState(false);
  const [hotspotEditSelection, setHotspotEditSelection] = useState(null);
  const [yawDegrees, setYawDegrees] = useState(() =>
    viewYawDegrees(CONFIG.views[0])
  );
  const [lookYawDegrees, setLookYawDegrees] = useState(() => {
    const v = CONFIG.views[0];
    return viewLookYawDegrees(v) ?? 0;
  });
  const aliveRef = useRef(true);
  const cubemapCacheRef = useRef(null);
  const loadedFloorIdRef = useRef(null);
  const floorLoadGenRef = useRef(0);
  const floorLoadingRef = useRef(false);
  const runGoToRef = useRef(null);
  const cursorApiRef = useRef(null);
  const hotspotsRef = useRef(null);
  const hotspotHoverRef = useRef(null);
  const hotspotEditModeRef = useRef(false);
  const hidePanoramsRef = useRef(HIDE_PANORAMS);
  const debugLightRef = useRef(null);
  const removeResizeRef = useRef(null);
  const removeZoomRef = useRef(null);
  const removeDesktopLookRef = useRef(null);
  const desktopLookApiRef = useRef(null);
  const removeTouchRef = useRef(null);
  const pipelineRef = useRef(null);
  const yawDegreesRef = useRef(yawDegrees);
  const lookYawDegreesRef = useRef(lookYawDegrees);
  const alignModeRef = useRef(false);
  const lookModeRef = useRef(false);
  const panoOpacityRef = useRef(1);

  const syncLookYawFromCameraOrView = (view) => {
    // Capture what the user is seeing now; config only before camera exists.
    const next = cameraRef.current
      ? cameraLookYawDegrees(cameraRef.current)
      : viewLookYawDegrees(view) ?? 0;
    lookYawDegreesRef.current = next;
    setLookYawDegrees(next);
  };

  useEffect(() => {
    indexRef.current = currentIndex;
    hotspotsRef.current?.refresh(currentIndex);
    const view = CONFIG.views[currentIndex];
    if (!view) return;
    const y = viewYawDegrees(view);
    yawDegreesRef.current = y;
    setYawDegrees(y);
    applyYawToMeshes(y);
    syncLookYawFromCameraOrView(view);
  }, [currentIndex]);

  useEffect(() => {
    const view = CONFIG.views[currentIndex];
    if (view) syncRoomFromView(view);
  }, [currentIndex]);

  // Look mode: keep panel in sync with free mouse/touch look.
  useEffect(() => {
    if (!lookMode) return undefined;
    const scene = sceneRef.current;
    if (!scene || scene.isDisposed) return undefined;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const y = cameraLookYawDegrees(cameraRef.current);
      if (Math.abs(y - lookYawDegreesRef.current) < 0.05) return;
      lookYawDegreesRef.current = y;
      setLookYawDegrees(y);
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [lookMode]);

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

  /**
   * Warm cubemaps for a view.
   * Desktop: whole floor. Mobile: current + one-hop neighbors only.
   * Loader — floor switch (desktop) or cold target panorama (mobile).
   */
  const ensureFloorLoaded = async (view, { showLoader = true } = {}) => {
    if (HIDE_PANORAMS || !view) return { floorId: null, changed: false };

    const scene = sceneRef.current;
    const cache = cubemapCacheRef.current;
    if (!scene || scene.isDisposed || !cache) {
      return { floorId: null, changed: false };
    }

    const warmScope = getTourGpuProfile().mobile ? "neighborhood" : "floor";
    const floor = resolveFloorForView(view);
    const currentView = CONFIG.views[indexRef.current];
    const currentFloorId = resolveFloorForView(currentView)?.id ?? null;
    // Prefer the already-committed floor; fall back to where the camera is now
    // so a mid-warm neighbor click does not look like a floor change.
    const knownFloorId = loadedFloorIdRef.current ?? currentFloorId;
    const isFloorSwitch = !!floor && knownFloorId !== floor.id;
    const targetKey = cubemapKey(view);
    const needsLoader =
      showLoader &&
      (warmScope === "neighborhood"
        ? !cache.peek(targetKey)
        : isFloorSwitch);
    const gen = ++floorLoadGenRef.current;
    const displayKey =
      currentView && currentView.id !== view.id ? cubemapKey(currentView) : null;

    if (needsLoader) {
      floorLoadingRef.current = true;
      setFloorLoading(true);
      setFloorLoadingPercent(0);
    }

    try {
      return await ensureFloorCubemaps({
        scene,
        cache,
        view,
        loadedFloorIdRef,
        displayKey,
        scope: warmScope,
        checkAlive: () =>
          aliveRef.current &&
          floorLoadGenRef.current === gen &&
          !scene.isDisposed,
        onProgress: ({ done, total }) => {
          if (!aliveRef.current || floorLoadGenRef.current !== gen) return;
          const pct = total > 0 ? Math.round((done / total) * 100) : 100;
          setFloorLoadingPercent(pct);
        },
      });
    } finally {
      if (aliveRef.current && floorLoadGenRef.current === gen && needsLoader) {
        floorLoadingRef.current = false;
        setFloorLoading(false);
        setFloorLoadingPercent(100);
      }
    }
  };

  const runGoTo = async (viewId, transition) => {
    if (isAnimatingRef.current || floorLoadingRef.current) return;

    const next = CONFIG.views.find((v) => v.id === viewId);
    if (!next || next.locked) return;

    if (!HIDE_PANORAMS) {
      const cache = cubemapCacheRef.current;
      const nextKey = cubemapKey(next);
      const neighborhoodMode = getTourGpuProfile().mobile;

      if (neighborhoodMode) {
        // Mobile: walk if target is warm; otherwise load target (+ neighbors).
        if (!cache?.peek(nextKey)) {
          await ensureFloorLoaded(next, { showLoader: true });
          if (!aliveRef.current) return;
        }
      } else {
        const nextFloorId = resolveFloorForView(next)?.id ?? null;
        const currentFloorId =
          resolveFloorForView(CONFIG.views[indexRef.current])?.id ?? null;
        const knownFloorId = loadedFloorIdRef.current ?? currentFloorId;
        const floorReady =
          !!knownFloorId &&
          nextFloorId === knownFloorId &&
          !!cache?.peek(nextKey);

        // Same floor + already warm → skip ensureFloor (no await / no loader flash).
        // Same floor but still warming → await silently (no FloorLoader).
        if (!floorReady) {
          await ensureFloorLoaded(next, {
            showLoader: !!nextFloorId && nextFloorId !== knownFloorId,
          });
          if (!aliveRef.current) return;
        }
      }
    }

    if (aliveRef.current) setTravelViewId(viewId);

    await goToNextPoint(
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
        resetLookVelocity: () => desktopLookApiRef.current?.resetVelocity?.(),
      },
      cubemapCacheRef.current,
      { transition }
    );

    // Keep travel pin until hop fully ends (blur used to clear mid-fade and kill the slide).
    if (aliveRef.current) setTravelViewId(null);

    // Mobile: refresh neighbor pocket + drop the previous displayKey from pins.
    // Desktop: cheap no-op when the floor is already fully resident.
    if (!HIDE_PANORAMS && aliveRef.current) {
      void ensureFloorLoaded(next, { showLoader: false });
    }
  };
  runGoToRef.current = runGoTo;

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

    registerShaders();

    cubemapCacheRef.current?.disposeAll();
    const gpuProfile = getTourGpuProfile();
    const cubemapCache = createCubemapCache({
      maxSize: gpuProfile.cubemapCacheMax,
      cubemapPath: gpuProfile.cubemapPath,
      fallbackCubemapPath: gpuProfile.mobile ? "panorams" : null,
      anisotropicFilteringLevel: gpuProfile.anisotropicFilteringLevel,
      generateMipMaps: gpuProfile.generateMipMaps,
    });
    cubemapCacheRef.current = cubemapCache;
    loadedFloorIdRef.current = null;
    floorLoadGenRef.current += 1;
    if (import.meta.env.DEV) {
      window.__cubemapCache = cubemapCache;
    }
    projectMeshesRef.current = [];
    pickMeshesRef.current = [];
    isAnimatingRef.current = false;
    hidePanoramsRef.current = HIDE_PANORAMS;
    debugLightRef.current = null;
    alignModeRef.current = false;
    lookModeRef.current = false;
    panoOpacityRef.current = 1;
    if (!aborted) {
      setPanoramasVisible(!HIDE_PANORAMS);
      setAlignMode(false);
      setLookMode(false);
      const startIdx = resolveStartViewIndex() ?? 0;
      indexRef.current = startIdx;
      setCurrent(startIdx);
      const y0 = viewYawDegrees(CONFIG.views[startIdx]);
      yawDegreesRef.current = y0;
      setYawDegrees(y0);
      const look0 =
        viewLookYawDegrees(CONFIG.views[startIdx]) ?? 0;
      lookYawDegreesRef.current = look0;
      setLookYawDegrees(look0);
    }

    const navigate = (viewId) => runGoToRef.current?.(viewId, "walk");

    async function initBabylon() {
      const canvas = canvasRef.current;
      if (!canvas || aborted) return;

      let engine;
      try {
        engine = createTourEngine(canvas);
      } catch (error) {
        console.error("[initBabylon]", error);
        safeSetError(
          isWebGLInitError(error)
            ? "Couldn't start 3D graphics in this browser tab. Try Chrome/Edge, close other heavy tabs, or open the tour in a new window."
            : "Couldn't start the 3D tour. Please retry."
        );
        return;
      }

      engine.setHardwareScalingLevel(gpuProfile.hardwareScalingLevel);
      engine.setTextureFormatToUse(Engine.TEXTUREFORMAT_RGBA);
      engineRef.current = engine;
      const scene = new Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);
      hotspotHoverRef.current = null;
      // Mobile look = constant touchmoves; projected cursor does full-GLB picks per move.
      cursorApiRef.current =
        USE_MODEL && !gpuProfile.mobile
          ? createProjectedCursor(scene, {
              isOverHotspot: () => !!hotspotHoverRef.current,
            })
          : null;
      const first = CONFIG.views[indexRef.current];
      const firstCubemapKey = cubemapKey(first);

      const lookBlocked = () => !!hotspotsRef.current?.shouldBlockLook?.();

      const camera = initCamera(scene, canvas, first);
      cameraRef.current = camera;
      pipelineRef.current?.dispose();
      pipelineRef.current = createTourPipeline(scene, camera);
      removeTouchRef.current = attachTouchControls(canvas, camera, lastTouchRef, {
        isBlocked: lookBlocked,
      });
      const desktopLook = attachDesktopLookControls(canvas, camera, scene, {
        isBlocked: lookBlocked,
      });
      desktopLookApiRef.current = desktopLook;
      removeDesktopLookRef.current = desktopLook.dispose;
      removeZoomRef.current = attachZoomControls(canvas, camera, lastTouchRef);

      try {
        if (!HIDE_PANORAMS) {
          await cubemapCache.get(scene, firstCubemapKey);
          if (!checkAlive()) return;
          cubemapCache.pin([firstCubemapKey]);
          safeSetPercent(LOAD_CUBEMAP_DONE);
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

        syncPickMeshTransforms(pickMeshesRef.current);

        applyViewCageVisibility(
          projectMeshesRef.current,
          CONFIG.views[indexRef.current]
        );

        hotspotsRef.current?.dispose();
        hotspotsRef.current = createFloorHotspots(scene, {
          getPickMeshes: () => pickMeshesRef.current,
          hoverRef: hotspotHoverRef,
          onEditChange: (sel) => {
            if (!aliveRef.current) return;
            setHotspotEditSelection(sel);
          },
        });
        if (hotspotEditModeRef.current) {
          hotspotsRef.current.setEditMode(true);
        }
        hotspotsRef.current.refresh(indexRef.current);

        // One more place after the first rendered frame — bounding/octree fully settled.
        scene.onAfterRenderObservable.addOnce(() => {
          if (!checkAlive() || !hotspotsRef.current) return;
          syncPickMeshTransforms(pickMeshesRef.current);
          hotspotsRef.current.refresh(indexRef.current);
        });

        safeSetPercent(100);
        safeSetLoading(false);

        // First cubemap is up — warm the rest silently (whole floor on
        // desktop, neighbors only on mobile). Don't flash FloorLoader.
        if (!HIDE_PANORAMS) {
          void ensureFloorLoaded(CONFIG.views[indexRef.current], {
            showLoader: false,
          });
        }
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

            // Cage gaps / culled glass show clearColor otherwise — fill with same pano.
            projectMeshesRef.current.push(
              createProjectionSkybox(scene, cubemap1, projectorPos, {
                name: "cageHoleSkybox",
                yawDeg: yawDegreesRef.current,
                panoOpacity: panoOpacityRef.current,
              })
            );
          }

          pickMeshesRef.current = projectMeshesRef.current
            .filter((item) => !item.holeFill)
            .map(({ mesh }) => mesh);
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
        if (isAnimatingRef.current || floorLoadingRef.current) return;
        if (evt.button !== 0 || pickMeshesRef.current.length === 0) return;

        pointerDownTime = performance.now();
        pointerDownPos = { x: evt.clientX, y: evt.clientY };
      };

      scene.onPointerUp = (evt, pickInfo) => {
        if (isAnimatingRef.current || floorLoadingRef.current) return;
        if (evt.button !== 0 || pickMeshesRef.current.length === 0) return;
        if (hotspotEditModeRef.current || hotspotsRef.current?.isDragging()) return;
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

    initBabylon().catch((error) => {
      console.error("[initBabylon]", error);
      safeSetError("Couldn't start the 3D tour. Please retry.");
    });

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
      desktopLookApiRef.current = null;
      removeResizeRef.current?.();
      removeResizeRef.current = null;
      pipelineRef.current?.dispose();
      pipelineRef.current = null;
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

  // RoomSelector / Minimap — blur teleport (no walk through walls).
  const navigateTo = (viewId) => runGoToRef.current?.(viewId, "blur");

  const retry = () => {
    setLoadError(null);
    setLoading(true);
    setLoadingPercent(0);
    floorLoadingRef.current = false;
    setFloorLoading(false);
    setFloorLoadingPercent(0);
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

  const nudgeLookYaw = (delta) => {
    if (loading || loadError || isAnimatingRef.current) return;
    const next = Math.round((lookYawDegreesRef.current + delta) * 10) / 10;
    lookYawDegreesRef.current = next;
    setLookYawDegrees(next);
    setCameraLookYawDegrees(cameraRef.current, next);
  };

  const setLookYawDegreesValue = (value) => {
    if (loading || loadError || isAnimatingRef.current) return;
    const next = setCameraLookYawDegrees(cameraRef.current, value);
    lookYawDegreesRef.current = next;
    setLookYawDegrees(next);
  };

  const toggleAlignMode = async () => {
    if (!USE_MODEL || loading || loadError || isAnimatingRef.current) return;

    if (!alignModeRef.current) {
      if (hidePanoramsRef.current) {
        await togglePanoramas();
        if (hidePanoramsRef.current) return;
      }
      if (lookModeRef.current) {
        lookModeRef.current = false;
        setLookMode(false);
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

  const toggleLookMode = () => {
    if (loading || loadError || isAnimatingRef.current) return;

    if (!lookModeRef.current) {
      if (alignModeRef.current) {
        alignModeRef.current = false;
        setAlignMode(false);
        applyOpacityToMeshes(1);
      }
      lookModeRef.current = true;
      setLookMode(true);
      syncLookYawFromCameraOrView(CONFIG.views[indexRef.current]);
      return;
    }

    lookModeRef.current = false;
    setLookMode(false);
  };

  const toggleHotspotEditMode = () => {
    if (!USE_MODEL || loading || loadError || isAnimatingRef.current) return;
    const next = !hotspotEditModeRef.current;
    hotspotEditModeRef.current = next;
    setHotspotEditMode(next);
    if (!next) setHotspotEditSelection(null);
    hotspotsRef.current?.setEditMode(next);
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

      items.forEach((item) => {
        if (item.holeFill) {
          item.mesh.setEnabled(false);
          return;
        }
        item.mesh.material = item.originalMaterial;
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
      await ensureFloorLoaded(view, { showLoader: true });
      if (!aliveRef.current || scene.isDisposed) return;

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
        if (item.holeFill) {
          item.mesh.position.copyFrom(projectorPos);
          item.mesh.setEnabled(true);
        }
      }

      applyViewCageVisibility(items, view);

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
    travelViewId,
    loading,
    loadingPercent,
    floorLoading,
    floorLoadingPercent,
    loadError,
    panoramasVisible,
    alignMode,
    lookMode,
    hotspotEditMode,
    hotspotEditSelection,
    yawDegrees,
    lookYawDegrees,
    navigateTo,
    retry,
    setOverlaysVisible,
    togglePanoramas,
    toggleAlignMode,
    toggleLookMode,
    toggleHotspotEditMode,
    nudgeYaw,
    setYawDegreesValue,
    nudgeLookYaw,
    setLookYawDegreesValue,
  };
}

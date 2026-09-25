import {
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";
import { CONFIG, worldPos } from "./config";
import { createProjectionMaterial } from "./useCubemapsAndMaterials";

const SKYBOX_SIZE = 2000;
const FLOOR_MARGIN = 400;
const FLOOR_Y = 0;

/**
 * Inward-facing cubemap box centered on the projector.
 * Used as the whole scene when USE_MODEL=false, and as a hole-fill
 * behind the GLB cage (gaps / wrong-wound glass → panorama instead of clearColor).
 */
export function createProjectionSkybox(
  scene,
  cubemap,
  projectorPos,
  {
    name = "projectionSkybox",
    yawDeg = 0,
    panoOpacity = 1,
  } = {}
) {
  const skybox = MeshBuilder.CreateBox(
    name,
    { size: SKYBOX_SIZE, sideOrientation: Mesh.BACKSIDE },
    scene
  );
  skybox.position.copyFrom(projectorPos);
  skybox.isPickable = false;
  skybox.renderingGroupId = 0;

  const material = createProjectionMaterial(
    scene,
    cubemap,
    cubemap,
    projectorPos,
    projectorPos,
    { yawDeg, yaw2Deg: yawDeg, panoOpacity }
  );
  skybox.material = material;

  return {
    mesh: skybox,
    material,
    originalMaterial: null,
    holeFill: true,
  };
}

/**
 * Skybox + invisible pick floor when USE_MODEL is false.
 * Reuses the same projection material path as the GLB tour.
 */
export function createNoModelScene(scene, cubemap, projectorPos) {
  const item = createProjectionSkybox(scene, cubemap, projectorPos, {
    name: "noModelSkybox",
  });

  const floor = createPickFloor(scene);
  floor.isPickable = true;
  floor.isVisible = false;
  // Keep in group 0 but invisible — only for raycasts / cursor / click-nav
  floor.renderingGroupId = 0;

  return {
    projectMeshes: [item],
    pickMeshes: [floor],
    skybox: item.mesh,
    floor,
  };
}

/** Keep skybox centered on the active viewpoint (camera does not translate while looking). */
export function syncNoModelSkybox(skybox, material, position) {
  if (!skybox || !material) return;
  skybox.position.copyFrom(position);
  material.setVector3("projectorPosition", position);
  material.setVector3("projectorPosition2", position);
}

function createPickFloor(scene) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  CONFIG.views.forEach((view) => {
    const p = worldPos(view.position);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  });

  const width = Math.max(100, maxX - minX + FLOOR_MARGIN * 2);
  const depth = Math.max(100, maxZ - minZ + FLOOR_MARGIN * 2);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  const floor = MeshBuilder.CreateGround(
    "noModelPickFloor",
    { width, height: depth },
    scene
  );
  floor.position = new Vector3(cx, FLOOR_Y, cz);

  const mat = new StandardMaterial("noModelPickFloorMat", scene);
  mat.disableLighting = true;
  mat.diffuseColor = Color3.Black();
  mat.alpha = 0;
  mat.backFaceCulling = false;
  floor.material = mat;

  return floor;
}

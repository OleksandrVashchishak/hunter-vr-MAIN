import {
  StandardMaterial,
  Color3,
  PointerEventTypes,
  MeshBuilder,
  Quaternion,
  Axis,
  Vector3,
} from "@babylonjs/core";

export function createProjectedCursor(scene, { isOverHotspot } = {}) {
  let cursor = null;
  let targetPos = null;
  let targetRot = null;

  const POS_LERP = 0.25;
  const ROT_LERP = 0.25;
  const OFFSET = 0.5;

  const mat = new StandardMaterial("cursorMat", scene);
  mat.diffuseColor = Color3.White();
  mat.alpha = 0.5;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.zOffset = -20;
  mat.useLogarithmicDepth = true;

  const hideCursor = () => {
    cursor?.setEnabled(false);
    targetPos = null;
    targetRot = null;
  };

  const pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERMOVE) return;

    const overHotspot =
      isOverHotspot?.() ||
      scene.pick(
        scene.pointerX,
        scene.pointerY,
        (mesh) => !!mesh.metadata?.hotspotViewId
      )?.hit;

    if (overHotspot) {
      hideCursor();
      return;
    }

    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) => mesh.isPickable === true && !mesh.metadata?.hotspotViewId
    );

    if (!pick || !pick.hit || !pick.pickedPoint) {
      hideCursor();
      return;
    }

    const normal = pick.getNormal(true);
    if (!normal) return;

    if (!cursor) {
      cursor = MeshBuilder.CreateDisc("cursorDisc", { radius: 15, tessellation: 32 }, scene);
      cursor.material = mat;
      cursor.isPickable = false;
      cursor.rotationQuaternion = Quaternion.Identity();
    }

    cursor.setEnabled(true);

    const adaptiveOffset = OFFSET * getAdaptiveFactor(normal);
    targetPos = pick.pickedPoint.add(normal.scale(adaptiveOffset));

    let up = Axis.Y;
    if (Math.abs(Vector3.Dot(normal, up)) > 0.95) up = Axis.Z;

    targetRot = Quaternion.FromLookDirectionLH(normal, up);
  });

  const beforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
    if (isOverHotspot?.()) {
      hideCursor();
      return;
    }
    if (!cursor || !targetPos || !targetRot) return;

    cursor.position = Vector3.Lerp(cursor.position, targetPos, POS_LERP);
    cursor.rotationQuaternion = Quaternion.Slerp(
      cursor.rotationQuaternion,
      targetRot,
      ROT_LERP
    );
  });

  return {
    dispose() {
      scene.onPointerObservable.remove(pointerObserver);
      scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      cursor?.dispose();
      mat.dispose();
    }
  };
}

function getAdaptiveFactor(normal) {
  const dotY = Math.abs(Vector3.Dot(normal, Axis.Y));
  return 1 + (1 - dotY) * 2;
}

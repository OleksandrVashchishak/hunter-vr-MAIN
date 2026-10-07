import { UniversalCamera, Vector3 } from '@babylonjs/core';
import { worldPos } from './config';
import { applyCameraLook } from './cameraLook';

export function initCamera(scene, canvas, view) {
  const pos = worldPos(view.position);

  const camera = new UniversalCamera(
    'cam',
    new Vector3(pos.x, pos.y, pos.z),
    scene
  );

  // Look/zoom — кастомні контроли. attachControl лише щоб камера була «активна».
  camera.attachControl(canvas, false);
  camera.inputs.clear();
  camera.inertia = 0;

  camera.minZ = 1;
  camera.maxZ = 10000;
  camera.speed = 50;
  camera.fov = 1.4;

  applyCameraLook(camera, view);

  return camera;
}

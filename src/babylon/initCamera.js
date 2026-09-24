import { UniversalCamera, Vector3 } from '@babylonjs/core';
import { worldPos } from './config';

export function initCamera(scene, canvas, view) {
  const pos = worldPos(view.position);
  const look = worldPos(view.look);

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

  camera.setTarget(new Vector3(look.x, look.y, look.z));

  return camera;
}

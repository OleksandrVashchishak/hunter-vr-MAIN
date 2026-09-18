import { UniversalCamera, Vector3 } from '@babylonjs/core';

export function initCamera(scene, canvas, view) {
  const camera = new UniversalCamera(
    'cam',
    new Vector3(view.position.x, view.position.y, view.position.z),
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

  const lookAt = new Vector3(view.look.x, view.look.y, view.look.z);
  camera.setTarget(lookAt);

  return camera;
}

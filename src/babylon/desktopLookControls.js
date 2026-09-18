const PITCH_LIMIT = Math.PI / 2 - 0.05;

function clampPitch(x) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, x));
}

/**
 * Desktop look з нормальною інерцією: velocity + exponential decay.
 * (Babylon camera.inertia на FreeCamera часто відчувається криво.)
 */
export function attachDesktopLookControls(canvas, camera, scene) {
  const SENS = 0.0022; // rad / px
  const DECAY_PER_SEC = 7.5; // чим більше — швидше зупиняється
  const STOP_EPS = 1e-4;
  const MAX_VEL = 0.12;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velYaw = 0;
  let velPitch = 0;
  let lastTs = performance.now();

  const onPointerDown = (evt) => {
    if (evt.pointerType === "touch" || evt.button !== 0) return;
    dragging = true;
    lastX = evt.clientX;
    lastY = evt.clientY;
    velYaw = 0;
    velPitch = 0;
    try {
      canvas.setPointerCapture(evt.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (evt) => {
    if (!dragging || evt.pointerType === "touch") return;

    const dx = evt.clientX - lastX;
    const dy = evt.clientY - lastY;
    lastX = evt.clientX;
    lastY = evt.clientY;

    const yaw = -dx * SENS;
    const pitch = -dy * SENS;

    camera.rotation.y += yaw;
    camera.rotation.x = clampPitch(camera.rotation.x + pitch);

    // velocity від поточного руху (з легким згладженням)
    velYaw = velYaw * 0.35 + yaw * 0.65;
    velPitch = velPitch * 0.35 + pitch * 0.65;
    velYaw = Math.max(-MAX_VEL, Math.min(MAX_VEL, velYaw));
    velPitch = Math.max(-MAX_VEL, Math.min(MAX_VEL, velPitch));
  };

  const onPointerUp = (evt) => {
    if (evt.pointerType === "touch") return;
    dragging = false;
    try {
      canvas.releasePointerCapture(evt.pointerId);
    } catch {
      /* ignore */
    }
  };

  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    if (dragging) return;
    if (Math.abs(velYaw) < STOP_EPS && Math.abs(velPitch) < STOP_EPS) {
      velYaw = 0;
      velPitch = 0;
      return;
    }

    camera.rotation.y += velYaw;
    camera.rotation.x = clampPitch(camera.rotation.x + velPitch);

    const decay = Math.exp(-DECAY_PER_SEC * dt);
    velYaw *= decay;
    velPitch *= decay;
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("pointerup", onPointerUp);

  return () => {
    scene.onBeforeRenderObservable.remove(observer);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("pointerup", onPointerUp);
  };
}

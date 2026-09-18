const FOV_MIN = 0.7;
const FOV_MAX = 1.8;
const WHEEL_STEP = 0.08;

function clampFov(value) {
  return Math.min(FOV_MAX, Math.max(FOV_MIN, value));
}

/**
 * FOV zoom: mouse wheel + pinch.
 * Returns dispose().
 */
export function attachZoomControls(canvas, camera, lastTouchRef) {
  const onWheel = (evt) => {
    evt.preventDefault();
    const dir = Math.sign(evt.deltaY);
    if (!dir) return;
    camera.fov = clampFov(camera.fov + dir * WHEEL_STEP);
  };

  let pinchStartDist = 0;
  let pinchStartFov = camera.fov;

  const touchDistance = (touches) => {
    const a = touches[0];
    const b = touches[1];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (evt) => {
    if (evt.touches.length === 2) {
      if (lastTouchRef) lastTouchRef.current = null;
      pinchStartDist = touchDistance(evt.touches);
      pinchStartFov = camera.fov;
    }
  };

  const onTouchMove = (evt) => {
    if (evt.touches.length !== 2 || pinchStartDist <= 0) return;
    evt.preventDefault();
    const dist = touchDistance(evt.touches);
    const scale = pinchStartDist / dist;
    camera.fov = clampFov(pinchStartFov * scale);
  };

  const onTouchEnd = (evt) => {
    if (evt.touches.length < 2) {
      pinchStartDist = 0;
    }
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return () => {
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas.removeEventListener("touchcancel", onTouchEnd);
  };
}

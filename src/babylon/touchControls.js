const PITCH_LIMIT = Math.PI / 2;

/**
 * Touch look (drag). Returns dispose().
 */
export function attachTouchControls(canvas, camera, lastTouchRef) {
  const sens = 500;

  const onPointerDown = (evt) => {
    if (evt.pointerType === "touch") {
      lastTouchRef.current = { x: evt.clientX, y: evt.clientY };
    }
  };

  const onPointerMove = (evt) => {
    if (!lastTouchRef.current || evt.pointerType !== "touch") return;

    const dx = evt.clientX - lastTouchRef.current.x;
    const dy = evt.clientY - lastTouchRef.current.y;

    camera.rotation.y -= dx / sens;
    camera.rotation.x -= dy / sens;

    camera.rotation.x = Math.max(
      Math.min(camera.rotation.x, PITCH_LIMIT),
      -PITCH_LIMIT
    );

    lastTouchRef.current = { x: evt.clientX, y: evt.clientY };
  };

  const onPointerUp = (evt) => {
    if (evt.pointerType === "touch") {
      lastTouchRef.current = null;
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
  };
}

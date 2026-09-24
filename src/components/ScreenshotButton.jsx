import React, { useState } from "react";
import { Tools } from "@babylonjs/core";
import styles from "./GlassIconButton.module.scss";
import cameraIcon from "../assets/icons/camera.svg";

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const ScreenshotButton = ({
  engineRef,
  cameraRef,
  setOverlaysVisible,
  disabled,
}) => {
  const [busy, setBusy] = useState(false);

  const onClick = () => {
    const engine = engineRef?.current;
    const camera = cameraRef?.current;
    if (!engine || !camera || busy || disabled) return;

    setBusy(true);
    setOverlaysVisible?.(false);

    try {
      Tools.CreateScreenshotUsingRenderTarget(
        engine,
        camera,
        { precision: 1 },
        (data) => {
          setOverlaysVisible?.(true);
          downloadDataUrl(data, `tour-photo-${Date.now()}.png`);
          setBusy(false);
        }
      );
    } catch (err) {
      console.error("[ScreenshotButton]", err);
      setOverlaysVisible?.(true);
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.root}
      onClick={onClick}
      disabled={disabled || busy}
      aria-label="Take photo"
      title="Take photo"
    >
      <img className={`${styles.icon} ${styles.iconCamera}`} src={cameraIcon} alt="" />
    </button>
  );
};

export default ScreenshotButton;

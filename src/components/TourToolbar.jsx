import React from "react";
import styles from "./TourToolbar.module.scss";
import ScreenshotButton from "./ScreenshotButton";
import PanoramaToggle from "./PanoramaToggle";
import AlignToggle from "./AlignToggle";
import { DEV_MODE, USE_MODEL } from "../babylon/config";

const TourToolbar = ({
  engineRef,
  cameraRef,
  setOverlaysVisible,
  panoramasVisible,
  onTogglePanoramas,
  alignMode,
  onToggleAlign,
  disabled,
}) => (
  <div className={styles.root}>
    {DEV_MODE && USE_MODEL && (
      <>
        <AlignToggle
          active={alignMode}
          onToggle={onToggleAlign}
          disabled={disabled}
        />
        <PanoramaToggle
          panoramasVisible={panoramasVisible}
          onToggle={onTogglePanoramas}
          disabled={disabled}
        />
      </>
    )}
    <ScreenshotButton
      engineRef={engineRef}
      cameraRef={cameraRef}
      setOverlaysVisible={setOverlaysVisible}
      disabled={disabled}
    />
  </div>
);

export default TourToolbar;

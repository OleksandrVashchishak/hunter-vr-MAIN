import React, { useEffect } from "react";
import { useBabylonTour } from "./babylon/useBabylonTour";
import { postTourProgress, postTourReady } from "./babylon/parentBridge";
import RoomSelector from "./components/RoomSelector";
import Minimap from "./components/Minimap";
import ScreenshotButton from "./components/ScreenshotButton";
import Tutor from "./components/Tutor";
import LoadError from "./components/LoadError";

const BabylonViewer = () => {
  const {
    canvasRef,
    engineRef,
    cameraRef,
    currentIndex,
    loading,
    loadingPercent,
    loadError,
    navigateTo,
    retry,
    setOverlaysVisible,
  } = useBabylonTour();

  // Spinner listens for progress / ready via postMessage
  useEffect(() => {
    if (loading) {
      postTourProgress(loadingPercent);
      return;
    }
    postTourReady();
  }, [loading, loadingPercent]);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <canvas ref={canvasRef} id="canvas" />
      {loadError ? (
        <LoadError message={loadError} onRetry={retry} />
      ) : (
        <Tutor loading={loading} loadingPercent={loadingPercent} />
      )}
      <RoomSelector currentIndex={currentIndex} onSelectRoom={navigateTo} />
      <ScreenshotButton
        engineRef={engineRef}
        cameraRef={cameraRef}
        setOverlaysVisible={setOverlaysVisible}
        disabled={loading || !!loadError}
      />
      <Minimap
        currentIndex={currentIndex}
        onSelectRoom={navigateTo}
        cameraRef={cameraRef}
      />
    </div>
  );
};

export default BabylonViewer;

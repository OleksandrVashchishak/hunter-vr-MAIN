import React from "react";
import { useBabylonTour } from "./babylon/useBabylonTour";
import RoomSelector from "./components/RoomSelector";
import Minimap from "./components/Minimap";
import Tutor from "./components/Tutor";
import LoadError from "./components/LoadError";

const BabylonViewer = () => {
  const {
    canvasRef,
    cameraRef,
    currentIndex,
    loading,
    loadingPercent,
    loadError,
    navigateTo,
    retry,
  } = useBabylonTour();

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <canvas ref={canvasRef} id="canvas" />
      {loadError ? (
        <LoadError message={loadError} onRetry={retry} />
      ) : (
        <Tutor loading={loading} loadingPercent={loadingPercent} />
      )}
      <RoomSelector currentIndex={currentIndex} onSelectRoom={navigateTo} />
      <Minimap
        currentIndex={currentIndex}
        onSelectRoom={navigateTo}
        cameraRef={cameraRef}
      />
    </div>
  );
};

export default BabylonViewer;

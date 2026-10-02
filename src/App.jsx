import React, { useEffect } from "react";
import { useBabylonTour } from "./babylon/useBabylonTour";
import { CONFIG } from "./babylon/config";
import { postTourProgress, postTourReady } from "./babylon/parentBridge";
import RoomSelector from "./components/RoomSelector";
import Minimap from "./components/Minimap";
import TourToolbar from "./components/TourToolbar";
import AlignControls from "./components/AlignControls";
import HotspotEditControls from "./components/HotspotEditControls";
import Tutor from "./components/Tutor";
import FloorLoader from "./components/FloorLoader";
import LoadError from "./components/LoadError";

const BabylonViewer = () => {
  const {
    canvasRef,
    engineRef,
    cameraRef,
    currentIndex,
    travelViewId,
    loading,
    loadingPercent,
    floorLoading,
    floorLoadingPercent,
    loadError,
    panoramasVisible,
    alignMode,
    hotspotEditMode,
    hotspotEditSelection,
    yawDegrees,
    navigateTo,
    retry,
    setOverlaysVisible,
    togglePanoramas,
    toggleAlignMode,
    toggleHotspotEditMode,
    nudgeYaw,
    setYawDegreesValue,
  } = useBabylonTour();

  // Spinner listens for progress / ready via postMessage
  useEffect(() => {
    if (loading) {
      postTourProgress(loadingPercent);
      return;
    }
    postTourReady();
  }, [loading, loadingPercent]);

  const viewId = CONFIG.views[currentIndex]?.id;
  const uiDisabled = loading || floorLoading || !!loadError;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <canvas ref={canvasRef} id="canvas" />
      {loadError ? (
        <LoadError message={loadError} onRetry={retry} />
      ) : (
        <Tutor loading={loading} loadingPercent={loadingPercent} />
      )}
      <FloorLoader active={floorLoading && !loading} percent={floorLoadingPercent} />
      <RoomSelector currentIndex={currentIndex} onSelectRoom={navigateTo} />
      <TourToolbar
        engineRef={engineRef}
        cameraRef={cameraRef}
        setOverlaysVisible={setOverlaysVisible}
        panoramasVisible={panoramasVisible}
        onTogglePanoramas={togglePanoramas}
        alignMode={alignMode}
        onToggleAlign={toggleAlignMode}
        hotspotEditMode={hotspotEditMode}
        onToggleHotspotEdit={toggleHotspotEditMode}
        disabled={uiDisabled}
      />
      <AlignControls
        active={alignMode}
        yawDegrees={yawDegrees}
        viewId={viewId}
        onNudge={nudgeYaw}
        onYawChange={setYawDegreesValue}
        disabled={uiDisabled}
      />
      <HotspotEditControls
        active={hotspotEditMode}
        selection={hotspotEditSelection}
        disabled={uiDisabled}
      />
      <Minimap
        currentIndex={currentIndex}
        travelViewId={travelViewId}
        onSelectRoom={navigateTo}
        cameraRef={cameraRef}
      />
    </div>
  );
};

export default BabylonViewer;

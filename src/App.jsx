import React, { useEffect } from "react";
import { useBabylonTour } from "./babylon/useBabylonTour";
import { postTourProgress, postTourReady } from "./babylon/parentBridge";
import { logLoad, probeUiStyles, watchStylesheets } from "./babylon/loadDebug";
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

  useEffect(() => {
    logLoad("App mount");
    const stopWatch = watchStylesheets();
    return () => {
      stopWatch();
      logLoad("App unmount");
    };
  }, []);

  // Spinner listens for progress / ready via postMessage
  useEffect(() => {
    if (loading) {
      if (loadingPercent === 0 || loadingPercent === 25 || loadingPercent >= 99) {
        logLoad(`App postTourProgress(${loadingPercent})`);
      }
      postTourProgress(loadingPercent);
      return;
    }
    logLoad("App postTourReady()");
    postTourReady();
    // Parent may mutate DOM/CSS after ready — probe a bit later too.
    setTimeout(() => probeUiStyles("after postTourReady +300ms"), 300);
  }, [loading, loadingPercent]);

  useEffect(() => {
    if (!loading) return undefined;
    const id = setInterval(() => probeUiStyles(`loading tick ${loadingPercent}%`), 2000);
    return () => clearInterval(id);
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
      <Minimap
        currentIndex={currentIndex}
        onSelectRoom={navigateTo}
        cameraRef={cameraRef}
      />
    </div>
  );
};

export default BabylonViewer;

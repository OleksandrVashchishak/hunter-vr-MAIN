import React, { useEffect, useRef, useState } from "react";
import { CONFIG } from "../babylon/config";
import {
  FLOORS,
  findFloorForViewId,
  getActiveHotspot,
  getMinimapRooms,
} from "../config/floorsConfig";
import styles from "./Minimap.module.scss";
import iconClose from "../assets/icons/tutor-close.svg";

import planFloorI from "../assets/minimap/floor-i.png";
import planFloorII from "../assets/minimap/floor-ii.png";
import planFloorIII from "../assets/minimap/floor-iii.png";

import svgFloorI from "../assets/minimap/floor-i.svg?raw";
import svgFloorII from "../assets/minimap/floor-ii.svg?raw";
import svgFloorIII from "../assets/minimap/floor-iii.svg?raw";

const FLOOR_ASSETS = {
  "floor-i": {
    plan: planFloorI,
    svg: svgFloorI,
    planClass: styles.planFloorI,
    markersClass: styles.markersFloorI,
  },
  "floor-ii": {
    plan: planFloorII,
    svg: svgFloorII,
    planClass: styles.planFloorII,
    markersClass: styles.markersFloorII,
  },
  "floor-iii": {
    plan: planFloorIII,
    svg: svgFloorIII,
    planClass: styles.planFloorIII,
    markersClass: styles.markersFloorIII,
  },
};

const MOBILE_MQ = "(max-width: 800px)";

const Minimap = ({ currentIndex, onSelectRoom, cameraRef }) => {
  // Desktop: map stays open as before. Mobile: closed until WP "Open Plan".
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia(MOBILE_MQ).matches;
  });
  const [floorId, setFloorId] = useState("floor-ii");
  const [trackedViewId, setTrackedViewId] = useState(null);
  const markersRef = useRef(null);
  const radarRef = useRef(null);

  const currentViewId = CONFIG.views[currentIndex]?.id;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => {
      if (!mq.matches) setOpen(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Mobile WP toolbar "Open Plan" → open minimap (desktop UI untouched).
  useEffect(() => {
    const onMessage = (event) => {
      const type = event.data?.type;
      if (type === "OPEN_FLOORPLAN" || type === "OPEN_FLOOR_MAP") {
        setOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Sync tab when panorama room changes (React "adjust state during render")
  if (currentViewId !== trackedViewId) {
    setTrackedViewId(currentViewId);
    const match = findFloorForViewId(currentViewId);
    if (match) setFloorId(match.id);
  }

  const floor = FLOORS.find((item) => item.id === floorId) || FLOORS[1];
  const assets = FLOOR_ASSETS[floor.id];
  const active = getActiveHotspot(floor, currentViewId);

  useEffect(() => {
    const root = markersRef.current;
    if (!root) return;

    const onClick = (event) => {
      const hotspot = event.target.closest(".hotspot");
      if (!hotspot) return;

      const index = Number(hotspot.getAttribute("data-index"));
      const room = getMinimapRooms(floor)[index];
      if (room?.viewId) onSelectRoom?.(room.viewId);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [floor, onSelectRoom, open]);

  // Rotate radar with camera yaw (no React re-renders)
  useEffect(() => {
    if (!open) return undefined;

    let rafId = 0;

    const tick = () => {
      const el = radarRef.current;
      const camera = cameraRef?.current;
      if (el && camera?.rotation) {
        const deg = (-camera.rotation.y * 180) / Math.PI;
        el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraRef, active, open]);

  if (!open) return null;

  return (
    <div className={styles.root}>
      <div className={`${styles.panel} ${styles.glass}`}>
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Close map"
        >
          <img src={iconClose} alt="" />
        </button>

        <div className={styles.tabs}>
          {FLOORS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.tab} ${item.id === floorId ? styles.tabActive : ""}`}
              onClick={() => setFloorId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <img
          className={`${styles.plan} ${assets.planClass}`}
          src={assets.plan}
          alt=""
          draggable={false}
        />

        <div className={`${styles.markers} ${assets.markersClass}`}>
          {active && (
            <div
              ref={radarRef}
              className={styles.radar}
              style={{
                left: `${(active.x / floor.viewBox.w) * 100}%`,
                top: `${(active.y / floor.viewBox.h) * 100}%`,
              }}
              aria-hidden
            >
              <svg className={styles.radarSvg} viewBox="0 0 100 100">
                <defs>
                  <radialGradient id="minimapRadarFade" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                    <stop offset="55%" stopColor="rgba(255,255,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>
                {/* ~56° sector pointing up (0deg) */}
                <path
                  d="M50 50 L32 10 A48 48 0 0 1 68 10 Z"
                  fill="url(#minimapRadarFade)"
                />
              </svg>
            </div>
          )}

          <div
            ref={markersRef}
            className={styles.markersSvg}
            dangerouslySetInnerHTML={{ __html: assets.svg }}
          />
        </div>
      </div>
    </div>
  );
};

export default Minimap;

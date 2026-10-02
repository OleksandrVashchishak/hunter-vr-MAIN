import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const MOBILE_MQ = "(max-width: 900px)";
/** Match VR walk (~80 frames @ 60fps) so the pin rides with the hop. */
const RADAR_TRAVEL_MS = 1300;

const Minimap = ({ currentIndex, travelViewId, onSelectRoom, cameraRef }) => {
  // Desktop: map open by default. Mobile: closed until WP "Open Plan".
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia(MOBILE_MQ).matches;
  });
  const [floorId, setFloorId] = useState("floor-ii");
  const [trackedViewId, setTrackedViewId] = useState(null);
  const radarRef = useRef(null);
  const radarFloorRef = useRef(null);
  const radarPosRef = useRef(null);
  const svgHostRef = useRef(null);
  const onSelectRoomRef = useRef(onSelectRoom);
  onSelectRoomRef.current = onSelectRoom;

  const currentView = CONFIG.views[currentIndex];
  const travelView = travelViewId
    ? CONFIG.views.find((view) => view.id === travelViewId)
    : null;
  // Prefer in-flight destination so the pin starts moving with the VR hop.
  const displayView = travelView || currentView;
  const displayViewId = displayView?.id;
  const displayRoomName = displayView?.room;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => {
      if (!mq.matches) setOpen(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Mobile WP toolbar "Open Plan" → open minimap.
  useEffect(() => {
    const onMessage = (event) => {
      const type = event.data?.type;
      if (
        type === "OPEN_FLOORPLAN" ||
        type === "OPEN_FLOOR_MAP" ||
        type === "TOGGLE_FLOORPLAN"
      ) {
        if (type === "TOGGLE_FLOORPLAN") {
          setOpen((prev) => !prev);
          return;
        }
        setOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Sync tab when panorama room changes (React "adjust state during render")
  if (displayViewId !== trackedViewId) {
    setTrackedViewId(displayViewId);
    const match = findFloorForViewId(displayViewId, displayRoomName);
    if (match) setFloorId(match.id);
  }

  const floor = FLOORS.find((item) => item.id === floorId) || FLOORS[1];
  const assets = FLOOR_ASSETS[floor.id];
  const active = getActiveHotspot(floor, displayViewId, displayRoomName);

  // Slide radar between hotspots on the same floor; snap on floor change / first paint.
  useLayoutEffect(() => {
    if (!open) {
      radarPosRef.current = null;
      radarFloorRef.current = null;
      return;
    }

    const el = radarRef.current;
    if (!el || !active) {
      radarPosRef.current = null;
      radarFloorRef.current = null;
      return;
    }

    const nextLeft = (active.x / floor.viewBox.w) * 100;
    const nextTop = (active.y / floor.viewBox.h) * 100;
    const prev = radarPosRef.current;
    const sameFloor = radarFloorRef.current === floor.id;

    // Same target (e.g. travelViewId cleared after settle) — don't touch styles
    // or we kill an in-flight CSS transition by setting transition: none.
    if (
      prev &&
      sameFloor &&
      Math.abs(prev.x - nextLeft) <= 0.01 &&
      Math.abs(prev.y - nextTop) <= 0.01
    ) {
      return;
    }

    const shouldAnimate = Boolean(sameFloor && prev);

    if (shouldAnimate) {
      el.style.transition = `left ${RADAR_TRAVEL_MS}ms cubic-bezier(0.65, 0, 0.35, 1), top ${RADAR_TRAVEL_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`;
    } else {
      el.style.transition = "none";
    }

    el.style.left = `${nextLeft}%`;
    el.style.top = `${nextTop}%`;
    radarPosRef.current = { x: nextLeft, y: nextTop };
    radarFloorRef.current = floor.id;
  }, [
    open,
    active?.x,
    active?.y,
    floor.id,
    floor.viewBox.h,
    floor.viewBox.w,
  ]);

  // Rotate radar with camera yaw (no React re-renders)
  useEffect(() => {
    if (!open) return undefined;

    let rafId = 0;

    const tick = () => {
      const el = radarRef.current;
      const camera = cameraRef?.current;
      if (el && camera?.rotation) {
        // +180: map north vs Babylon yaw; flipped sign = horizontal mirror
        const deg = (camera.rotation.y * 180) / Math.PI + 180;
        el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraRef, active, open]);

  // Wire hover + click on SVG marker rings (concentric with dots — no HTML overlay).
  useEffect(() => {
    if (!open) return undefined;

    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return undefined;

    const floorRooms = getMinimapRooms(floor);
    const circles = [...svg.querySelectorAll("circle")];
    const cleanups = [];

    for (let i = 0; i < circles.length; i += 2) {
      const ring = circles[i];
      const dot = circles[i + 1];
      const room = floorRooms[i / 2];
      if (!ring || !room?.viewId) continue;

      // White fill sits above the ring in DOM — let events pass through to the ring.
      if (dot) dot.style.pointerEvents = "none";

      ring.classList.add(styles.hotspotRing);
      ring.setAttribute("role", "button");
      ring.setAttribute("tabindex", "0");
      ring.setAttribute("aria-label", room.shortLabel || room.label || "Room");

      const go = () => onSelectRoomRef.current?.(room.viewId);
      const onKey = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          go();
        }
      };

      ring.addEventListener("click", go);
      ring.addEventListener("keydown", onKey);
      cleanups.push(() => {
        ring.removeEventListener("click", go);
        ring.removeEventListener("keydown", onKey);
        ring.classList.remove(styles.hotspotRing);
        ring.removeAttribute("role");
        ring.removeAttribute("tabindex");
        ring.removeAttribute("aria-label");
        if (dot) dot.style.pointerEvents = "";
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [open, floor, assets.svg]);

  return (
    <div className={styles.root}>
      {open && (
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
              ref={svgHostRef}
              className={styles.markersSvg}
              dangerouslySetInnerHTML={{ __html: assets.svg }}
            />
          </div>
        </div>
      )}

      {/* Desktop only (hidden on mobile via CSS) — stays visible while map is open */}
      <button
        type="button"
        className={`${styles.openBtn} ${styles.glass}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        Open Floorplan
      </button>
    </div>
  );
};

export default Minimap;

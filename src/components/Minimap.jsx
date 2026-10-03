import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CONFIG } from "../babylon/config";
import { easeInOutCubic } from "../babylon/easing";
import {
  FLOORS,
  findFloorForViewId,
  getActiveHotspot,
  getMinimapRooms,
} from "../config/floorsConfig";
import { getMinimapPins } from "../config/minimapProjection";
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
  const pingRef = useRef(null);
  const radarFloorRef = useRef(null);
  /** Last painted % position — kept across brief active=null frames. */
  const visualPosRef = useRef(null);
  /** In-flight lerp: { fromX, fromY, toX, toY, start, duration }. */
  const animRef = useRef(null);
  const svgHostRef = useRef(null);

  const setPingVisible = (on) => {
    const ping = pingRef.current;
    if (!ping) return;
    ping.classList.toggle(styles.radarPingOn, on);
  };
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
  const rooms = getMinimapRooms(floor);
  const pins = getMinimapPins(floor, FLOORS);
  const minorPins = pins.filter((pin) => !pin.major);
  const active = getActiveHotspot(floor, displayViewId, displayRoomName);

  // Queue radar travel (RAF loop below paints it — CSS left/top transitions were getting killed).
  useLayoutEffect(() => {
    if (!open || !active) return;

    const nextLeft = (active.x / floor.viewBox.w) * 100;
    const nextTop = (active.y / floor.viewBox.h) * 100;
    const visual = visualPosRef.current;
    const sameFloor = radarFloorRef.current === floor.id;

    if (!visual || !sameFloor) {
      visualPosRef.current = { x: nextLeft, y: nextTop };
      animRef.current = null;
      setPingVisible(false);
      radarFloorRef.current = floor.id;
      const el = radarRef.current;
      if (el) {
        el.style.left = `${nextLeft}%`;
        el.style.top = `${nextTop}%`;
      }
      return;
    }

    if (
      Math.abs(visual.x - nextLeft) <= 0.01 &&
      Math.abs(visual.y - nextTop) <= 0.01
    ) {
      return;
    }

    // Interrupt in-flight lerp from the current painted spot.
    animRef.current = {
      fromX: visual.x,
      fromY: visual.y,
      toX: nextLeft,
      toY: nextTop,
      start: performance.now(),
      duration: RADAR_TRAVEL_MS,
    };
    setPingVisible(true);
    radarFloorRef.current = floor.id;
  }, [
    open,
    active?.x,
    active?.y,
    floor.id,
    floor.viewBox.h,
    floor.viewBox.w,
  ]);

  // One RAF: lerp pin + rotate with camera yaw (no React re-renders).
  useEffect(() => {
    if (!open) return undefined;

    let rafId = 0;

    const tick = (now) => {
      const el = radarRef.current;
      const camera = cameraRef?.current;
      if (el) {
        const anim = animRef.current;
        if (anim) {
          const t = Math.min(1, (now - anim.start) / anim.duration);
          const e = easeInOutCubic(t);
          const x = anim.fromX + (anim.toX - anim.fromX) * e;
          const y = anim.fromY + (anim.toY - anim.fromY) * e;
          visualPosRef.current = { x, y };
          el.style.left = `${x}%`;
          el.style.top = `${y}%`;
          if (t >= 1) {
            animRef.current = null;
            setPingVisible(false);
          }
        } else if (visualPosRef.current) {
          el.style.left = `${visualPosRef.current.x}%`;
          el.style.top = `${visualPosRef.current.y}%`;
        }

        if (camera?.rotation) {
          // +180: map north vs Babylon yaw; flipped sign = horizontal mirror
          const deg = (camera.rotation.y * 180) / Math.PI + 180;
          el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraRef, open]);

  // Stretch SVG to the markers box (same % space as HTML hit targets) + hover on rings.
  useEffect(() => {
    if (!open) return undefined;

    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return undefined;

    svg.setAttribute("preserveAspectRatio", "none");

    const rings = [];
    const circles = [...svg.querySelectorAll("circle")];
    for (let i = 0; i < circles.length; i += 2) {
      const ring = circles[i];
      if (!ring) continue;
      ring.classList.add(styles.hotspotRing);
      rings.push(ring);
    }

    return () => {
      rings.forEach((ring) => ring.classList.remove(styles.hotspotRing));
    };
  }, [open, floor, assets.svg]);

  const setRingHover = (index, on) => {
    const host = svgHostRef.current;
    const circles = host?.querySelectorAll("circle");
    const ring = circles?.[index * 2];
    if (!ring) return;
    ring.classList.toggle(styles.hotspotRingActive, on);
  };

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
                {/* White dot while traveling — fades in at hop start, out on arrive */}
                <span ref={pingRef} className={styles.radarPing} />
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
              aria-hidden
            />

            {/* Minor pins — projected from config XYZ; no labels */}
            {minorPins.map((pin) => (
              <button
                key={pin.viewId}
                type="button"
                className={`${styles.hotspot} ${styles.hotspotMinor}${
                  active?.viewId === pin.viewId ? ` ${styles.hotspotMinorActive}` : ""
                }`}
                style={{
                  left: `${(pin.x / floor.viewBox.w) * 100}%`,
                  top: `${(pin.y / floor.viewBox.h) * 100}%`,
                }}
                aria-label={pin.room || pin.viewId}
                onClick={() => onSelectRoomRef.current?.(pin.viewId)}
              />
            ))}

            {/* Major pins — designer SVG markers + invisible hit targets */}
            {rooms.map((room, index) => {
              const point = floor.hotspots[index];
              if (!point || !room.viewId) return null;
              const [x, y] = point;
              return (
                <button
                  key={room.id}
                  type="button"
                  className={styles.hotspot}
                  style={{
                    left: `${(x / floor.viewBox.w) * 100}%`,
                    top: `${(y / floor.viewBox.h) * 100}%`,
                  }}
                  aria-label={room.label}
                  onClick={() => onSelectRoomRef.current?.(room.viewId)}
                  onMouseEnter={() => setRingHover(index, true)}
                  onMouseLeave={() => setRingHover(index, false)}
                  onFocus={() => setRingHover(index, true)}
                  onBlur={() => setRingHover(index, false)}
                />
              );
            })}
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

import React, { useEffect, useState } from "react";
import { CONFIG } from "../babylon/config";
import { postToParent } from "../babylon/parentBridge";
import {
  FLOORS,
  findFloorForViewId,
  getDefaultRoomViewId,
  getListRooms,
} from "../config/floorsConfig";
import iconMenu from "../assets/icons/menu-icon.svg";
import styles from "./RoomSelector.module.scss";

const MOBILE_MQ = "(max-width: 800px)";

const BackIcon = () => (
  <svg viewBox="0 0 9 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M8 1L1.5 8.5L8 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RoomSelector = ({ currentIndex, onSelectRoom }) => {
  const [openPanel, setOpenPanel] = useState(null); // "floor" | "room" | "combined" | null
  const [menuLevel, setMenuLevel] = useState("floors"); // "floors" | "rooms"
  const [selectedFloorId, setSelectedFloorId] = useState(FLOORS[0]?.id ?? null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches,
  );

  const currentViewId = CONFIG.views[currentIndex]?.id;
  const activeFloor =
    FLOORS.find((floor) => floor.id === selectedFloorId) || FLOORS[0] || null;
  const listRooms = activeFloor ? getListRooms(activeFloor) : [];
  const activeRoomLabel = listRooms.find((room) => room.viewId === currentViewId)?.label;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!currentViewId) return;

    // Keep the chosen floor when the same viewId exists on several floors.
    setSelectedFloorId((prevId) => {
      const prevFloor = FLOORS.find((floor) => floor.id === prevId);
      if (prevFloor && getListRooms(prevFloor).some((room) => room.viewId === currentViewId)) {
        return prevId;
      }
      return findFloorForViewId(currentViewId)?.id ?? prevId;
    });
  }, [currentViewId]);

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const toggleCombined = () => {
    setOpenPanel((current) => {
      if (current === "combined") return null;
      setMenuLevel("floors");
      return "combined";
    });
  };

  const handleSelectFloor = (floor) => {
    setSelectedFloorId(floor.id);

    if (isMobile) {
      setMenuLevel("rooms");
      const entryViewId = getDefaultRoomViewId(floor);
      if (entryViewId) onSelectRoom(entryViewId);
      return;
    }

    setOpenPanel(null);
    const entryViewId = getDefaultRoomViewId(floor);
    if (entryViewId) onSelectRoom(entryViewId);
  };

  const handleSelectRoom = (viewId) => {
    if (!viewId) return;
    onSelectRoom(viewId);
    setOpenPanel(null);
  };

  const combinedPillLabel =
    openPanel === "combined" && menuLevel === "floors"
      ? "Floor"
      : activeRoomLabel || "Floor";

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.navBack} ${styles.glass}`}
        aria-label="Back"
        onClick={() => postToParent({ type: "VR_TOUR_CLOSE" })}
      >
        <BackIcon />
      </button>

      <button type="button" className={`${styles.pill} ${styles.glass} ${styles.home}`}>
        Home
      </button>

      <button
        type="button"
        className={`${styles.navMenu} ${styles.glass}`}
        aria-label="Menu"
        onClick={() => postToParent({ type: "OPEN_WP_MENU" })}
      >
        <img src={iconMenu} alt="" width={20} height={14} />
      </button>

      {/* Desktop: separate Floor + Room */}
      <div className={`${styles.selects} ${styles.selectsDesktop}`}>
        <div className={`${styles.selectCol} ${styles.floorCol}`}>
          <button
            type="button"
            className={`${styles.pill} ${styles.glass} ${styles.select}`}
            onClick={() => togglePanel("floor")}
            aria-expanded={openPanel === "floor"}
          >
            {activeFloor?.label || "Floor"}
          </button>

          {openPanel === "floor" && (
            <div className={`${styles.panel} ${styles.glass}`}>
              <ul className={styles.list}>
                {FLOORS.map((floor) => {
                  const isActive = floor.id === activeFloor?.id;

                  return (
                    <li key={floor.id}>
                      <button
                        type="button"
                        className={`${styles.item} ${styles.floorItem} ${
                          isActive ? styles.itemActive : ""
                        }`}
                        onClick={() => handleSelectFloor(floor)}
                      >
                        {floor.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className={`${styles.selectCol} ${styles.roomCol}`}>
          <button
            type="button"
            className={`${styles.pill} ${styles.glass} ${styles.select}`}
            onClick={() => togglePanel("room")}
            aria-expanded={openPanel === "room"}
            disabled={!activeFloor}
          >
            {activeRoomLabel || "Room"}
          </button>

          {openPanel === "room" && activeFloor && (
            <div className={`${styles.panel} ${styles.glass}`}>
              <ul className={styles.list}>
                {listRooms.map((room) => {
                  const isActive = room.label === activeRoomLabel;

                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                        disabled={!room.viewId}
                        onClick={() => handleSelectRoom(room.viewId)}
                      >
                        {room.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: combined Floor → Room */}
      <div className={`${styles.selects} ${styles.selectsMobile}`}>
        <div className={`${styles.selectCol} ${styles.combinedCol}`}>
          <button
            type="button"
            className={`${styles.pill} ${styles.glass} ${styles.select}`}
            onClick={toggleCombined}
            aria-expanded={openPanel === "combined"}
          >
            {combinedPillLabel}
          </button>

          {openPanel === "combined" && (
            <div className={`${styles.panel} ${styles.glass}`}>
              {menuLevel === "floors" ? (
                <ul className={styles.list}>
                  {FLOORS.map((floor) => {
                    const isActive = floor.id === activeFloor?.id;

                    return (
                      <li key={floor.id}>
                        <button
                          type="button"
                          className={`${styles.item} ${styles.floorItem} ${
                            isActive ? styles.itemActive : ""
                          }`}
                          onClick={() => handleSelectFloor(floor)}
                        >
                          {floor.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.panelBack}
                    onClick={() => setMenuLevel("floors")}
                  >
                    <BackIcon />
                    <span>{activeFloor?.label}</span>
                  </button>
                  <ul className={`${styles.list} ${styles.roomList}`}>
                    {listRooms.map((room) => {
                      const isActive = room.label === activeRoomLabel;

                      return (
                        <li key={room.id}>
                          <button
                            type="button"
                            className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                            disabled={!room.viewId}
                            onClick={() => handleSelectRoom(room.viewId)}
                          >
                            {room.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomSelector;

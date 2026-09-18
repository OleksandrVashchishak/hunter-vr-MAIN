import React, { useEffect, useState } from "react";
import { CONFIG } from "../babylon/config";
import {
  FLOORS,
  findFloorForViewId,
  getDefaultRoomViewId,
  getListRooms,
} from "../config/floorsConfig";
import styles from "./RoomSelector.module.scss";

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
  const [openPanel, setOpenPanel] = useState(null); // "floor" | "room" | null
  const [selectedFloorId, setSelectedFloorId] = useState(FLOORS[0]?.id ?? null);

  const currentViewId = CONFIG.views[currentIndex]?.id;
  const activeFloor =
    FLOORS.find((floor) => floor.id === selectedFloorId) || FLOORS[0] || null;
  const listRooms = activeFloor ? getListRooms(activeFloor) : [];
  const activeRoomLabel = listRooms.find((room) => room.viewId === currentViewId)?.label;

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

  const handleSelectFloor = (floor) => {
    setSelectedFloorId(floor.id);
    setOpenPanel(null);

    const entryViewId = getDefaultRoomViewId(floor);
    if (entryViewId) onSelectRoom(entryViewId);
  };

  const handleSelectRoom = (viewId) => {
    if (!viewId) return;
    onSelectRoom(viewId);
    setOpenPanel(null);
  };

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.navBack} ${styles.glass}`}
        aria-label="Back"
      >
        <BackIcon />
      </button>

      <button type="button" className={`${styles.pill} ${styles.glass} ${styles.home}`}>
        Home
      </button>

      <div className={styles.selects}>
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
    </div>
  );
};

export default RoomSelector;

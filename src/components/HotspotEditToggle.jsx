import React from "react";
import styles from "./GlassIconButton.module.scss";

/** Move / pin glyph for hotspot edit. */
const HotspotEditIcon = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.8" />
    <path
      d="M12 3.5v3.2M12 17.3v3.2M3.5 12h3.2M17.3 12h3.2"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M7.2 7.2l2.1 2.1M14.7 14.7l2.1 2.1M16.8 7.2l-2.1 2.1M9.3 14.7l-2.1 2.1"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const HotspotEditToggle = ({ active, onToggle, disabled }) => (
  <button
    type="button"
    className={`${styles.root}${active ? ` ${styles.active}` : ""}`}
    onClick={onToggle}
    disabled={disabled}
    aria-label={active ? "Exit hotspot edit" : "Edit hotspot positions"}
    aria-pressed={active}
    title={active ? "Exit hotspot edit" : "Move floor hotspots"}
  >
    <HotspotEditIcon />
  </button>
);

export default HotspotEditToggle;

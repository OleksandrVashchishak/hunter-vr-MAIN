import React from "react";
import styles from "./GlassIconButton.module.scss";

/** Crosshair / align glyph — inline so we don't need a new asset. */
const AlignIcon = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="12" cy="12" r="3.2" stroke="white" strokeWidth="1.8" />
    <path
      d="M12 2.5v4.2M12 17.3v4.2M2.5 12h4.2M17.3 12h4.2"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const AlignToggle = ({ active, onToggle, disabled }) => (
  <button
    type="button"
    className={`${styles.root}${active ? ` ${styles.active}` : ""}`}
    onClick={onToggle}
    disabled={disabled}
    aria-label={active ? "Exit panorama align" : "Align panorama to model"}
    aria-pressed={active}
    title={active ? "Exit align (opacity 100%)" : "Align pano (opacity 50%)"}
  >
    <AlignIcon />
  </button>
);

export default AlignToggle;

import React from "react";
import styles from "./GlassIconButton.module.scss";

/** Eye / look glyph — initial camera facing for menu entry. */
const LookIcon = () => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
      stroke="white"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.8" stroke="white" strokeWidth="1.8" />
  </svg>
);

const LookToggle = ({ active, onToggle, disabled }) => (
  <button
    type="button"
    className={`${styles.root}${active ? ` ${styles.active}` : ""}`}
    onClick={onToggle}
    disabled={disabled}
    aria-label={active ? "Exit look yaw edit" : "Set entry look yaw"}
    aria-pressed={active}
    title={active ? "Exit look edit" : "Entry look (menu / minimap)"}
  >
    <LookIcon />
  </button>
);

export default LookToggle;

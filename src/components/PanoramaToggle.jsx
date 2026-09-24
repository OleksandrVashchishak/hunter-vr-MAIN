import React from "react";
import styles from "./GlassIconButton.module.scss";
import cubeIcon from "../assets/icons/cube.svg";
import panoramaIcon from "../assets/icons/panorama.svg";

const PanoramaToggle = ({ panoramasVisible, onToggle, disabled }) => {
  const showModel = !panoramasVisible;

  return (
    <button
      type="button"
      className={`${styles.root}${showModel ? ` ${styles.active}` : ""}`}
      onClick={onToggle}
      disabled={disabled}
      aria-label={showModel ? "Show panoramas" : "Show 3D model"}
      aria-pressed={showModel}
      title={showModel ? "Show panoramas" : "Show 3D model"}
    >
      <img
        className={styles.icon}
        src={showModel ? panoramaIcon : cubeIcon}
        alt=""
      />
    </button>
  );
};

export default PanoramaToggle;

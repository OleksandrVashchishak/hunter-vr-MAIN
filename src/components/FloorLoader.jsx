import React from "react";
import styles from "./FloorLoader.module.scss";

/** Lightweight overlay while cubemaps warm (full floor / cold jump). */
const FloorLoader = ({ active, percent = 0 }) => {
  if (!active) return null;

  return (
    <div className={styles.root} aria-live="polite" aria-busy="true">
      <div className={`${styles.pill} ${styles.glass}`}>
        <span className={styles.spinner} aria-hidden />
        <span className={styles.text}>Loading… {percent}%</span>
      </div>
    </div>
  );
};

export default FloorLoader;

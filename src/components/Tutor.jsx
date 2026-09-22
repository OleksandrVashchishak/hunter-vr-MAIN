import React, { useState } from "react";
import styles from "./Tutor.module.scss";
import iconPoint from "../assets/icons/tutor-point.svg";
import iconRotate from "../assets/icons/tutor-rotate.svg";
import iconZoom from "../assets/icons/tutor-zoom.svg";
import iconTap from "../assets/icons/tutor-tap.svg";
import iconSwipe from "../assets/icons/tutor-swipe.svg";
import iconClose from "../assets/icons/tutor-close.svg";

const Tutor = ({ loading, loadingPercent }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={styles.overlay}
        onClick={() => !loading && setIsOpen(false)}
      />

      <div className={`${styles.card} ${styles.glass}`}>
        <div className={`${styles.items} ${styles.itemsDesktop}`}>
          <div className={styles.item}>
            <img className={styles.icon} src={iconPoint} alt="" />
            <span className={styles.text}>{"Point\nand move"}</span>
          </div>

          <div className={styles.item}>
            <img
              className={`${styles.icon} ${styles.iconRotate}`}
              src={iconRotate}
              alt=""
            />
            <span className={styles.text}>{"Rotate\nviewpoint"}</span>
          </div>

          <div className={styles.item}>
            <img className={styles.icon} src={iconZoom} alt="" />
            <span className={styles.text}>{"Change\nzoom"}</span>
          </div>
        </div>

        <div className={`${styles.items} ${styles.itemsMobile}`}>
          <div className={`${styles.item} ${styles.itemMobile}`}>
            <img
              className={`${styles.icon} ${styles.iconTap}`}
              src={iconTap}
              alt=""
            />
            <span className={styles.text}>Tap to walk</span>
          </div>

          <div className={`${styles.item} ${styles.itemMobile}`}>
            <img
              className={`${styles.icon} ${styles.iconSwipe}`}
              src={iconSwipe}
              alt=""
            />
            <span className={styles.text}>Swipe to look around</span>
          </div>
        </div>

        {!loading && (
          <button
            type="button"
            className={styles.close}
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <img src={iconClose} alt="" />
          </button>
        )}
      </div>

      {loading && (
        <div className={styles.loader}>{loadingPercent}%</div>
      )}
    </>
  );
};

export default Tutor;

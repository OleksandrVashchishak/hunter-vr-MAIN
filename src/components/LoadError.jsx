import React from "react";
import styles from "./LoadError.module.scss";

const LoadError = ({ message, onRetry }) => (
  <>
    <div className={styles.overlay} />
    <div className={`${styles.card} ${styles.glass}`} role="alert">
      <p className={styles.title}>Tour failed to load</p>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Retry
      </button>
    </div>
  </>
);

export default LoadError;

import React, { useEffect, useState } from "react";
import styles from "./AlignControls.module.scss";

function formatYaw(value) {
  const n = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Look-mode panel: nudge camera facing, copy lookYaw snippet for config.js.
 * Click arrows ±1°, Shift+click ±5°. Keyboard ←/→ while panel is open.
 */
const LookControls = ({
  active,
  lookYawDegrees,
  viewId,
  onNudge,
  onLookYawChange,
  disabled,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!active || disabled) return undefined;

    const onKeyDown = (e) => {
      if (e.target?.closest?.("input, textarea, select")) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onNudge(-step);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNudge(step);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, disabled, onNudge]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  if (!active) return null;

  const snippet = `lookYaw: ${formatYaw(lookYawDegrees)},`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  const nudge = (dir, e) => {
    const step = e.shiftKey ? 5 : 1;
    onNudge(dir * step);
  };

  return (
    <div className={styles.panel} role="region" aria-label="Entry look yaw">
      <div className={styles.meta}>
        <span className={styles.label}>Look</span>
        {viewId ? <span className={styles.viewId}>{viewId}</span> : null}
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.arrow}
          onClick={(e) => nudge(-1, e)}
          disabled={disabled}
          title="−1° (Shift −5°)"
          aria-label="Rotate look left"
        >
          ←
        </button>
        <label className={styles.yawField}>
          <span className={styles.srOnly}>Look yaw degrees</span>
          <input
            type="number"
            step="0.1"
            value={formatYaw(lookYawDegrees)}
            onChange={(e) => onLookYawChange(e.target.value)}
            disabled={disabled}
          />
          <span className={styles.unit}>°</span>
        </label>
        <button
          type="button"
          className={styles.arrow}
          onClick={(e) => nudge(1, e)}
          disabled={disabled}
          title="+1° (Shift +5°)"
          aria-label="Rotate look right"
        >
          →
        </button>
        <button
          type="button"
          className={styles.copy}
          onClick={copy}
          disabled={disabled}
          title="Copy for config.js"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className={styles.snippet}>{snippet}</code>
    </div>
  );
};

export default LookControls;

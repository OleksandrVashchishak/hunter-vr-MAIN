import React, { useEffect, useState } from "react";
import styles from "./AlignControls.module.scss";

function formatCoord(n) {
  const v = Math.round(Number(n) * 1000) / 1000;
  return Number.isInteger(v) ? String(v) : String(v);
}

/**
 * Hotspot-edit panel: shows selected marker coords, copy snippet for config.js.
 */
const HotspotEditControls = ({ active, selection, disabled }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  if (!active) return null;

  const hotspot = selection?.hotspot;
  const viewId = selection?.viewId;
  const snippet = hotspot
    ? `hotspot: { x: ${formatCoord(hotspot.x)}, y: ${formatCoord(hotspot.y)}, z: ${formatCoord(hotspot.z)} },`
    : null;

  const copy = async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={styles.panel} role="region" aria-label="Hotspot edit">
      <div className={styles.meta}>
        <span className={styles.label}>Hotspot</span>
        {viewId ? (
          <span className={styles.viewId}>{viewId}</span>
        ) : (
          <span className={styles.viewId}>drag a point</span>
        )}
      </div>
      {snippet ? (
        <div className={styles.row}>
          <button
            type="button"
            className={styles.copy}
            onClick={copy}
            disabled={disabled}
            title="Copy for config.js"
            style={{ marginLeft: 0 }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      {snippet ? (
        <code className={styles.snippet}>{snippet}</code>
      ) : (
        <code className={styles.snippet}>Click &amp; drag a floor point</code>
      )}
    </div>
  );
};

export default HotspotEditControls;

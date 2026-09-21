/** Temporary load/style diagnostics — remove after bug hunt. */

const TAG = "[tourDebug]";
const t0 = performance.now();

function elapsed() {
  return `${(performance.now() - t0).toFixed(0)}ms`;
}

function findStylesheetRule(className) {
  if (!className) return null;
  const needle = `.${className}`;
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin
    }
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.selectorText?.includes(needle)) {
        return { href: sheet.href || "(inline)", selector: rule.selectorText };
      }
    }
  }
  return null;
}

/** Snapshot whether RoomSelector / Minimap CSS modules are actually applied. */
export function probeUiStyles(reason) {
  const roots = [...document.querySelectorAll("#root > div > div")].filter((el) =>
    [...el.classList].some((c) => c.startsWith("_root_")),
  );

  // Prefer explicit: any element with a _root_* module class
  const moduleRoots = [...document.querySelectorAll("[class*='_root_']")].filter(
    (el) => el.className.includes("_root_") && el.closest("#root"),
  );

  const targets = moduleRoots.length ? moduleRoots : roots;
  const report = targets.slice(0, 4).map((el) => {
    const rootClass = [...el.classList].find((c) => c.startsWith("_root_")) || null;
    const cs = getComputedStyle(el);
    const rule = findStylesheetRule(rootClass);
    return {
      class: rootClass,
      inStylesheet: !!rule,
      sheet: rule?.href ?? null,
      position: cs.position,
      zIndex: cs.zIndex,
      display: cs.display,
      opacity: cs.opacity,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  });

  const linkCss = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => ({
    href: l.href,
    disabled: l.disabled,
    sheet: !!l.sheet,
  }));

  console.log(`${TAG} UI styles @ ${reason} (+${elapsed()})`, {
    moduleRoots: report,
    styleLinks: linkCss,
    styleTagCount: document.querySelectorAll("style").length,
  });

  const broken = report.filter((r) => r.class && !r.inStylesheet);
  if (broken.length) {
    console.warn(`${TAG} ⚠ CSS MODULE MISSING for:`, broken.map((r) => r.class));
  }

  return report;
}

export function logLoad(stage, detail) {
  if (detail !== undefined) {
    console.log(`${TAG} ${stage} (+${elapsed()})`, detail);
  } else {
    console.log(`${TAG} ${stage} (+${elapsed()})`);
  }
  // Probe styles on every stage so we can see the exact drop moment.
  try {
    probeUiStyles(stage);
  } catch (err) {
    console.warn(`${TAG} probe failed`, err);
  }
}

/** Watch stylesheet links / style tags disappearing or changing. */
export function watchStylesheets() {
  if (typeof document === "undefined") return () => {};

  const dump = (why) => {
    console.log(`${TAG} stylesheet mutation: ${why} (+${elapsed()})`, {
      links: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
      styleTags: document.querySelectorAll("style").length,
    });
    probeUiStyles(`mutation:${why}`);
  };

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.removedNodes) {
        if (n.nodeName === "LINK" || n.nodeName === "STYLE") {
          dump(`REMOVED <${n.nodeName.toLowerCase()}> ${n.href || ""}`);
        }
      }
      for (const n of m.addedNodes) {
        if (n.nodeName === "LINK" || n.nodeName === "STYLE") {
          dump(`ADDED <${n.nodeName.toLowerCase()}> ${n.href || ""}`);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("message", (event) => {
    const type = event.data?.type ?? event.data?.fv?.name;
    if (type) {
      console.log(`${TAG} postMessage in:`, type, event.data);
      probeUiStyles(`postMessage:${type}`);
    }
  });

  console.log(`${TAG} stylesheet watcher ON (+${elapsed()})`);
  return () => mo.disconnect();
}

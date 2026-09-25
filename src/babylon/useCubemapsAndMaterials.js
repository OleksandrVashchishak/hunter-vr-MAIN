import { Color3, CubeTexture, RawTexture, Texture, ShaderMaterial } from "@babylonjs/core";

let whiteTexture = null;
let projectionMaterialSeq = 0;

function getWhiteTexture(scene) {
  if (whiteTexture && !whiteTexture.isDisposed?.()) return whiteTexture;
  whiteTexture = RawTexture.CreateRGBATexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE
  );
  whiteTexture.name = "projectionBaseWhite";
  return whiteTexture;
}

/** Degrees → radians for the projection shader. */
export function yawToRad(degrees) {
  return ((Number(degrees) || 0) * Math.PI) / 180;
}

export function viewYawDegrees(view) {
  return Number(view?.yaw) || 0;
}

function bindBaseFromOriginal(shaderMaterial, originalMaterial, scene) {
  const tex =
    originalMaterial?.albedoTexture ||
    originalMaterial?.diffuseTexture ||
    null;
  const factor = new Color3(1, 1, 1);
  const src = originalMaterial?.albedoColor || originalMaterial?.diffuseColor;
  if (src) factor.copyFrom(src);

  shaderMaterial.setTexture("baseColor", tex || getWhiteTexture(scene));
  shaderMaterial.setColor3("baseColorFactor", factor);
}

/**
 * Soft cap on resident cubemaps in VRAM.
 * Sized for a full floor (~24–26 keys on Floor I) so pin(floor) does not fight LRU.
 */
export const CUBEMAP_CACHE_MAX = 32;

/**
 * On-demand cubemap loader with LRU eviction.
 * Pin keys that are bound to materials (current floor / transition targets)
 * so they are never disposed mid-frame.
 *
 * @param {{ maxSize?: number, loadTexture?: (scene: unknown, name: string) => Promise<import('@babylonjs/core').CubeTexture> }} [options]
 */
export function createCubemapCache({ maxSize = CUBEMAP_CACHE_MAX, loadTexture } = {}) {
  const entries = new Map();
  const pendingLoads = Object.create(null);
  let pinned = new Set();
  let disposed = false;
  let warmGeneration = 0;

  function touch(key) {
    const entry = entries.get(key);
    if (entry) entry.lastUsed = performance.now();
  }

  /** Mark as oldest so a cancelled warm's late completion loses to real residents. */
  function demote(key) {
    const entry = entries.get(key);
    if (entry) entry.lastUsed = 0;
  }

  function pin(keys) {
    pinned = new Set((keys || []).filter(Boolean));
  }

  function disposeEntry(key) {
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    try {
      entry.texture.dispose();
    } catch {
      /* ignore */
    }
  }

  function evictIfNeeded() {
    while (entries.size > maxSize) {
      let victimKey = null;
      let victimTime = Infinity;
      for (const [key, entry] of entries) {
        if (pinned.has(key)) continue;
        if (entry.lastUsed < victimTime) {
          victimTime = entry.lastUsed;
          victimKey = key;
        }
      }
      if (!victimKey) break;
      disposeEntry(victimKey);
    }
  }

  /** Dispose everything except keepKeys and currently pinned keys. */
  function retainOnly(keepKeys) {
    const keep = new Set((keepKeys || []).filter(Boolean));
    for (const key of [...entries.keys()]) {
      if (keep.has(key) || pinned.has(key)) continue;
      disposeEntry(key);
    }
  }

  function peek(name) {
    return entries.get(name)?.texture ?? null;
  }

  function size() {
    return entries.size;
  }

  function keys() {
    return [...entries.keys()];
  }

  function store(name, cubemap) {
    entries.set(name, { texture: cubemap, lastUsed: performance.now() });
    evictIfNeeded();
  }

  function loadWithBabylon(scene, name) {
    const imgPath = "panorams";
    const root = import.meta.env.BASE_URL;

    return new Promise((resolve, reject) => {
      const cubemap = new CubeTexture(
        `${root}${imgPath}/${name}`,
        scene,
        ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"],
        false,
        null,
        () => {
          if (disposed) {
            try {
              cubemap.dispose();
            } catch {
              /* ignore */
            }
            reject(new Error("Cubemap cache is disposed"));
            return;
          }

          cubemap.generateMipMaps = true;
          cubemap.gammaSpace = true;
          cubemap.anisotropicFilteringLevel = 16;
          cubemap.updateSamplingMode(Texture.ANISOTROPIC_SAMPLINGMODE);

          store(name, cubemap);
          resolve(cubemap);
        },
        (message, exception) => {
          try {
            cubemap.dispose();
          } catch {
            /* ignore */
          }
          reject(
            new Error(message || `Failed to load cubemap "${name}"`, {
              cause: exception,
            })
          );
        }
      );
    });
  }

  function get(scene, name) {
    if (disposed) {
      return Promise.reject(new Error("Cubemap cache is disposed"));
    }

    if (entries.has(name)) {
      touch(name);
      return Promise.resolve(entries.get(name).texture);
    }

    if (pendingLoads[name]) {
      return pendingLoads[name];
    }

    const loader = loadTexture
      ? Promise.resolve(loadTexture(scene, name)).then((cubemap) => {
          if (disposed) {
            try {
              cubemap.dispose?.();
            } catch {
              /* ignore */
            }
            throw new Error("Cubemap cache is disposed");
          }
          store(name, cubemap);
          return cubemap;
        })
      : loadWithBabylon(scene, name);

    const promise = loader.finally(() => {
      delete pendingLoads[name];
    });

    pendingLoads[name] = promise;
    return promise;
  }

  /**
   * Background-load keys (e.g. full floor). Does not pin.
   * A newer warm() call cancels an in-flight warm loop.
   * Late completions from a cancelled warm are demoted so they lose LRU races.
   * @param {(progress: { done: number, total: number }) => void} [onProgress]
   */
  async function warm(scene, keysToWarm, checkAlive, onProgress) {
    if (disposed || !scene || scene.isDisposed) return;
    const list = (keysToWarm || []).filter(Boolean);
    const total = list.length;
    const gen = ++warmGeneration;
    let done = 0;

    const report = () => {
      onProgress?.({ done, total });
    };

    for (const key of list) {
      if (gen !== warmGeneration) return;
      if (checkAlive && !checkAlive()) return;
      if (entries.has(key)) {
        touch(key);
        done += 1;
        report();
        continue;
      }
      try {
        await get(scene, key);
        if (gen !== warmGeneration) {
          demote(key);
          evictIfNeeded();
          return;
        }
        done += 1;
        report();
      } catch (error) {
        if (disposed || gen !== warmGeneration) return;
        if (checkAlive && !checkAlive()) return;
        console.error("[warmCubemap]", key, error);
        done += 1;
        report();
      }
    }
  }

  function disposeAll() {
    disposed = true;
    warmGeneration += 1;
    for (const key of Object.keys(pendingLoads)) {
      delete pendingLoads[key];
    }
    for (const entry of entries.values()) {
      try {
        entry.texture.dispose();
      } catch {
        /* ignore */
      }
    }
    entries.clear();
    pinned = new Set();
  }

  return { get, peek, pin, touch, warm, retainOnly, evictIfNeeded, disposeAll, size, keys };
}

export function createProjectionMaterial(
  scene,
  cubemap,
  cubemap2,
  projectorPos,
  projectorPos2,
  {
    originalMaterial = null,
    yawDeg = 0,
    yaw2Deg = 0,
    panoOpacity = 1,
  } = {}
) {
  const shaderMaterial = new ShaderMaterial(
    `projectionShader_${++projectionMaterialSeq}`,
    scene,
    {
      vertex: "projection",
      fragment: "projection",
    },
    {
      attributes: ["position", "normal", "uv"],
      uniforms: [
        "world",
        "worldViewProjection",
        "projectorPosition",
        "projectorPosition2",
        "mixFactor",
        "yaw",
        "yaw2",
        "panoOpacity",
        "baseColorFactor",
      ],
      samplers: ["cubemap", "cubemap2", "baseColor"],
    }
  );

  shaderMaterial.setTexture("cubemap", cubemap);
  shaderMaterial.setTexture("cubemap2", cubemap2);
  shaderMaterial.setVector3("projectorPosition", projectorPos);
  shaderMaterial.setVector3("projectorPosition2", projectorPos2);
  shaderMaterial.setFloat("mixFactor", 0.0);
  shaderMaterial.setFloat("yaw", yawToRad(yawDeg));
  shaderMaterial.setFloat("yaw2", yawToRad(yaw2Deg));
  shaderMaterial.setFloat("panoOpacity", panoOpacity);
  bindBaseFromOriginal(shaderMaterial, originalMaterial, scene);
  // Cage glass/walls often ship as thin double-sided shells. Rendering both
  // faces causes z-fight (black panes / outdoor texture punching through).
  // Interior normals face the room — cull backs.
  shaderMaterial.backFaceCulling = true;

  return shaderMaterial;
}

export function updateMaterialProjection(material, projectorPos, projectorPos2, mixFactor) {
  material.setVector3("projectorPosition", projectorPos);
  material.setVector3("projectorPosition2", projectorPos2);
  material.setFloat("mixFactor", mixFactor);
}

export function setMaterialYaw(material, yawDeg, yaw2Deg = yawDeg) {
  material.setFloat("yaw", yawToRad(yawDeg));
  material.setFloat("yaw2", yawToRad(yaw2Deg));
}

export function setMaterialPanoOpacity(material, opacity) {
  material.setFloat("panoOpacity", opacity);
}

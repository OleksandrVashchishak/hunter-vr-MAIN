import { Engine } from "@babylonjs/core";

/**
 * Babylon's "WebGL not supported" often means getContext failed with its
 * default attributes — not that WebGL is off (Matterport can still work).
 * Try preferred opts, then softer fallbacks.
 */
const ENGINE_ATTEMPTS = [
  {
    antialias: true,
    options: undefined,
  },
  {
    antialias: false,
    options: {
      antialias: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "default",
      xrCompatible: false,
    },
  },
  {
    antialias: false,
    options: {
      antialias: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "default",
      xrCompatible: false,
      disableWebGL2Support: true,
    },
  },
];

export function createTourEngine(canvas) {
  let lastError = null;

  for (const attempt of ENGINE_ATTEMPTS) {
    try {
      return new Engine(canvas, attempt.antialias, attempt.options);
    } catch (error) {
      lastError = error;
      console.warn("[createTourEngine] attempt failed", attempt.options ?? "default", error);
    }
  }

  throw lastError ?? new Error("WebGL not supported");
}

export function isWebGLInitError(error) {
  return /webgl/i.test(error?.message || "") || /webgl/i.test(String(error));
}

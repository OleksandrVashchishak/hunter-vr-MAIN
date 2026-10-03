/**
 * Same breakpoint as Minimap / RoomSelector UI — not UA sniffing.
 * Narrow viewport = phone/tablet portrait → lighter assets + GPU profile.
 */
export const MOBILE_MQ = "(max-width: 900px)";

export function isMobileViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

/** Cubemap path, cache size, filtering, and render scale for the current device. */
export function getTourGpuProfile() {
  const mobile = isMobileViewport();
  return {
    mobile,
    /** Folder under BASE_URL; mobile falls back to panorams if a face 404s. */
    cubemapPath: mobile ? "mobile" : "panorams",
    /** Soft LRU cap; active floor stays pinned so this mostly matters across floors. */
    cubemapCacheMax: mobile ? 16 : 32,
    anisotropicFilteringLevel: mobile ? 2 : 16,
    /** Mip chains ~+33% VRAM; skip on phones (textures already smaller). */
    generateMipMaps: !mobile,
    /** Babylon: higher = fewer pixels. Desktop stays sharp; phones ease GPU. */
    hardwareScalingLevel: mobile ? 1.25 : 0.75,
  };
}

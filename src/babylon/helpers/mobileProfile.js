/**
 * Same breakpoint as Minimap / RoomSelector UI — not UA sniffing.
 * Narrow viewport = phone/tablet portrait → lighter assets + GPU profile.
 */
export const MOBILE_MQ = "(max-width: 900px)";

export function isMobileViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

/**
 * Cubemap path, cache size, filtering, and render scale for the current device.
 * Mobile skips projected cursor (see useBabylonTour).
 */
export function getTourGpuProfile() {
  const mobile = isMobileViewport();
  return {
    mobile,
    /** Folder under BASE_URL; mobile falls back to panorams if a face 404s. */
    cubemapPath: mobile ? "mobile" : "panorams",
    /**
     * Soft LRU cap. Desktop pins a whole floor (~20–30).
     * Mobile warms only current + neighbors, so 16 is a real ceiling.
     */
    cubemapCacheMax: mobile ? 16 : 32,
    anisotropicFilteringLevel: mobile ? 8 : 16,
    /** Mip chains ~+33% VRAM. */
    generateMipMaps: true,
    /** Babylon: higher = fewer pixels. Desktop stays sharp; phones ease GPU. */
    hardwareScalingLevel: mobile ? 1 : 0.75,
  };
}

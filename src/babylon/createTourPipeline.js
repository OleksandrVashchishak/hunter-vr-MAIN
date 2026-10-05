import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";

/**
 * Soften jagged diagonals on the projected cage without HDR / tone-map color shifts.
 */
export function createTourPipeline(scene, camera) {
  const pipeline = new DefaultRenderingPipeline(
    "tourDefault",
    false,
    scene,
    [camera]
  );

  pipeline.fxaaEnabled = true;
  pipeline.imageProcessingEnabled = false;
  pipeline.bloomEnabled = false;
  pipeline.sharpenEnabled = false;
  pipeline.chromaticAberrationEnabled = false;
  pipeline.grainEnabled = false;
  pipeline.depthOfFieldEnabled = false;

  return pipeline;
}

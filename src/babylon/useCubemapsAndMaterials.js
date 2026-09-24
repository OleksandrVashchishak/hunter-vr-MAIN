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

export function createCubemapLoader(preloadedCubemapsRef) {
  const pendingLoads = Object.create(null);

  return function loadCubemapAsync(scene, name) {
    if (preloadedCubemapsRef.current[name]) {
      return Promise.resolve(preloadedCubemapsRef.current[name]);
    }

    if (pendingLoads[name]) {
      return pendingLoads[name];
    }

    // Mobile-optimized set not shipped for this tour yet — use desktop cubemaps.
    const imgPath = "panorams";
    const root = import.meta.env.BASE_URL;

    const promise = new Promise((resolve, reject) => {
      const cubemap = new CubeTexture(
        `${root}${imgPath}/${name}`,
        scene,
        ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"],
        false,
        null,
        () => {
          cubemap.generateMipMaps = true;
          cubemap.gammaSpace = true;
          cubemap.anisotropicFilteringLevel = 16;
          cubemap.updateSamplingMode(Texture.ANISOTROPIC_SAMPLINGMODE);

          preloadedCubemapsRef.current[name] = cubemap;
          delete pendingLoads[name];
          resolve(cubemap);
        },
        (message, exception) => {
          delete pendingLoads[name];
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

    pendingLoads[name] = promise;
    return promise;
  };
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
  shaderMaterial.backFaceCulling = false;

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

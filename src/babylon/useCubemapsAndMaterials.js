import { CubeTexture, Texture, ShaderMaterial } from "@babylonjs/core";

export function createCubemapLoader(preloadedCubemapsRef) {
  const pendingLoads = Object.create(null);

  return function loadCubemapAsync(scene, name) {
    if (preloadedCubemapsRef.current[name]) {
      return Promise.resolve(preloadedCubemapsRef.current[name]);
    }

    if (pendingLoads[name]) {
      return pendingLoads[name];
    }

    const isMobile = window.matchMedia("(max-width: 780px)").matches;
    const imgPath = isMobile ? "mobile" : "panorams";
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

let projectionMaterialSeq = 0;

export function createProjectionMaterial(scene, cubemap, cubemap2, projectorPos, projectorPos2) {
  const shaderMaterial = new ShaderMaterial(
    `projectionShader_${++projectionMaterialSeq}`,
    scene,
    {
      vertex: "projection",
      fragment: "projection",
    },
    {
      attributes: ["position"],
      uniforms: [
        "world",
        "worldViewProjection",
        "projectorPosition",
        "projectorPosition2",
        "mixFactor",
      ],
      samplers: ["cubemap", "cubemap2"],
    }
  );

  shaderMaterial.setTexture("cubemap", cubemap);
  shaderMaterial.setTexture("cubemap2", cubemap2);
  shaderMaterial.setVector3("projectorPosition", projectorPos);
  shaderMaterial.setVector3("projectorPosition2", projectorPos2);
  shaderMaterial.setFloat("mixFactor", 0.0);
  shaderMaterial.backFaceCulling = false;

  return shaderMaterial;
}

export function updateMaterialProjection(material, projectorPos, projectorPos2, mixFactor) {
  material.setVector3("projectorPosition", projectorPos);
  material.setVector3("projectorPosition2", projectorPos2);
  material.setFloat("mixFactor", mixFactor);
}

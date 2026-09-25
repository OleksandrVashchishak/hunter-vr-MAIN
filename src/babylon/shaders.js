import { Effect } from "@babylonjs/core";

export const registerShaders = () => {
  Effect.ShadersStore["projectionVertexShader"] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform mat4 world;

varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
    vec4 worldPos = world * vec4(position, 1.0);
    vPositionW = worldPos.xyz;
    vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

  Effect.ShadersStore["projectionFragmentShader"] = `
precision highp float;
#extension GL_EXT_shader_texture_lod : enable

varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

uniform samplerCube cubemap;
uniform samplerCube cubemap2;
uniform sampler2D baseColor;
uniform vec3 baseColorFactor;
uniform vec3 projectorPosition;
uniform vec3 projectorPosition2;
uniform float mixFactor;
uniform float yaw;
uniform float yaw2;
uniform float panoOpacity;

vec3 rotateY(vec3 dir, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * dir.x + s * dir.z, dir.y, -s * dir.x + c * dir.z);
}

void main(void) {
    // mixFactor is a uniform — coherent branch; skip the unused cubemap fetch on idle.
    // During blend, sample a coarser mip — dual full-res cube fetches across the whole
    // cage was the main hitch between already-cached rooms.
    vec3 pano;
    if (mixFactor <= 0.001) {
        vec3 dir1 = rotateY(normalize(vPositionW - projectorPosition), yaw);
        pano = textureCubeLodEXT(cubemap, dir1, 0.0).rgb;
    } else if (mixFactor >= 0.999) {
        vec3 dir2 = rotateY(normalize(vPositionW - projectorPosition2), yaw2);
        pano = textureCubeLodEXT(cubemap2, dir2, 0.0).rgb;
    } else {
        vec3 dir1 = rotateY(normalize(vPositionW - projectorPosition), yaw);
        vec3 dir2 = rotateY(normalize(vPositionW - projectorPosition2), yaw2);
        vec4 c1 = textureCubeLodEXT(cubemap, dir1, 1.5);
        vec4 c2 = textureCubeLodEXT(cubemap2, dir2, 1.5);
        pano = mix(c1.rgb, c2.rgb, mixFactor);
    }

    vec3 albedo = texture2D(baseColor, vUV).rgb * baseColorFactor;
    vec3 N = normalize(vNormalW);
    float lit = 0.35 + 0.65 * max(dot(N, normalize(vec3(0.25, 1.0, 0.35))), 0.0);
    vec3 base = albedo * lit;

    float a = clamp(panoOpacity, 0.0, 1.0);
    gl_FragColor = vec4(mix(base, pano, a), 1.0);
}
`;
};

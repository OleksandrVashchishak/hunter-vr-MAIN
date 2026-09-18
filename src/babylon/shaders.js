import { Effect } from '@babylonjs/core';



export const registerShaders = () => {

  Effect.ShadersStore["projectionVertexShader"] = `

precision highp float;



attribute vec3 position;



uniform mat4 worldViewProjection;

uniform mat4 world;



varying vec3 vPositionW;



void main(void) {

    vec4 worldPos = world * vec4(position, 1.0);

    vPositionW = worldPos.xyz;

    gl_Position = worldViewProjection * vec4(position, 1.0);

}

  `;



  Effect.ShadersStore["projectionFragmentShader"] = `

precision highp float;

#extension GL_EXT_shader_texture_lod : enable



varying vec3 vPositionW;



uniform samplerCube cubemap;

uniform samplerCube cubemap2;

uniform vec3 projectorPosition;

uniform vec3 projectorPosition2;

uniform float mixFactor;



void main(void) {

    vec3 dir1 = normalize(vPositionW - projectorPosition);

    vec3 dir2 = normalize(vPositionW - projectorPosition2);



    vec4 c1 = textureCubeLodEXT(cubemap, dir1, 0.0);

    vec4 c2 = textureCubeLodEXT(cubemap2, dir2, 0.0);



    gl_FragColor = mix(c1, c2, mixFactor);

}

  `;

};


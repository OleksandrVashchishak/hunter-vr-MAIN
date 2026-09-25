/**
 * Static checks for projection shader + cubemap load opts (no GPU).
 * Run: node scripts/test-projection-perf.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

const shader = readFileSync(join(root, "src/babylon/shaders.js"), "utf8");
const materials = readFileSync(
  join(root, "src/babylon/useCubemapsAndMaterials.js"),
  "utf8"
);

// Idle path: only cubemap (not cubemap2)
const idleMatch = shader.match(
  /if\s*\(\s*mixFactor\s*<=\s*0\.001\s*\)\s*\{([\s\S]*?)\}\s*else if/
);
assert(!!idleMatch, "idle if-block present");
assert(
  idleMatch && /textureCubeLodEXT\(\s*cubemap\s*,/.test(idleMatch[1]),
  "idle branch samples cubemap"
);
assert(
  idleMatch && !/textureCubeLodEXT\(\s*cubemap2\s*,/.test(idleMatch[1]),
  "idle branch does not sample cubemap2"
);

// Near-1 path: only cubemap2
assert(
  /mixFactor\s*>=\s*0\.999[\s\S]*?textureCubeLodEXT\(\s*cubemap2\s*,/.test(shader),
  "end-blend branch samples cubemap2"
);

// Mid-blend still has both
const elseBlock = shader.match(
  /else\s*\{([\s\S]*?)\n\s*\}[\s\S]*?texture2D\(baseColor/
);
assert(!!elseBlock, "blend else-block present");
assert(
  elseBlock &&
    elseBlock[1].includes("textureCubeLodEXT(cubemap,") &&
    elseBlock[1].includes("textureCubeLodEXT(cubemap2,"),
  "blend path still dual-samples"
);

// Unconditional dual-sample (old pattern) must be gone as the only path
assert(
  !/dir1[\s\S]*dir2[\s\S]*textureCubeLodEXT\(cubemap[\s\S]*textureCubeLodEXT\(cubemap2[\s\S]*mix\(c1\.rgb,\s*c2\.rgb,\s*mixFactor\);\n\n\s*vec3 albedo/.test(
    shader
  ),
  "old always-dual main path removed"
);

// Cubemap load: no mips / no aniso-16
assert(
  /new CubeTexture\(\s*[\s\S]*?true\s*,\s*null/.test(materials),
  "CubeTexture noMipmap=true"
);
assert(!/generateMipMaps\s*=\s*true/.test(materials), "no generateMipMaps=true");
assert(
  /anisotropicFilteringLevel\s*=\s*1/.test(materials),
  "anisotropicFilteringLevel = 1"
);
assert(
  /BILINEAR_SAMPLINGMODE/.test(materials),
  "uses BILINEAR_SAMPLINGMODE"
);
assert(
  !/anisotropicFilteringLevel\s*=\s*16/.test(materials),
  "anisotropic 16 removed"
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall projection-perf checks passed");

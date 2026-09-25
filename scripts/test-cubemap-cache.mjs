/**
 * Node unit checks for createCubemapCache (mocked textures, no Babylon/GPU).
 * Run: node scripts/test-cubemap-cache.mjs
 */
import { createCubemapCache } from "../src/babylon/useCubemapsAndMaterials.js";

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

function fakeTexture(name) {
  let disposed = false;
  return {
    name,
    dispose() {
      disposed = true;
    },
    get isDisposed() {
      return disposed;
    },
  };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const scene = { isDisposed: false };
  const disposals = [];

  const cache = createCubemapCache({
    maxSize: 5,
    async loadTexture(_scene, name) {
      await delay(5);
      const tex = fakeTexture(name);
      const orig = tex.dispose.bind(tex);
      tex.dispose = () => {
        disposals.push(name);
        orig();
      };
      return tex;
    },
  });

  // 1) Cap at 5 with pin protecting current
  cache.pin(["curr"]);
  await cache.get(scene, "curr");
  for (const k of ["a", "b", "c", "d", "e"]) {
    await cache.get(scene, k);
  }
  assert(cache.size() === 5, `size capped at 5 (got ${cache.size()})`);
  assert(cache.peek("curr"), "pinned curr survives overflow");
  assert(disposals.length >= 1, "eviction disposed at least one texture");

  // 2) Warm all neighbors, then settle elsewhere cancels + demotes stale
  const cache2 = createCubemapCache({
    maxSize: 5,
    async loadTexture(_scene, name) {
      await delay(name === "stale-slow" ? 40 : 5);
      return fakeTexture(name);
    },
  });

  cache2.pin(["roomA"]);
  await cache2.get(scene, "roomA");
  const warmA = cache2.warm(scene, ["n1", "n2", "stale-slow"]);
  await delay(15);
  cache2.pin(["roomB"]);
  await cache2.get(scene, "roomB");
  await cache2.warm(scene, ["b1", "b2", "b3"]);
  await warmA;
  assert(cache2.peek("roomB"), "roomB present after settle");
  assert(cache2.size() <= 5, `after cancelled warm size<=5 (got ${cache2.size()})`);
  // roomB + b1,b2,b3 should be preferred; stale-slow may exist demoted then evicted
  assert(cache2.peek("b1") && cache2.peek("b2") && cache2.peek("b3"), "new neighbors kept");

  // 3) Dedupe pending loads
  let loads = 0;
  const cache3 = createCubemapCache({
    maxSize: 5,
    async loadTexture(_scene, name) {
      loads += 1;
      await delay(20);
      return fakeTexture(name);
    },
  });
  const p = Promise.all([
    cache3.get(scene, "same"),
    cache3.get(scene, "same"),
    cache3.get(scene, "same"),
  ]);
  await p;
  assert(loads === 1, `pending loads deduped (loads=${loads})`);

  // 4) disposeAll
  cache3.disposeAll();
  assert(cache3.size() === 0, "disposeAll clears");
  let rejected = false;
  try {
    await cache3.get(scene, "x");
  } catch {
    rejected = true;
  }
  assert(rejected, "get after disposeAll rejects");

  // 5) Real tour graph: stair-foyer-1 has 5 neighbors → current+neighbors needs eviction
  const { CONFIG, neighborCubemapKeys, cubemapKey } = await import(
    "../src/babylon/config.js"
  );
  const foyer = CONFIG.views.find((v) => v.id === "stair-foyer-1");
  const keys = neighborCubemapKeys(foyer);
  assert(keys.length === 5, `stair-foyer-1 has 5 neighbor keys (got ${keys.length})`);
  assert(
    1 + keys.length > 5,
    "documents that MAX_CACHED=5 cannot keep current+all neighbors for foyer"
  );

  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log("\nall passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

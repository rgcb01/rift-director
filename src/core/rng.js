/* Rift Director: seeded RNG. The xorshift32 sequence is identical to Alpha 0.2. */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  core.nextRandom = (world) => {
    let x = world.rng | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    world.rng = x | 0;
    return (x >>> 0) / 4294967296;
  };
})(globalThis);

/**
 * Seeded pseudo-randomness.
 *
 * The scripted provider picks between phrasing variants. Doing that with
 * `Math.random()` makes the app impossible to test and impossible to
 * screenshot reproducibly, so every choice is derived from a seed built out of
 * the prompt and the request options instead. The same question asked twice
 * with the same settings produces the same answer.
 */

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const UINT32 = 0x100000000;

/** FNV-1a, returned as an unsigned 32-bit integer. */
export function hashString(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/** mulberry32: a small, fast, well-distributed 32-bit generator. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
}

export function createRandom(seedSource: string): () => number {
  return mulberry32(hashString(seedSource));
}

/** Picks one element. Throws on an empty list rather than returning undefined. */
export function pick<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) {
    throw new Error("pick() called with an empty list");
  }
  return items[Math.floor(random() * items.length) % items.length];
}

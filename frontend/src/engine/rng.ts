// Deterministic seeded RNG (xorshift128). Same seed -> same sequence, so a hand
// with a given handSeed always replays identically.

export class Rng {
  private x = 123456789;
  private y = 362436069;
  private z = 521288629;
  private w = 88675123;

  constructor(seed: string | number) {
    let h = 2166136261 >>> 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // seed the four state words
    this.x = (h ^ 0x9e3779b9) >>> 0 || 1;
    this.y = Math.imul(h, 2654435761) >>> 0 || 2;
    this.z = (h ^ 0x85ebca6b) >>> 0 || 3;
    this.w = Math.imul(h ^ 0xc2b2ae35, 2246822519) >>> 0 || 4;
    // warm up
    for (let i = 0; i < 16; i++) this.nextUint();
  }

  nextUint(): number {
    const t = this.x ^ (this.x << 11);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = (this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
    return this.w;
  }

  // float in [0,1)
  next(): number {
    return this.nextUint() / 4294967296;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  // Fisher-Yates in place
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
}

export function makeSeed(): string {
  return (
    Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36)
  );
}

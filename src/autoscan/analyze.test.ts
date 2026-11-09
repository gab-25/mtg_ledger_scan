import { alignedDiff, meanDiff, measure, toGray, type Gray } from "./analyze";
import { ALIGN_SHIFT, CHANGE_MIN } from "./config";

const W = 160;
const H = 224;

function image(fn: (x: number, y: number) => number): Gray {
  const data = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = fn(x, y);
  return { data, width: W, height: H };
}

// Deterministic pseudo-random noise.
function noise(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

// A card: dark frame, an "art" box and rows of high-contrast "text".
function card(dx = 0, dy = 0) {
  return image((x, y) => {
    x -= dx;
    y -= dy;
    if (x < 6 || x >= W - 6 || y < 6 || y >= H - 6) return 20;
    if (y > 20 && y < 110 && x > 14 && x < W - 14) return ((x >> 3) + (y >> 3)) % 2 ? 200 : 60;
    if (y > 120 && (y >> 2) % 2 === 0 && ((x * 7) >> 3) % 3 !== 0) return 30;
    return 230;
  });
}

function blur(img: Gray, r = 2): Gray {
  const out = new Uint8ClampedArray(img.data.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let sum = 0;
      let n = 0;
      for (let j = -r; j <= r; j++)
        for (let i = -r; i <= r; i++) {
          const xx = Math.min(W - 1, Math.max(0, x + i));
          const yy = Math.min(H - 1, Math.max(0, y + j));
          sum += img.data[yy * W + xx];
          n++;
        }
      out[y * W + x] = sum / n;
    }
  return { data: out, width: W, height: H };
}

describe("measure", () => {
  it("flat image is empty", () => {
    const flat = image(() => 120);
    expect(measure(flat, flat).present).toBe(false);
  });

  it("light noise (±5) is empty", () => {
    const rnd = noise(7);
    const table = image(() => 120 + Math.round((rnd() - 0.5) * 10));
    expect(measure(table, null).present).toBe(false);
  });

  it("card-like pattern is present and sharp", () => {
    const m = measure(card(), null);
    expect(m.present).toBe(true);
    expect(m.sharp).toBe(true);
  });

  it("out-of-focus card is not sharp", () => {
    // A 9x9 box blur: real out-of-focus frames score below SHARP_MIN (the blurry mat measured 0.07 live).
    expect(measure(blur(card(), 4), null).sharp).toBe(false);
  });

  it("presence has hysteresis between leaving and entering", () => {
    // Four thin lines: about 5% edge pixels, between PRESENT_EXIT_EDGES and PRESENT_MIN_EDGES.
    const lines = image((x) => ([20, 60, 100, 140].includes(x) ? 200 : 100));
    expect(measure(lines, null, false).present).toBe(false);
    expect(measure(lines, null, true).present).toBe(true);
    expect(measure(image(() => 100), null, true).present).toBe(false);
  });

  it("same frame is still", () => {
    const c = card();
    const m = measure(c, c);
    expect(m.motion).toBe(0);
    expect(m.still).toBe(true);
  });

  it("shifted frame is not still", () => {
    expect(measure(card(4), card()).still).toBe(false);
  });

  it("no previous frame is not still", () => {
    const m = measure(card(), null);
    expect(m.motion).toBe(Infinity);
    expect(m.still).toBe(false);
  });

  it("previous frame of another size is not still", () => {
    const small: Gray = { data: new Uint8ClampedArray(4), width: 2, height: 2 };
    expect(measure(card(), small).still).toBe(false);
  });
});

describe("toGray", () => {
  it("converts RGBA to luminance", () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255]);
    const g = toGray({ data: rgba, width: 3, height: 1 } as ImageData);
    expect(Array.from(g.data)).toEqual([255, 0, 54]);
    expect([g.width, g.height]).toEqual([3, 1]);
  });
});

describe("meanDiff", () => {
  it("is the mean absolute difference, Infinity without a comparable image", () => {
    const a = { data: new Uint8ClampedArray([10, 20, 30, 40]), width: 2, height: 2 };
    const b = { data: new Uint8ClampedArray([20, 10, 30, 60]), width: 2, height: 2 };
    expect(meanDiff(a, b)).toBe(10);
    expect(meanDiff(a, null)).toBe(Infinity);
    expect(meanDiff(a, { ...b, width: 4, height: 1 })).toBe(Infinity);
  });
});

describe("alignedDiff", () => {
  // Measured on a hand-held phone: the same card drifting a few pixels gave a plain difference up to 28,
  // more than CHANGE_MIN, and was shot again and again.
  it("ignores the camera drifting over the same card", () => {
    const shifted = card(4, -3);
    expect(meanDiff(shifted, card())).toBeGreaterThan(CHANGE_MIN);
    expect(alignedDiff(shifted, card())).toBeLessThan(2);
  });

  it("still sees another scene", () => {
    const other = image((x, y) => (x < W / 2 ? 230 : 20) + (y % 2));
    expect(alignedDiff(other, card())).toBeGreaterThan(CHANGE_MIN);
  });

  it("only tolerates shifts up to ALIGN_SHIFT", () => {
    expect(alignedDiff(card(ALIGN_SHIFT), card())).toBeLessThan(2);
    expect(alignedDiff(card(3 * ALIGN_SHIFT), card())).toBeGreaterThan(5);
  });

  it("is Infinity without a comparable image", () => {
    expect(alignedDiff(card(), null)).toBe(Infinity);
  });
});

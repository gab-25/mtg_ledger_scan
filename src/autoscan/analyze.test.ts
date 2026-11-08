import { measure, toGray, type Gray } from "./analyze";

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
function card(dx = 0) {
  return image((x, y) => {
    x -= dx;
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

  it("blurred card is not sharp", () => {
    expect(measure(blur(card()), null).sharp).toBe(false);
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

// Cheap per-frame measurements of the guide region, used to decide when to shoot.
import { EDGE_GRADIENT, PRESENT_MIN_EDGES, SHARP_MIN, STILL_MAX } from "./config";

/** A luminance image, one byte per pixel. */
export type Gray = { data: Uint8ClampedArray; width: number; height: number };

export type Metrics = {
  /** Fraction of pixels on an edge (Sobel magnitude > EDGE_GRADIENT). */
  edges: number;
  /** Variance of the Laplacian over variance of the intensity: high when in focus, whatever the contrast. */
  sharpness: number;
  /** Mean absolute difference from the previous frame; Infinity without a comparable one. */
  motion: number;
  present: boolean;
  sharp: boolean;
  still: boolean;
};

export function toGray(img: ImageData): Gray {
  const { data, width, height } = img;
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < out.length; i += 4, p++) {
    out[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  }
  return { data: out, width, height };
}

export function measure(cur: Gray, prev: Gray | null): Metrics {
  const { data: d, width: w, height: h } = cur;
  let edgeCount = 0;
  let lapSum = 0;
  let lapSq = 0;
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = d[i - w - 1], t = d[i - w], tr = d[i - w + 1];
      const l = d[i - 1], c = d[i], r = d[i + 1];
      const bl = d[i + w - 1], b = d[i + w], br = d[i + w + 1];
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;
      if (Math.hypot(gx, gy) > EDGE_GRADIENT) edgeCount++;
      const lap = t + b + l + r - 4 * c;
      lapSum += lap;
      lapSq += lap * lap;
      sum += c;
      sq += c * c;
      n++;
    }
  }
  const edges = n ? edgeCount / n : 0;
  const mean = n ? lapSum / n : 0;
  const lapVar = n ? lapSq / n - mean * mean : 0;
  const intensityVar = n ? sq / n - (sum / n) ** 2 : 0;
  const sharpness = lapVar / (intensityVar + 1);

  let motion = Infinity;
  if (prev && prev.width === w && prev.height === h) {
    let diff = 0;
    for (let i = 0; i < d.length; i++) diff += Math.abs(d[i] - prev.data[i]);
    motion = diff / d.length;
  }
  return {
    edges,
    sharpness,
    motion,
    present: edges >= PRESENT_MIN_EDGES,
    sharp: sharpness >= SHARP_MIN,
    still: motion <= STILL_MAX,
  };
}

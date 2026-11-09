// The part of the video under the on-screen guide.

type Box = { left: number; top: number; width: number; height: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** Guide position in video pixels, for a video shown with object-fit: cover. */
export function guideRect(video: Box, videoWidth: number, videoHeight: number, guide: Box): Rect {
  const k = Math.max(video.width / videoWidth, video.height / videoHeight);
  return {
    x: (guide.left - video.left - (video.width - videoWidth * k) / 2) / k,
    y: (guide.top - video.top - (video.height - videoHeight * k) / 2) / k,
    w: guide.width / k,
    h: guide.height / k,
  };
}

/** Draw the guide region into a canvas; with `width`, downscaled to that width (aspect kept). */
export function cropToGuide(video: HTMLVideoElement, guide: HTMLElement, width?: number, canvas?: HTMLCanvasElement) {
  const r = guideRect(video.getBoundingClientRect(), video.videoWidth, video.videoHeight, guide.getBoundingClientRect());
  const out = canvas ?? document.createElement("canvas");
  const scale = width ? width / r.w : 1;
  out.width = Math.max(1, Math.round(r.w * scale));
  out.height = Math.max(1, Math.round(r.h * scale));
  const ctx = out.getContext("2d", { willReadFrequently: Boolean(width) });
  ctx?.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height);
  return out;
}

export function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not take the photo"))), "image/jpeg", 0.8),
  );
}

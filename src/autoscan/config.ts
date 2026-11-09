// Autoscan tuning. Open the camera with ?debug=1 to see the live metrics and adjust these.

/** Width of the analysed (downscaled) guide region, in pixels. */
export const ANALYSIS_WIDTH = 160;
/** Frames analysed per second. */
export const ANALYSIS_FPS = 10;
/** Sobel gradient magnitude above which a pixel counts as an edge. */
export const EDGE_GRADIENT = 40;
/** Fraction of edge pixels from which the box holds a card (an empty table has few edges). */
export const PRESENT_MIN_EDGES = 0.06;
/** Once a card is seen, the box counts as empty only below this fraction (hysteresis against flicker). */
export const PRESENT_EXIT_EDGES = 0.04;
/** Laplacian variance / intensity variance from which the image is in focus. Measured live on a phone held by hand:
 *  a real card 0.19-0.31, the blurry empty mat 0.07 (synthetic test cards score far higher, ≈ 4). */
export const SHARP_MIN = 0.15;
/** Mean absolute difference from the previous frame (0-255) up to which the picture is still. Measured on a
 *  hand-held phone: 2-7 holding still, 9-25 moving; at 6, readings of 6.9-7.2 kept restarting the steady wait. */
export const STILL_MAX = 8;
/** How far (pixels of the analysed image) the camera may drift over the same card and still count as the same scene. */
export const ALIGN_SHIFT = 6;
/** Realigned mean difference (0-255, see alignedDiff) from which the box shows another scene than the last photo
 *  (or than the empty background). Measured on a hand-held phone: same card drifting 4-16, card taken away 29-69. */
export const CHANGE_MIN = 22;
/** How long card + focus + stillness must hold before shooting, in ms. */
export const STEADY_MS = 500;
/** How long the box must stay empty before the same card may be shot again, in ms. */
export const EMPTY_MS = 300;

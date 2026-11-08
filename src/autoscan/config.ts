// Autoscan tuning. Open the camera with ?debug=1 to see the live metrics and adjust these.

/** Width of the analysed (downscaled) guide region, in pixels. */
export const ANALYSIS_WIDTH = 160;
/** Frames analysed per second. */
export const ANALYSIS_FPS = 10;
/** Sobel gradient magnitude above which a pixel counts as an edge. */
export const EDGE_GRADIENT = 40;
/** Fraction of edge pixels from which the box holds a card (an empty table has few edges). */
export const PRESENT_MIN_EDGES = 0.06;
/** Laplacian variance / intensity variance from which the image is in focus (sharp card ≈ 4, blurred ≈ 0.1-0.25). */
export const SHARP_MIN = 0.5;
/** Mean absolute difference from the previous frame (0-255) up to which the picture is still. */
export const STILL_MAX = 6;
/** How long card + focus + stillness must hold before shooting, in ms. */
export const STEADY_MS = 500;
/** How long the box must stay empty to re-arm, in ms. */
export const EMPTY_MS = 300;

import { EMPTY_MS, STEADY_MS } from "./config";
import { initialState, step, type AutoscanEvent, type AutoscanState } from "./machine";

/** A card in the box, different from the last shot. */
const CARD = { present: true, sharp: true, still: true, changed: true };
/** The card just shot, still in the box. */
const SAME = { ...CARD, changed: false };
const EMPTY = { present: false, sharp: false, still: true, changed: true };
/** A patterned mat: edges enough to look like a card, never empty. */
const MAT = { present: true, sharp: true, still: true, changed: true };

type Frame = Omit<Extract<AutoscanEvent, { type: "frame" }>, "type" | "t">;

/** Feed frames every 50 ms from t0 to t1 (inclusive); returns final state and how many shots fired. */
function run(s: AutoscanState, t0: number, t1: number, frame: Frame) {
  let shots = 0;
  for (let t = t0; t <= t1; t += 50) {
    const r = step(s, { type: "frame", t, ...frame });
    s = r.state;
    if (r.capture) shots++;
  }
  return { s, shots };
}

const send = (s: AutoscanState, e: AutoscanEvent) => step(s, e);

/** Shot a card at t=0 and got the result. */
function afterShot() {
  const s = run(initialState(), 0, STEADY_MS, CARD).s;
  return send(s, { type: "result" }).state;
}

describe("autoscan machine", () => {
  it("starts armed", () => {
    expect(initialState().phase).toBe("armed");
  });

  it("card present for less than STEADY_MS does not shoot", () => {
    const { s, shots } = run(initialState(), 0, STEADY_MS - 50, CARD);
    expect(shots).toBe(0);
    expect(s.phase).toBe("steadying");
  });

  it("shoots once after STEADY_MS", () => {
    const { s, shots } = run(initialState(), 0, STEADY_MS + 1000, CARD);
    expect(shots).toBe(1);
    expect(s).toMatchObject({ phase: "busy", needChange: true });
  });

  it("the shot card left in the box is not shot again", () => {
    const s = afterShot();
    expect(s).toMatchObject({ phase: "armed", needChange: true });
    expect(run(s, 1000, 6000, SAME).shots).toBe(0);
  });

  it("a hand passing over the shot card does not shoot it again", () => {
    let s = afterShot();
    s = run(s, 1000, 1300, { ...CARD, still: false }).s;
    expect(run(s, 1350, 6000, SAME).shots).toBe(0);
  });

  it("a different card on a mat that never looks empty is shot", () => {
    let s = afterShot();
    s = run(s, 1000, 1500, { ...MAT, still: false }).s; // card swapped on the mat
    expect(run(s, 1550, 1550 + STEADY_MS, CARD).shots).toBe(1);
  });

  it("the next card can be laid on top of the last one", () => {
    expect(run(afterShot(), 1000, 1000 + STEADY_MS, CARD).shots).toBe(1);
  });

  it("an empty box clears needChange: a second copy in the same spot is shot", () => {
    let s = run(afterShot(), 1000, 1000 + EMPTY_MS, EMPTY).s;
    expect(s.needChange).toBe(false);
    expect(run(s, 2000, 2000 + STEADY_MS, SAME).shots).toBe(1);
  });

  it("a brief gap does not count as empty", () => {
    let s = run(afterShot(), 1000, 1000 + EMPTY_MS - 100, EMPTY).s;
    s = run(s, 1300, 1400, SAME).s;
    expect(s.needChange).toBe(true);
  });

  it("emptied during busy: the same card put back is shot after the result", () => {
    let s = run(initialState(), 0, STEADY_MS, CARD).s;
    s = run(s, 1000, 1000 + EMPTY_MS, EMPTY).s;
    s = send(s, { type: "result" }).state;
    expect(run(s, 2000, 2000 + STEADY_MS, SAME).shots).toBe(1);
  });

  it("motion resets steadying", () => {
    let { s } = run(initialState(), 0, STEADY_MS - 100, CARD);
    s = send(s, { type: "frame", t: STEADY_MS - 50, ...CARD, still: false }).state;
    expect(s.phase).toBe("armed");
    expect(run(s, STEADY_MS, 2 * STEADY_MS - 100, CARD).shots).toBe(0);
  });

  it("blur resets steadying", () => {
    const { s } = run(initialState(), 0, 200, CARD);
    expect(send(s, { type: "frame", t: 250, ...CARD, sharp: false }).state.phase).toBe("armed");
  });

  it("manual shoots and is ignored while busy", () => {
    const first = send(initialState(), { type: "manual" });
    expect(first).toMatchObject({ capture: true, state: { phase: "busy", needChange: true } });
    expect(send(first.state, { type: "manual" }).capture).toBe(false);
  });

  it("pause blocks shots; resume needs a change (the confirmed card is still there)", () => {
    let s = send(initialState(), { type: "pause" }).state;
    expect(run(s, 0, 3000, CARD).shots).toBe(0);
    expect(send(s, { type: "manual" }).capture).toBe(false);
    s = send(s, { type: "resume" }).state;
    expect(s).toMatchObject({ phase: "armed", needChange: true });
    expect(run(s, 3000, 6000, SAME).shots).toBe(0);
  });

  it("result while paused stays paused", () => {
    let s = send(initialState(), { type: "manual" }).state;
    s = send(s, { type: "pause" }).state;
    expect(send(s, { type: "result" }).state.phase).toBe("paused");
  });
});

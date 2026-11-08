import { EMPTY_MS, STEADY_MS } from "./config";
import { initialState, step, type AutoscanEvent, type AutoscanState } from "./machine";

const CARD = { present: true, sharp: true, still: true };
const EMPTY = { present: false, sharp: false, still: true };

/** Feed frames every 50 ms from t0 to t1 (inclusive); returns final state and how many shots fired. */
function run(s: AutoscanState, t0: number, t1: number, frame: typeof CARD) {
  let shots = 0;
  for (let t = t0; t <= t1; t += 50) {
    const r = step(s, { type: "frame", t, ...frame });
    s = r.state;
    if (r.capture) shots++;
  }
  return { s, shots };
}

function send(s: AutoscanState, e: AutoscanEvent) {
  return step(s, e);
}

function armed() {
  return run(initialState(true), 0, EMPTY_MS + 50, EMPTY).s;
}

describe("autoscan machine", () => {
  it("starts waiting for an empty box", () => {
    expect(initialState(true).phase).toBe("waitEmpty");
  });

  it("does not arm while a card is in the box", () => {
    expect(run(initialState(true), 0, 2000, CARD)).toMatchObject({ shots: 0, s: { phase: "waitEmpty" } });
  });

  it("arms after empty for EMPTY_MS", () => {
    expect(run(initialState(true), 0, EMPTY_MS - 50, EMPTY).s.phase).toBe("waitEmpty");
    expect(armed().phase).toBe("armed");
  });

  it("card present for less than STEADY_MS does not shoot", () => {
    const { s, shots } = run(armed(), 1000, 1000 + STEADY_MS - 50, CARD);
    expect(shots).toBe(0);
    expect(s.phase).toBe("steadying");
  });

  it("shoots once after STEADY_MS", () => {
    const { s, shots } = run(armed(), 1000, 1000 + STEADY_MS + 1000, CARD);
    expect(shots).toBe(1);
    expect(s.phase).toBe("busy");
  });

  it("card left in the box after result does not shoot again", () => {
    let { s } = run(armed(), 1000, 1000 + STEADY_MS, CARD);
    s = send(s, { type: "result" }).state;
    expect(s.phase).toBe("waitEmpty");
    expect(run(s, 3000, 6000, CARD).shots).toBe(0);
  });

  it("card removed during busy re-arms on result", () => {
    let { s } = run(armed(), 1000, 1000 + STEADY_MS, CARD);
    s = run(s, 2000, 2000 + EMPTY_MS + 50, EMPTY).s;
    expect(s.phase).toBe("busy");
    s = send(s, { type: "result" }).state;
    expect(s.phase).toBe("armed");
    expect(run(s, 3000, 3000 + STEADY_MS, CARD).shots).toBe(1);
  });

  it("a brief gap during busy does not count as empty", () => {
    let { s } = run(armed(), 1000, 1000 + STEADY_MS, CARD);
    s = run(s, 2000, 2000 + EMPTY_MS - 100, EMPTY).s;
    s = run(s, 2400, 2500, CARD).s;
    expect(send(s, { type: "result" }).state.phase).toBe("waitEmpty");
  });

  it("motion resets steadying", () => {
    let { s } = run(armed(), 1000, 1000 + STEADY_MS - 100, CARD);
    s = send(s, { type: "frame", t: 1450, ...CARD, still: false }).state;
    expect(s.phase).toBe("armed");
    expect(run(s, 1500, 1500 + STEADY_MS - 100, CARD).shots).toBe(0);
  });

  it("blur resets steadying", () => {
    const { s } = run(armed(), 1000, 1200, CARD);
    expect(send(s, { type: "frame", t: 1250, ...CARD, sharp: false }).state.phase).toBe("armed");
  });

  it("manual shoots from armed and is ignored while busy", () => {
    const first = send(armed(), { type: "manual" });
    expect(first).toMatchObject({ capture: true, state: { phase: "busy" } });
    expect(send(first.state, { type: "manual" }).capture).toBe(false);
  });

  it("manual shoots from waitEmpty", () => {
    expect(send(initialState(true), { type: "manual" }).capture).toBe(true);
  });

  it("pause blocks shots and resume waits for empty", () => {
    let s = send(armed(), { type: "pause" }).state;
    expect(run(s, 1000, 3000, CARD).shots).toBe(0);
    expect(send(s, { type: "manual" }).capture).toBe(false);
    s = send(s, { type: "resume" }).state;
    expect(s.phase).toBe("waitEmpty");
  });

  it("result while paused stays paused", () => {
    let s = send(armed(), { type: "manual" }).state;
    s = send(s, { type: "pause" }).state;
    expect(send(s, { type: "result" }).state.phase).toBe("paused");
  });

  it("disabled never auto-shoots but manual works", () => {
    let s = run(initialState(false), 0, EMPTY_MS + 50, EMPTY).s;
    expect(run(s, 1000, 4000, CARD).shots).toBe(0);
    expect(send(s, { type: "manual" }).capture).toBe(true);
    s = send(s, { type: "enable", enabled: true }).state;
    expect(s.enabled).toBe(true);
  });
});

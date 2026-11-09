import { guideRect } from "./crop";

describe("guideRect", () => {
  it("maps the on-screen guide to video pixels with object-fit: cover", () => {
    // 1920x1080 landscape video shown in a 390x844 portrait box: scaled by 844/1080, cropped left/right.
    const k = 844 / 1080;
    const shownWidth = 1920 * k;
    const video = { left: 0, top: 0, width: 390, height: 844 };
    const guide = { left: 45, top: 222, width: 300, height: 400 };
    const r = guideRect(video, 1920, 1080, guide);
    expect(r.x).toBeCloseTo((45 + (shownWidth - 390) / 2) / k);
    expect(r.y).toBeCloseTo(222 / k);
    expect(r.w).toBeCloseTo(300 / k);
    expect(r.h).toBeCloseTo(400 / k);
  });
});

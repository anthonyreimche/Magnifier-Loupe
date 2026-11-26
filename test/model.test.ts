// The loupe's arithmetic: the magnification and size steps, which wheel
// gestures it takes, the patch it asks Develop for, and where a picture lands
// in the loupe.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIAMETER,
  MAGNIFICATIONS,
  MAX_DIAMETER,
  MIN_DIAMETER,
  containedPoint,
  covers,
  inside,
  MAX_PATCH,
  lensDiameter,
  magnificationLabel,
  patchSize,
  placement,
  sourceScale,
  stepDiameter,
  stepMagnification,
  wheelGesture,
  wheelStepper,
} from "../src/model";

describe("magnification", () => {
  it("steps through 100, 200, 400 and 800 %, stopping at either end", () => {
    expect(MAGNIFICATIONS).toEqual([1, 2, 4, 8]);
    expect(stepMagnification(1, 1)).toBe(2);
    expect(stepMagnification(4, 1)).toBe(8);
    expect(stepMagnification(8, 1)).toBe(8);
    expect(stepMagnification(2, -1)).toBe(1);
    expect(stepMagnification(1, -1)).toBe(1);
  });

  it("steps from the nearest stop for a value that isn't one", () => {
    expect(stepMagnification(3.5, 1)).toBe(8);
    expect(stepMagnification(3.5, -1)).toBe(2);
    expect(stepMagnification(Number.NaN, 1)).toBe(2);
  });

  it("labels as the Develop zoom does", () => {
    expect(magnificationLabel(1)).toBe("100%");
    expect(magnificationLabel(8)).toBe("800%");
  });
});

describe("diameter", () => {
  it("steps by 40 px between 120 and 480 px", () => {
    expect(DEFAULT_DIAMETER).toBe(240);
    expect(stepDiameter(240, 1)).toBe(280);
    expect(stepDiameter(240, -1)).toBe(200);
    expect(stepDiameter(MAX_DIAMETER, 1)).toBe(MAX_DIAMETER);
    expect(stepDiameter(MIN_DIAMETER, -1)).toBe(MIN_DIAMETER);
    expect(stepDiameter(Number.NaN, 1)).toBe(DEFAULT_DIAMETER + 40);
  });
});

describe("wheel", () => {
  const roll = (over: Partial<WheelEvent>) => ({ deltaX: 0, deltaY: 0, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...over });

  it("takes Alt+wheel for the magnification and Shift+wheel for the size, nothing else", () => {
    expect(wheelGesture(roll({ altKey: true }))).toBe("magnification");
    expect(wheelGesture(roll({ shiftKey: true }))).toBe("diameter");
    expect(wheelGesture(roll({}))).toBeNull();
    expect(wheelGesture(roll({ ctrlKey: true }))).toBeNull();
    expect(wheelGesture(roll({ altKey: true, shiftKey: true }))).toBeNull();
    expect(wheelGesture(roll({ shiftKey: true, metaKey: true }))).toBeNull();
  });
});

describe("the patch Develop draws", () => {
  it("covers half as much again as the loupe shows, in frame pixels, up to the largest patch", () => {
    // 240 layout px at 200 % on a 1.5 dpr screen shows 180 frame px.
    expect(patchSize(240, 2, 1.5)).toBe(270);
    expect(patchSize(240, 8, 1)).toBe(45);
    expect(patchSize(480, 1, 3)).toBe(MAX_PATCH);
  });

  it("holds the loupe to what one patch can show", () => {
    expect(lensDiameter(240, 2, 1.5)).toBe(240);
    expect(lensDiameter(480, 1, 3)).toBe(340);
    expect(lensDiameter(480, 1, 2.5)).toBe(408);
  });
});

describe("placement", () => {
  it("puts the centre's source pixel at the loupe's centre, scaled", () => {
    // A patch from frame pixel (100, 50), 20 px square, the loupe centred on (110, 60) at 4 backing px a pixel.
    expect(placement({ x: 100, y: 50, width: 20, height: 20 }, { x: 110, y: 60 }, 4, 200)).toEqual({ dx: 60, dy: 60, dw: 80, dh: 80 });
  });

  it("scales a whole picture around an off-centre point", () => {
    expect(placement({ x: 0, y: 0, width: 768, height: 512 }, { x: 100, y: 200 }, 2, 300)).toEqual({ dx: -50, dy: -250, dw: 1536, dh: 1024 });
  });

  it("measures the source in backing pixels from the magnification and the interface scale", () => {
    expect(sourceScale(2, 1)).toBe(2);
    expect(sourceScale(1, 1.25)).toBe(1.25);
  });
});

describe("pointer and picture coordinates", () => {
  it("finds the picture pixel under a point of a contained image, or null in its margins", () => {
    // A 400×200 picture in a 200×200 box: 100 px tall, from y = 50.
    const box = { left: 10, top: 20, width: 200, height: 200 };
    expect(containedPoint(box, 400, 200, { x: 110, y: 120 })).toEqual({ x: 200, y: 100 });
    expect(containedPoint(box, 400, 200, { x: 10, y: 70 })).toEqual({ x: 0, y: 0 });
    expect(containedPoint(box, 400, 200, { x: 110, y: 30 })).toBeNull();
    expect(containedPoint(box, 0, 0, { x: 110, y: 120 })).toBeNull();
  });

  it("tells a point inside a rectangle", () => {
    const rect = { x: 10, y: 10, w: 100, h: 50 };
    expect(inside({ x: 10, y: 10 }, rect)).toBe(true);
    expect(inside({ x: 110, y: 30 }, rect)).toBe(false);
    expect(inside({ x: 50, y: 61 }, rect)).toBe(false);
  });
});

describe("whether a held patch still covers the loupe", () => {
  // The loupe shows 60 frame px across, centred on (100, 100) of a 1000×800 frame.
  const view = { centre: { x: 100, y: 100 }, span: 60, frameWidth: 1000, frameHeight: 800 };

  it("covers while the view's square is inside the patch", () => {
    expect(covers({ x: 55, y: 55, width: 90, height: 90 }, view)).toBe(true);
    expect(covers({ x: 75, y: 55, width: 90, height: 90 }, view)).toBe(false);
  });

  it("counts only the part of the view inside the frame", () => {
    const corner = { ...view, centre: { x: 10, y: 10 } };
    expect(covers({ x: 0, y: 0, width: 45, height: 45 }, corner)).toBe(true);
    expect(covers({ x: 0, y: 0, width: 30, height: 45 }, corner)).toBe(false);
  });
});

describe("wheel steps", () => {
  it("steps once a notch, gathering a trackpad's small deltas, and forgets a pause", () => {
    const step = wheelStepper();
    expect(step({ deltaX: 0, deltaY: -100 }, 0)).toBe(1);
    expect(step({ deltaX: 0, deltaY: 20 }, 10)).toBe(0);
    expect(step({ deltaX: 0, deltaY: 20 }, 20)).toBe(0);
    expect(step({ deltaX: 0, deltaY: 20 }, 30)).toBe(-1);
    expect(step({ deltaX: 0, deltaY: 30 }, 40)).toBe(0);
    expect(step({ deltaX: 0, deltaY: 30 }, 1000)).toBe(0);
  });

  it("reads the horizontal roll Shift turns the wheel into on Windows", () => {
    const step = wheelStepper();
    expect(step({ deltaX: -100, deltaY: 0 }, 0)).toBe(1);
    expect(step({ deltaX: 100, deltaY: 3 }, 10)).toBe(-1);
  });
});

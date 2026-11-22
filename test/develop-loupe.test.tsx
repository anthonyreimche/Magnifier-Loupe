// The loupe over the Develop canvas: where it shows, the patches it asks
// Develop for, how it paints them, and what it leaves to the canvas.

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DevelopLoupe } from "../src/DevelopLoupe";
import { activate, deactivate } from "../src/index";
import { DIAMETER_KEY, MAGNIFICATION_KEY, PARK_ACTION } from "../src/ids";
import { React } from "../src/rt";
import { loupeStore } from "../src/state";
import { bitmap, fakeApi, flushFrames, layOut, recordCanvas, type Rig } from "./support/fake-api";

// The canvas area sits at (100, 50) on screen, 800×600, the photo filling it.
const AREA = { left: 100, top: 50, width: 800, height: 600 };
const PHOTO = { x: 0, y: 0, w: 800, h: 600 };
// The frame Develop holds, 4000×3000.
const FRAME = { frameWidth: 4000, frameHeight: 3000 };

let rig: Rig;
let canvas: ReturnType<typeof recordCanvas>;

beforeEach(() => {
  rig = fakeApi();
  activate(rig.api);
  canvas = recordCanvas();
  window.devicePixelRatio = 1;
  rig.overlay.setState({ rect: PHOTO, imageRect: PHOTO, region: { x: 0, y: 0, width: 1, height: 1 } });
});
afterEach(() => {
  cleanup();
  deactivate();
  canvas.restore();
});

function show(area = AREA, layoutWidth = area.width) {
  act(() => loupeStore().getState().toggle());
  const view = render(<DevelopLoupe />);
  const root = view.container.querySelector<HTMLElement>("[data-loupe-root]");
  if (!root) throw new Error("no loupe");
  layOut(root, area, layoutWidth);
  return root;
}

const lens = () => document.querySelector<HTMLElement>("[data-loupe-lens]")!;
const move = (x: number, y: number, target: EventTarget = document.body) => {
  act(() => {
    target.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true }));
    flushFrames();
  });
};
const wheel = (init: WheelEventInit, x = 500, y = 350) => {
  const e = new WheelEvent("wheel", { clientX: x, clientY: y, bubbles: true, cancelable: true, deltaY: -100, ...init });
  act(() => void document.body.dispatchEvent(e));
  return e;
};
const settle = async (index: number, capture: Parameters<Rig["asked"][number]["answer"]>[0]) => {
  await act(async () => {
    await rig.asked[index].answer(capture);
    flushFrames();
  });
};
const patchAt = (x: number, y: number, size = 180, colorSpace: PredefinedColorSpace = "srgb") => ({
  bitmap: bitmap(size, size),
  rect: { x, y, width: size, height: size },
  ...FRAME,
  colorSpace,
});

describe("the Develop loupe", () => {
  it("shows only while the pointer is over the photo, centred on it", () => {
    show();
    act(() => flushFrames());
    expect(lens().style.display).toBe("none");
    move(500, 350);
    expect(lens().style.display).toBe("block");
    expect(lens().style.transform).toBe("translate(280px, 180px)");
    act(() => rig.overlay.setState({ rect: { x: 0, y: 0, w: 300, h: 600 } }));
    move(500, 350);
    expect(lens().style.display).toBe("none");
  });

  it("shows at once where the pointer already rests when turned on", () => {
    move(500, 350);
    show();
    act(() => flushFrames());
    expect(lens().style.display).toBe("block");
    expect(rig.asked).toHaveLength(1);
  });

  it("hides over a floating panel or a menu above the canvas", () => {
    show();
    move(500, 350);
    const panel = document.createElement("div");
    panel.className = "sl-floating-panel";
    document.body.append(panel);
    move(500, 350, panel);
    expect(lens().style.display).toBe("none");
    panel.remove();
  });

  it("asks for the patch under the pointer at the frame's pixels, half as wide again as it shows", () => {
    show();
    move(500, 350);
    // 240 px at 200 % shows 120 frame px; the patch is 180.
    expect(rig.asked.map((a) => a.request)).toEqual([{ x: 0.5, y: 0.5, width: 180, height: 180 }]);
  });

  it("asks one patch at a time, painting the one it holds at once as the pointer moves", async () => {
    show();
    move(500, 350);
    move(505, 350);
    expect(rig.asked).toHaveLength(1);
    const patch = patchAt(1910, 1410);
    await settle(0, patch);
    // The pointer is at x 405 of 800: frame x 2025, so the patch starts 115 frame px left of the middle.
    expect(canvas.draws.at(-1)).toEqual({ image: patch.bitmap, dx: 120 - 115 * 2, dy: 120 - 90 * 2, dw: 360, dh: 360, smoothing: false });
    expect(rig.asked).toHaveLength(1);
    // Far enough that the patch no longer covers the loupe: another is asked for.
    move(530, 350);
    expect(rig.asked).toHaveLength(2);
    expect(rig.asked[1].request).toMatchObject({ x: 0.5375, y: 0.5 });
  });

  it("asks again when the edit changes, and lets the old patch go", async () => {
    show();
    move(500, 350);
    const first = patchAt(1910, 1410);
    await settle(0, first);
    act(() => {
      rig.develop.setState({ paramBag: { "x.amount": 1 } });
      flushFrames();
    });
    expect(rig.asked).toHaveLength(2);
    await settle(1, patchAt(1910, 1410));
    expect(first.bitmap.closed).toBe(true);
  });

  it("doesn't ask again for a frame Develop has none of until something changes", async () => {
    show();
    move(500, 350);
    await settle(0, null);
    move(510, 360);
    expect(rig.asked).toHaveLength(1);
    act(() => {
      rig.develop.setState({ histogram: {} });
      flushFrames();
    });
    expect(rig.asked).toHaveLength(2);
  });

  it("draws at the screen's own pixels under a display and interface scale", async () => {
    window.devicePixelRatio = 2;
    // Interface scale 1.2: 800 layout px take 960 on screen.
    show({ left: 100, top: 50, width: 960, height: 720 }, 800);
    move(100 + 480, 50 + 360);
    // 240 px at 200 % on a 2× screen shows 240 frame px: a 360 px patch, centred on the middle.
    expect(rig.asked[0].request).toEqual({ x: 0.5, y: 0.5, width: 360, height: 360 });
    const patch = patchAt(1820, 1320, 360);
    await settle(0, patch);
    const canvasEl = lens().querySelector("canvas")!;
    expect(canvasEl.width).toBe(Math.round(240 * 2 * 1.2));
    expect(canvas.draws.at(-1)).toMatchObject({ dw: 360 * 2 * 1.2 });
  });

  it("counts the photo's pixels, as Develop's zoom does with Dynamic render resolution", async () => {
    // Each frame pixel stands for 2 of the photo's: 200 % enlarges a frame pixel 4 times.
    rig.overlay.setState({ zoomScale: 2 });
    show();
    move(500, 350);
    expect(rig.asked[0].request).toEqual({ x: 0.5, y: 0.5, width: 90, height: 90 });
    const patch = patchAt(1955, 1455, 90);
    await settle(0, patch);
    expect(canvas.draws.at(-1)).toMatchObject({ dx: 120 - 45 * 4, dw: 360, smoothing: false });
  });

  it("keeps within what one patch can cover, and asks once while the pointer rests", async () => {
    // 480 px at 100 % on a 3× screen would show 1440 frame px; a patch is at most 1024.
    window.devicePixelRatio = 3;
    act(() => rig.api.settings.set(DIAMETER_KEY, 480));
    act(() => rig.api.settings.set(MAGNIFICATION_KEY, 1));
    show();
    move(500, 350);
    expect(lens().style.width).toBe("340px");
    expect(rig.asked[0].request).toEqual({ x: 0.5, y: 0.5, width: 1024, height: 1024 });
    await settle(0, patchAt(2000 - 512, 1500 - 512, 1024));
    for (let i = 0; i < 3; i++) act(() => flushFrames());
    expect(rig.asked).toHaveLength(1);
  });

  it("never asks twice for the same patch, even one that came back short", async () => {
    show();
    move(500, 350);
    await settle(0, patchAt(2000, 1500, 10));
    for (let i = 0; i < 3; i++) act(() => flushFrames());
    expect(rig.asked).toHaveLength(1);
    move(510, 350);
    expect(rig.asked).toHaveLength(2);
  });

  it("asks again after a patch beside the frame came back empty", async () => {
    // Mid zoom ease the view's rect can run past the frame it maps through.
    act(() => rig.overlay.setState({ imageRect: { x: 0, y: 0, w: 400, h: 600 } }));
    show();
    move(700, 350);
    expect(rig.asked[0].request).toMatchObject({ x: 1.5 });
    await settle(0, null);
    move(300, 350);
    expect(rig.asked).toHaveLength(2);
  });

  it("draws a wide-gamut patch into a canvas of its colour space", async () => {
    show();
    move(500, 350);
    await settle(0, patchAt(1910, 1410, 180, "display-p3"));
    act(() => flushFrames());
    expect(canvas.spaces.at(-1)).toBe("display-p3");
    expect(lens().querySelectorAll("canvas")).toHaveLength(1);
  });

  it("closes the patch it holds when turned off", async () => {
    show();
    move(500, 350);
    const patch = patchAt(1910, 1410);
    await settle(0, patch);
    act(() => loupeStore().getState().toggle());
    expect(patch.bitmap.closed).toBe(true);
  });

  it("takes no pointer events: clicks, pans and zooms reach the canvas", () => {
    const root = show();
    move(500, 350);
    expect(root.style.pointerEvents).toBe("none");
    expect(lens().style.pointerEvents).toBe("none");
    expect(document.querySelector("[data-loupe-grip]")).toBeNull();
  });
});

describe("the wheel over the Develop loupe", () => {
  it("steps the magnification with Alt and the size with Shift, and nothing else", () => {
    show();
    move(500, 350);
    const plain = wheel({});
    expect(plain.defaultPrevented).toBe(false);
    const alt = wheel({ altKey: true });
    expect(alt.defaultPrevented).toBe(true);
    expect(rig.settings.get(MAGNIFICATION_KEY)).toBe(4);
    wheel({ shiftKey: true, deltaY: 0, deltaX: 100 });
    expect(rig.settings.get(DIAMETER_KEY)).toBe(200);
    expect(wheel({ ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it("leaves the wheel alone away from the photo, and over a panel above it", () => {
    show();
    move(950, 350);
    expect(wheel({ altKey: true }, 950, 350).defaultPrevented).toBe(false);
    const panel = document.createElement("div");
    panel.className = "sl-floating-panel";
    document.body.append(panel);
    move(500, 350, panel);
    expect(wheel({ altKey: true }).defaultPrevented).toBe(false);
    panel.remove();
  });
});

describe("a parked Develop loupe", () => {
  const park = () => act(() => rig.keys.find((k) => k.id === PARK_ACTION)!.handler());

  it("stays where it was parked and shows what is under it", () => {
    show();
    move(500, 350);
    park();
    move(150, 100);
    expect(lens().style.transform).toBe("translate(280px, 180px)");
    expect(rig.asked.at(-1)!.request).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it("is dragged by its ring, which alone takes the pointer", () => {
    show();
    move(500, 350);
    park();
    const grip = document.querySelector<SVGCircleElement>("[data-loupe-grip]")!;
    expect(grip.style.pointerEvents).toBe("stroke");
    act(() => {
      grip.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, button: 0, clientX: 500, clientY: 230, bubbles: true }));
      grip.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 540, clientY: 250, bubbles: true }));
      grip.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 540, clientY: 250, bubbles: true }));
    });
    expect(loupeStore().getState().parked.develop).toEqual({ x: 440, y: 320 });
  });

  it("takes the wheel only inside its ring", () => {
    show();
    move(500, 350);
    park();
    expect(wheel({ altKey: true }, 520, 360).defaultPrevented).toBe(true);
    expect(wheel({ altKey: true }, 800, 600).defaultPrevented).toBe(false);
  });
});

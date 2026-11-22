// The loupe over the Library: it enlarges the grid preview under the pointer,
// at the preview's own pixels, and shows only over a photo.

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { MAGNIFICATION_KEY, PARK_ACTION } from "../src/ids";
import { LibraryLoupe } from "../src/LibraryLoupe";
import { React } from "../src/rt";
import { loupeStore } from "../src/state";
import { fakeApi, flushFrames, layOut, recordCanvas, type Rig } from "./support/fake-api";

let rig: Rig;
let canvas: ReturnType<typeof recordCanvas>;
let cell: HTMLElement;
let img: HTMLImageElement;
const original = document.elementFromPoint;

// A 768×512 preview contained in a 300 px cell at (200, 100): drawn 300×200, from y = 150.
beforeEach(() => {
  rig = fakeApi();
  activate(rig.api);
  canvas = recordCanvas();
  window.devicePixelRatio = 1;
  rig.ui.setState({ activeModule: "library" });
  cell = document.createElement("div");
  cell.dataset.photoId = "p1";
  img = document.createElement("img");
  Object.defineProperty(img, "naturalWidth", { value: 768 });
  Object.defineProperty(img, "naturalHeight", { value: 512 });
  Object.defineProperty(img, "complete", { value: true });
  layOut(img, { left: 200, top: 100, width: 300, height: 300 });
  const badge = document.createElement("span");
  cell.append(img, badge);
  document.body.append(cell);
  document.elementFromPoint = (x: number, y: number) =>
    x >= 200 && x < 500 && y >= 100 && y < 400 ? (y > 330 ? badge : img) : document.body;
});
afterEach(() => {
  cleanup();
  deactivate();
  canvas.restore();
  cell.remove();
  document.elementFromPoint = original;
});

function show() {
  act(() => loupeStore().getState().toggle());
  render(<LibraryLoupe />);
  const root = document.querySelector<HTMLElement>("[data-loupe-root]");
  if (!root) throw new Error("no loupe");
  layOut(root, { left: 0, top: 0, width: 1200, height: 800 });
  return root;
}

const lens = () => document.querySelector<HTMLElement>("[data-loupe-lens]")!;
const move = (x: number, y: number) =>
  act(() => {
    document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true }));
    flushFrames();
  });

describe("the Library loupe", () => {
  it("enlarges the preview under the pointer at its own pixels", () => {
    show();
    move(350, 250);
    // Preview pixel (384, 256) under the pointer, 2 canvas px a preview px at 200 %.
    expect(lens().style.display).toBe("block");
    expect(lens().style.transform).toBe("translate(230px, 130px)");
    expect(canvas.draws.at(-1)).toEqual({ image: img, dx: 120 - 768, dy: 120 - 512, dw: 1536, dh: 1024, smoothing: false });
  });

  it("reads the preview through what is drawn over the cell", () => {
    show();
    move(350, 340);
    expect(lens().style.display).toBe("block");
    expect(canvas.draws.at(-1)?.image).toBe(img);
  });

  it("shows only over a photo: not in a cell's margin or off the grid", () => {
    show();
    move(350, 120);
    expect(lens().style.display).toBe("none");
    move(700, 250);
    expect(lens().style.display).toBe("none");
  });

  it("smooths the preview below twice its size", () => {
    rig.api.settings.set(MAGNIFICATION_KEY, 1);
    show();
    move(350, 250);
    expect(canvas.draws.at(-1)).toMatchObject({ dw: 768, smoothing: true });
  });

  it("isn't drawn outside the Library", () => {
    rig.ui.setState({ activeModule: "develop" });
    act(() => loupeStore().getState().toggle());
    render(<LibraryLoupe />);
    expect(document.querySelector("[data-loupe-root]")).toBeNull();
  });

  it("parked, stays put and shows the photo under it as the pointer moves away", () => {
    show();
    move(350, 250);
    act(() => rig.keys.find((k) => k.id === PARK_ACTION)!.handler());
    move(900, 700);
    expect(lens().style.transform).toBe("translate(230px, 130px)");
    expect(canvas.draws.at(-1)?.image).toBe(img);
  });

  it("takes Alt+wheel over a photo and leaves the grid's own scroll alone", () => {
    show();
    move(350, 250);
    const roll = (init: WheelEventInit) => {
      const e = new WheelEvent("wheel", { clientX: 350, clientY: 250, deltaY: -100, bubbles: true, cancelable: true, ...init });
      act(() => void document.body.dispatchEvent(e));
      return e.defaultPrevented;
    };
    expect(roll({})).toBe(false);
    expect(roll({ altKey: true })).toBe(true);
    expect(rig.settings.get(MAGNIFICATION_KEY)).toBe(4);
  });
});

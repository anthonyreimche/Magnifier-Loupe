// What the extension registers, and its shortcuts.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { DIAMETER_KEY, LESS_ACTION, MAGNIFICATION_KEY, MORE_ACTION, PARK_ACTION, TOGGLE_ACTION } from "../src/ids";
import { loupeStore, setShownAt } from "../src/state";
import { fakeApi, type Rig } from "./support/fake-api";

let rig: Rig;
beforeEach(() => {
  rig = fakeApi();
  activate(rig.api);
});
afterEach(() => deactivate());

const press = (id: string) => {
  const key = rig.keys.find((k) => k.id === id);
  if (!key) throw new Error(`no shortcut ${id}`);
  key.handler();
};

describe("activate", () => {
  it("puts the loupe over the Develop canvas and a Loupe button in Develop and the Library", () => {
    expect(rig.slots.map((s) => s.slot)).toEqual(["develop-canvas-overlay", "develop-toolbar", "library-toolbar"]);
  });

  it("binds backtick to the loupe, Shift+backtick to parking and Alt+= / Alt+- to the magnification", () => {
    expect(rig.keys.map((k) => [k.id, k.defaultCombo, k.category])).toEqual([
      [TOGGLE_ACTION, "`", "General"],
      [PARK_ACTION, "Shift+`", "General"],
      [MORE_ACTION, "Alt+=", "General"],
      [LESS_ACTION, "Alt+-", "General"],
    ]);
  });

  it("starts off at 200 % and 240 px, or as it was left", () => {
    expect(loupeStore().getState()).toMatchObject({ on: false, magnification: 2, diameter: 240 });
    deactivate();
    rig = fakeApi();
    rig.settings.set(MAGNIFICATION_KEY, 8);
    rig.settings.set(DIAMETER_KEY, 360);
    activate(rig.api);
    expect(loupeStore().getState()).toMatchObject({ magnification: 8, diameter: 360 });
  });

  it("ignores a saved magnification or size it doesn't offer", () => {
    deactivate();
    rig = fakeApi();
    rig.settings.set(MAGNIFICATION_KEY, 3);
    rig.settings.set(DIAMETER_KEY, 5000);
    activate(rig.api);
    expect(loupeStore().getState()).toMatchObject({ magnification: 2, diameter: 480 });
  });
});

describe("the shortcuts", () => {
  it("toggle the loupe in Develop with a photo open and in the Library, nowhere else", () => {
    press(TOGGLE_ACTION);
    expect(loupeStore().getState().on).toBe(true);
    press(TOGGLE_ACTION);
    rig.develop.setState({ photoId: null });
    press(TOGGLE_ACTION);
    expect(loupeStore().getState().on).toBe(false);
    rig.ui.setState({ activeModule: "library" });
    press(TOGGLE_ACTION);
    expect(loupeStore().getState().on).toBe(true);
    rig.ui.setState({ activeModule: "map" });
    press(TOGGLE_ACTION);
    expect(loupeStore().getState().on).toBe(true);
  });

  it("step the magnification while the loupe is on, saving it", () => {
    press(MORE_ACTION);
    expect(loupeStore().getState().magnification).toBe(2);
    press(TOGGLE_ACTION);
    press(MORE_ACTION);
    expect(loupeStore().getState().magnification).toBe(4);
    expect(rig.settings.get(MAGNIFICATION_KEY)).toBe(4);
    press(LESS_ACTION);
    press(LESS_ACTION);
    press(LESS_ACTION);
    expect(loupeStore().getState().magnification).toBe(1);
  });

  it("park the loupe where it is shown, and free it again", () => {
    press(TOGGLE_ACTION);
    press(PARK_ACTION);
    expect(loupeStore().getState().parked.develop).toBeNull();
    setShownAt("develop", { x: 40, y: 50 });
    press(PARK_ACTION);
    expect(loupeStore().getState().parked).toEqual({ develop: { x: 40, y: 50 }, library: null });
    press(PARK_ACTION);
    expect(loupeStore().getState().parked.develop).toBeNull();
  });
});

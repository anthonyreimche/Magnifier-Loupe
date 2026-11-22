// The Loupe buttons in the Develop status bar and the Library toolbar.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activate, deactivate } from "../src/index";
import { React } from "../src/rt";
import { loupeStore } from "../src/state";
import { DevelopLoupeButton, LibraryLoupeButton } from "../src/Toolbar";
import { fakeApi } from "./support/fake-api";

beforeEach(() => activate(fakeApi().api));
afterEach(() => {
  cleanup();
  deactivate();
});

const button = () => screen.getByRole("button", { name: "Toggle magnifier loupe" });

describe.each([
  ["Develop", DevelopLoupeButton],
  ["Library", LibraryLoupeButton],
])("the %s Loupe button", (_where, Button) => {
  it("turns the loupe on and off, and shows which", () => {
    render(<Button />);
    expect(button().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button());
    expect(loupeStore().getState().on).toBe(true);
    expect(button().getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button());
    expect(loupeStore().getState().on).toBe(false);
  });

  it("names its shortcuts and wheel gestures in its tooltip", () => {
    render(<Button />);
    const tip = button().title;
    expect(tip).toContain("Magnifier loupe (`)");
    expect(tip).toContain("Alt+wheel, Alt+= and Alt+-");
    expect(tip).toContain("Shift+wheel");
    expect(tip).toContain("(Shift+`)");
  });
});

it("draws the Library button as the Library toolbar's own buttons", () => {
  render(<LibraryLoupeButton />);
  expect(button().className).toBe("sl-library-toolbar-action");
});

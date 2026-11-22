// Magnifier Loupe, a Safelight extension (GPL-3.0-or-later).
//
// A round magnifier that follows the pointer over the Develop photo or the
// Library grid, at 100, 200, 400 or 800 %. In Develop it shows the edit at the
// photo's own pixels (DevelopLoupe.tsx); in the Library it enlarges the grid
// preview under it (LibraryLoupe.tsx). Registers the two loupes, their Loupe
// buttons (Toolbar.tsx) and the shortcuts.

import { DevelopLoupe } from "./DevelopLoupe";
import {
  DEVELOP_OVERLAY_SLOT,
  DEVELOP_TOOLBAR_SLOT,
  EXTENSION_ID,
  LESS_ACTION,
  LIBRARY_TOOLBAR_SLOT,
  MORE_ACTION,
  PARK_ACTION,
  TOGGLE_ACTION,
} from "./ids";
import { startPointer } from "./input";
import { LibraryLoupe } from "./LibraryLoupe";
import { React, initRuntime } from "./rt";
import type { SafelightAPI } from "./safelight";
import { initState, magnify, stopState, toggleLoupe, toggleParked } from "./state";
import { DevelopLoupeButton, LibraryLoupeButton } from "./Toolbar";

export { EXTENSION_ID };

// The Library's toolbar slot holds the button and, while the loupe is on,
// the loupe's own layer, portalled over the grid.
function LibraryToolbarItem() {
  return (
    <>
      <LibraryLoupeButton />
      <LibraryLoupe />
    </>
  );
}

// Null until activate() runs.
let activeHost: SafelightAPI | null = null;
let stopPointer: (() => void) | null = null;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  initState();
  stopPointer = startPointer();
  activeHost = host;
  host.registerSlot({ id: DEVELOP_OVERLAY_SLOT, slot: "develop-canvas-overlay", component: DevelopLoupe, order: 200 });
  host.registerSlot({ id: DEVELOP_TOOLBAR_SLOT, slot: "develop-toolbar", component: DevelopLoupeButton });
  host.registerSlot({ id: LIBRARY_TOOLBAR_SLOT, slot: "library-toolbar", component: LibraryToolbarItem });
  // Backtick, Aperture's loupe key; Ctrl+` is Terminal's.
  host.registerKeybinding({ id: TOGGLE_ACTION, label: "Magnifier loupe", category: "General", defaultCombo: "`", handler: toggleLoupe });
  host.registerKeybinding({ id: PARK_ACTION, label: "Park or free the loupe", category: "General", defaultCombo: "Shift+`", handler: toggleParked });
  host.registerKeybinding({ id: MORE_ACTION, label: "Loupe: more magnification", category: "General", defaultCombo: "Alt+=", handler: () => magnify(1) });
  host.registerKeybinding({ id: LESS_ACTION, label: "Loupe: less magnification", category: "General", defaultCombo: "Alt+-", handler: () => magnify(-1) });
}

export function deactivate(): void {
  if (!activeHost) return;
  activeHost = null;
  stopPointer?.();
  stopPointer = null;
  stopState();
}

// Whether the loupe is shown, at what magnification and size, and where it is
// parked. On or off is this window's alone, for the session; the magnification
// and size are saved as the extension's settings, so the loupe comes back as it
// was left. A parked loupe stays where it was put, one place per module.

import { DIAMETER_KEY, MAGNIFICATION_KEY } from "./ids";
import {
  DEFAULT_DIAMETER,
  DEFAULT_MAGNIFICATION,
  MAGNIFICATIONS,
  MAX_DIAMETER,
  MIN_DIAMETER,
  stepDiameter,
  stepMagnification,
  type Point,
} from "./model";
import { api } from "./rt";
import type { AppStore } from "./safelight";

export type LoupeModule = "develop" | "library";

export interface LoupeState {
  on: boolean;
  magnification: number;
  diameter: number;
  /** Where the loupe is parked in each module, in its view's layout pixels;
   *  null while it follows the pointer. */
  parked: Record<LoupeModule, Point | null>;
  toggle(): void;
  setParked(module: LoupeModule, at: Point | null): void;
  stepMagnification(direction: 1 | -1): void;
  stepDiameter(direction: 1 | -1): void;
}

let current: AppStore<LoupeState> | null = null;
let stopSettings: (() => void) | null = null;

// Where each module's loupe is shown now, if it is: parking puts it there.
const shownAt: Record<LoupeModule, Point | null> = { develop: null, library: null };

export function loupeStore(): AppStore<LoupeState> {
  if (!current) throw new Error("[magnifier-loupe] loupeStore() called before activate()");
  return current;
}

function savedMagnification(): number {
  const value = api.settings.get<number>(MAGNIFICATION_KEY, DEFAULT_MAGNIFICATION);
  return (MAGNIFICATIONS as readonly number[]).includes(value) ? value : DEFAULT_MAGNIFICATION;
}

function savedDiameter(): number {
  const value = api.settings.get<number>(DIAMETER_KEY, DEFAULT_DIAMETER);
  return Number.isFinite(value) ? Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, value)) : DEFAULT_DIAMETER;
}

export function initState(): void {
  shownAt.develop = null;
  shownAt.library = null;
  current = api.stores.create<LoupeState>((set, get) => ({
    on: false,
    magnification: savedMagnification(),
    diameter: savedDiameter(),
    parked: { develop: null, library: null },
    toggle: () => set({ on: !get().on }),
    setParked: (module, at) => set({ parked: { ...get().parked, [module]: at } }),
    stepMagnification: (direction) => api.settings.set(MAGNIFICATION_KEY, stepMagnification(get().magnification, direction)),
    stepDiameter: (direction) => api.settings.set(DIAMETER_KEY, stepDiameter(get().diameter, direction)),
  }));
  const store = current;
  // Settings are shared with the app's other windows: a change made in one
  // reaches the loupe in each.
  stopSettings = api.settings.onChange(() => store.setState({ magnification: savedMagnification(), diameter: savedDiameter() }));
}

export function stopState(): void {
  stopSettings?.();
  stopSettings = null;
  current = null;
}

/** The loupe's centre in `module` now, or null while it isn't shown there. */
export function setShownAt(module: LoupeModule, at: Point | null): void {
  shownAt[module] = at;
}

/** The module in front with something to magnify, or null: Develop with a
 *  photo open (a popped-out Develop window included), or the Library. */
export function activeModule(): LoupeModule | null {
  const detached = new URLSearchParams(window.location.search).get("detached");
  if (detached === "develop") return api.stores.useDevelopStore.getState().photoId ? "develop" : null;
  if (detached) return null;
  const module = api.stores.useUIStore.getState().activeModule;
  if (module === "library") return "library";
  if (module === "develop" && api.stores.useDevelopStore.getState().photoId) return "develop";
  return null;
}

/** Toggle the loupe, in Develop and the Library only. */
export function toggleLoupe(): void {
  if (activeModule()) loupeStore().getState().toggle();
}

/** Park the loupe where it is, or let a parked one follow the pointer again. */
export function toggleParked(): void {
  const module = activeModule();
  const state = loupeStore().getState();
  if (!module || !state.on) return;
  if (state.parked[module]) state.setParked(module, null);
  else if (shownAt[module]) state.setParked(module, shownAt[module]);
}

/** Step the magnification while the loupe is on. */
export function magnify(direction: 1 | -1): void {
  const state = loupeStore().getState();
  if (state.on && activeModule()) state.stepMagnification(direction);
}

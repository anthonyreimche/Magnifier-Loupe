// A stand-in Safelight API for unit tests, over real React and zustand. It has
// only what this extension uses: reading any other member throws, naming it,
// so a test shows what to add here when the extension starts using more.
//
// The develop and UI stores are zustand stores holding the fields the
// extension reads. useDevelopOverlay reads a store the test sets. captureRegion
// records each request and leaves it pending until the test answers it. The
// settings are a Map that tells its listeners of each write.

import * as React from "react";
import { createPortal } from "react-dom";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import type {
  CatalogPhoto,
  DevelopOverlayState,
  KeyActionContribution,
  RegionCapture,
  RegionRequest,
  SafelightAPI,
  SlotContribution,
  UITokens,
} from "../../src/safelight";
import { EXTENSION_ID } from "../../src/ids";

interface DevelopSlice {
  photoId: string | null;
  params: object;
  paramBag: Record<string, unknown>;
  previewParams: object | null;
  previewParamBag: Record<string, unknown> | null;
  histogram: object | null;
  sourceSize: object;
}
interface UiSlice {
  activeModule: string;
}
interface CatalogSlice {
  photos: CatalogPhoto[];
}

type Store<T> = UseBoundStore<StoreApi<T>>;

/** The members of SafelightAPI this fake implements, typed against the real thing. */
type FakeMembers = Pick<SafelightAPI, "version" | "extensionId" | "react" | "registerSlot" | "registerKeybinding"> & {
  settings: SafelightAPI["settings"];
  keybindings: Pick<SafelightAPI["keybindings"], "getBinding">;
  cursors: Pick<SafelightAPI["cursors"], "resolve">;
  ui: Pick<SafelightAPI["ui"], "tokens">;
  reactDom: SafelightAPI["reactDom"];
  develop: Pick<SafelightAPI["develop"], "useDevelopOverlay" | "captureRegion">;
  stores: {
    useDevelopStore: Store<DevelopSlice>;
    useUIStore: Store<UiSlice>;
    useCatalogStore: Store<CatalogSlice>;
    create: SafelightAPI["stores"]["create"];
  };
};

/** A captureRegion call the test answers. */
export interface Asked {
  request: RegionRequest;
  answer(capture: RegionCapture | null): Promise<void>;
}

export interface Rig {
  api: SafelightAPI;
  slots: SlotContribution[];
  keys: KeyActionContribution[];
  settings: Map<string, unknown>;
  develop: Store<DevelopSlice>;
  ui: Store<UiSlice>;
  catalog: Store<CatalogSlice>;
  overlay: Store<DevelopOverlayState>;
  /** Every captureRegion call, in order. */
  asked: Asked[];
}

const TOKENS = {
  textPrimary: "var(--color-text-primary)",
  textMuted: "var(--color-text-muted)",
  surface0: "var(--color-surface-0)",
  surface4: "var(--color-surface-4)",
} as Partial<UITokens> as UITokens;

export function fakeApi(): Rig {
  const slots: SlotContribution[] = [];
  const keys: KeyActionContribution[] = [];
  const asked: Asked[] = [];
  const settings = new Map<string, unknown>();
  const settingListeners = new Set<(key: string, value: unknown) => void>();

  const develop = create<DevelopSlice>()(() => ({
    photoId: "p1",
    params: {},
    paramBag: {},
    previewParams: null,
    previewParamBag: null,
    histogram: null,
    sourceSize: {},
  }));
  const ui = create<UiSlice>()(() => ({ activeModule: "develop" }));
  const catalog = create<CatalogSlice>()(() => ({ photos: [] }));
  const overlay = create<DevelopOverlayState>()(() => ({
    rect: null,
    imageRect: null,
    nonce: 0,
    toScreen: null,
    toImage: null,
    radiusToScreen: null,
    radiusToImage: null,
    region: null,
    imageAspect: 1.5,
    zoomScale: 1,
  }));

  const members: FakeMembers = {
    version: 1,
    extensionId: EXTENSION_ID,
    react: React,
    registerSlot: (c) => void slots.push(c),
    registerKeybinding: (c) => void keys.push(c),
    settings: {
      get: <T,>(key: string, fallback: T): T => (settings.has(key) ? (settings.get(key) as T) : fallback),
      set: (key, value) => {
        settings.set(key, value);
        for (const l of settingListeners) l(key, value);
      },
      onChange: (cb) => {
        settingListeners.add(cb);
        return () => void settingListeners.delete(cb);
      },
    },
    keybindings: { getBinding: (id) => keys.find((k) => k.id === id)?.defaultCombo ?? "" },
    cursors: { resolve: (token) => token },
    ui: { tokens: TOKENS },
    reactDom: { createPortal },
    develop: {
      useDevelopOverlay: () => overlay(),
      captureRegion: (request) =>
        new Promise<RegionCapture | null>((resolve) => {
          asked.push({
            request,
            answer: async (capture) => {
              resolve(capture);
              await Promise.resolve();
              await Promise.resolve();
            },
          });
        }),
    },
    stores: { useDevelopStore: develop, useUIStore: ui, useCatalogStore: catalog, create },
  };

  return {
    // The fake implements a typed subset; the strict proxy turns any other
    // member's read into a test failure that names it.
    api: strict(members, "api") as unknown as SafelightAPI,
    slots,
    keys,
    settings,
    develop,
    ui,
    catalog,
    overlay,
    asked,
  };
}

/** Wraps a plain object so reading a member it lacks throws, naming the member. */
function strict<T extends object>(target: T, path: string): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      if (typeof key === "symbol" || key === "then" || key === "toJSON") return Reflect.get(obj, key, receiver);
      if (!(key in obj)) throw new Error(`The fake API has no ${path}.${key}. Add it to test/support/fake-api.ts.`);
      const value: unknown = Reflect.get(obj, key, receiver);
      const isPlainObject = typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
      return isPlainObject && key !== "react" ? strict(value, `${path}.${key}`) : value;
    },
  });
}

/** A 2D context that records what is drawn. */
export interface Drawn {
  image: CanvasImageSource;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  smoothing: boolean;
}

/** Gives every canvas a recording 2D context (jsdom has none); returns the
 *  draws, newest last, the colour space each context was asked for, and the
 *  restore. */
export function recordCanvas(): { draws: Drawn[]; spaces: (PredefinedColorSpace | undefined)[]; restore(): void } {
  const draws: Drawn[] = [];
  const spaces: (PredefinedColorSpace | undefined)[] = [];
  const original = HTMLCanvasElement.prototype.getContext;
  const context = {
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number) {
      draws.push({ image, dx, dy, dw, dh, smoothing: context.imageSmoothingEnabled });
    },
  };
  HTMLCanvasElement.prototype.getContext = ((_kind: string, settings?: CanvasRenderingContext2DSettings) => {
    spaces.push(settings?.colorSpace);
    return context;
  }) as unknown as typeof original;
  return { draws, spaces, restore: () => void (HTMLCanvasElement.prototype.getContext = original) };
}

/** Lays an element out (jsdom lays nothing out): its on-screen box, and its
 *  layout width, which differs from the box's under an interface scale. */
export function layOut(el: Element, box: { left: number; top: number; width: number; height: number }, offsetWidth = box.width): void {
  el.getBoundingClientRect = () =>
    ({ ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height, toJSON: () => box }) as DOMRect;
  Object.defineProperty(el, "offsetWidth", { configurable: true, value: offsetWidth });
}

/** Runs the animation frames queued so far. */
export function flushFrames(): void {
  const queued = [...frames.values()];
  frames.clear();
  for (const cb of queued) cb(performance.now());
}

const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
globalThis.requestAnimationFrame = (cb) => {
  frames.set(nextFrame, cb);
  return nextFrame++;
};
globalThis.cancelAnimationFrame = (id) => void frames.delete(id);

/** A bitmap stand-in that records being closed. */
export function bitmap(width: number, height: number): ImageBitmap & { closed: boolean } {
  const b = { width, height, closed: false, close: () => void (b.closed = true) };
  return b as ImageBitmap & { closed: boolean };
}

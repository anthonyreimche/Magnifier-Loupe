// The pointer and wheel as the loupe reads them: from the window, in the
// capture phase and passively for the pointer, so nothing under the loupe
// loses an event to it. Only the loupe's own wheel gestures (Alt and Shift)
// are taken, and only while the loupe is shown where the wheel rolls.

import { wheelGesture, wheelStepper, type Point } from "./model";
import { api } from "./rt";
import { loupeStore } from "./state";

/** What a window pointer event says: its client point, or null when it is
 *  over something drawn above the photo (a floating panel, a menu, a dialogue),
 *  where the loupe hides. */
export function pointerOver(e: PointerEvent): Point | null {
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest(".sl-floating-panel, [role='dialog'], [role='menu'], [role='listbox']")) return null;
  return { x: e.clientX, y: e.clientY };
}

/** The interface scale (CSS zoom) an element is drawn at: its on-screen width
 *  over its layout width, which framePoint measures along the element's top
 *  edge. */
export function uiZoomOf(el: HTMLElement): number {
  const box = el.getBoundingClientRect();
  const layoutWidth = api.develop.framePoint(el, box.right, box.top).x - api.develop.framePoint(el, box.left, box.top).x;
  return box.width > 0 && layoutWidth > 0 ? box.width / layoutWidth : 1;
}

// Where the pointer is, kept while the extension runs, so a loupe turned on
// with a key shows at once where the pointer already rests.
let lastPointer: Point | null = null;
const listeners = new Set<(client: Point | null) => void>();

function tell(client: Point | null): void {
  lastPointer = client;
  for (const listener of listeners) listener(client);
}
const onMove = (e: PointerEvent) => tell(pointerOver(e));
const onLeave = (e: MouseEvent) => {
  if (!e.relatedTarget) tell(null);
};
const onBlur = () => tell(null);

/** Follows the pointer on the window until the returned stop is called. */
export function startPointer(): () => void {
  window.addEventListener("pointermove", onMove, { capture: true, passive: true });
  window.addEventListener("pointerdown", onMove, { capture: true, passive: true });
  document.addEventListener("mouseout", onLeave, true);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerdown", onMove, true);
    document.removeEventListener("mouseout", onLeave, true);
    window.removeEventListener("blur", onBlur);
    lastPointer = null;
    listeners.clear();
  };
}

/** Calls `move` with the pointer's client point now and at each move (null
 *  over something above the photo, or once it leaves the window), until the
 *  returned stop is called. */
export function watchPointer(move: (client: Point | null) => void): () => void {
  listeners.add(move);
  move(lastPointer);
  return () => void listeners.delete(move);
}

/** Takes Alt+wheel (magnification) and Shift+wheel (size) while `takes` says
 *  the wheel is over the loupe; every other roll passes on untouched. */
export function watchWheel(takes: (client: Point) => boolean): () => void {
  const step = wheelStepper();
  const onWheel = (e: WheelEvent) => {
    const gesture = wheelGesture(e);
    if (!gesture || !takes({ x: e.clientX, y: e.clientY })) return;
    e.preventDefault();
    e.stopPropagation();
    const direction = step(e, e.timeStamp);
    if (direction === 0) return;
    const state = loupeStore().getState();
    if (gesture === "magnification") state.stepMagnification(direction);
    else state.stepDiameter(direction);
  };
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  return () => window.removeEventListener("wheel", onWheel, true);
}

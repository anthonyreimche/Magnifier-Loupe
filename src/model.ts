// The loupe's arithmetic, free of the DOM: its magnification and size steps,
// the wheel gestures it answers, the patch it asks Develop to draw, and where
// a picture lands in it.
//
// Magnification counts as Develop's zoom does: at 100 % one source pixel spans
// 1 / devicePixelRatio layout pixels, so 100 % in the loupe is 100 % in
// Develop. The loupe's canvas is drawn at the screen's own pixels (the device
// pixel ratio times the interface scale), so a source pixel covers
// magnification × interface scale of them.

export const MAGNIFICATIONS = [1, 2, 4, 8] as const;
export const DEFAULT_MAGNIFICATION = 2;

export const MIN_DIAMETER = 120;
export const MAX_DIAMETER = 480;
export const DIAMETER_STEP = 40;
export const DEFAULT_DIAMETER = 240;

// A patch this much wider than the loupe still covers it while the pointer
// moves on and the next patch is drawn.
const PATCH_MARGIN = 1.5;

/** The largest patch edge Develop draws (captureRegion), in frame pixels. */
export const MAX_PATCH = 1024;

export interface Point {
  x: number;
  y: number;
}

/** A rectangle as useDevelopOverlay gives one. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A picture's pixels from `x`, `y`, in its source's pixels. */
export interface SourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where a picture is drawn in the loupe's canvas, in its pixels. */
export interface Placement {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

function nearestStop(value: number): number {
  if (!Number.isFinite(value)) return 0;
  let best = 0;
  for (let i = 1; i < MAGNIFICATIONS.length; i++) {
    if (Math.abs(MAGNIFICATIONS[i] - value) < Math.abs(MAGNIFICATIONS[best] - value)) best = i;
  }
  return best;
}

/** The next magnification up (`direction` 1) or down (-1), held at the ends. */
export function stepMagnification(current: number, direction: 1 | -1): number {
  const index = Math.min(MAGNIFICATIONS.length - 1, Math.max(0, nearestStop(current) + direction));
  return MAGNIFICATIONS[index];
}

export const magnificationLabel = (magnification: number): string => `${Math.round(magnification * 100)}%`;

/** The next size up or down, in layout pixels, held between the ends. */
export function stepDiameter(current: number, direction: 1 | -1): number {
  const from = Number.isFinite(current) ? current : DEFAULT_DIAMETER;
  return Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, from + direction * DIAMETER_STEP));
}

type WheelKeys = Pick<WheelEvent, "altKey" | "shiftKey" | "ctrlKey" | "metaKey">;

/** What a wheel roll with these keys held changes: Alt alone the
 *  magnification, Shift alone the size. Ctrl and Cmd stay the canvas's zoom,
 *  and a plain roll scrolls or zooms as it always does. */
export function wheelGesture(e: WheelKeys): "magnification" | "diameter" | null {
  if (e.ctrlKey || e.metaKey || e.altKey === e.shiftKey) return null;
  return e.altKey ? "magnification" : "diameter";
}

/** The edge, in source pixels, of the square patch a loupe of `diameter`
 *  layout pixels asks for at `magnification`. */
export function patchSize(diameter: number, magnification: number, dpr: number): number {
  return Math.min(MAX_PATCH, Math.ceil(((diameter * dpr) / magnification) * PATCH_MARGIN));
}

/** The diameter a loupe over Develop can be at `magnification`: no wider than
 *  one patch can fill, less a pixel either side for its rounding, so a high
 *  density screen at 100 % doesn't ask for more than Develop draws. */
export function lensDiameter(diameter: number, magnification: number, dpr: number): number {
  return Math.min(diameter, Math.floor(((MAX_PATCH - 2) * magnification) / dpr));
}

/** Backing pixels a source pixel spans: the magnification times the interface scale. */
export const sourceScale = (magnification: number, uiZoom: number): number => magnification * uiZoom;

/** Where `source` is drawn so that source point `centre` sits at the middle
 *  of a canvas `canvasSize` backing pixels square, `scale` backing pixels a
 *  source pixel. */
export function placement(source: SourceRect, centre: Point, scale: number, canvasSize: number): Placement {
  const middle = canvasSize / 2;
  return {
    dx: middle + (source.x - centre.x) * scale,
    dy: middle + (source.y - centre.y) * scale,
    dw: source.width * scale,
    dh: source.height * scale,
  };
}

/** A client point in an element's layout pixels: client coordinates are on
 *  screen, so under the interface scale (CSS zoom) they are divided by it,
 *  which the element's own visual width over its layout width measures. */
export function layoutPoint(client: Point, rect: Pick<DOMRect, "left" | "top" | "width">, offsetWidth: number): Point {
  const ratio = rect.width > 0 ? offsetWidth / rect.width : 1;
  return { x: (client.x - rect.left) * ratio, y: (client.y - rect.top) * ratio };
}

/** The pixel of a `naturalWidth` × `naturalHeight` picture under client point
 *  `client`, the picture contained (object-fit: contain) in `box`; null in the
 *  box's margins or for a picture with no pixels. */
export function containedPoint(
  box: Pick<DOMRect, "left" | "top" | "width" | "height">,
  naturalWidth: number,
  naturalHeight: number,
  client: Point,
): Point | null {
  if (naturalWidth <= 0 || naturalHeight <= 0 || box.width <= 0 || box.height <= 0) return null;
  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const left = box.left + (box.width - naturalWidth * scale) / 2;
  const top = box.top + (box.height - naturalHeight * scale) / 2;
  const x = (client.x - left) / scale;
  const y = (client.y - top) / scale;
  if (x < 0 || y < 0 || x > naturalWidth || y > naturalHeight) return null;
  return { x, y };
}

/** Whether `point` is in `rect`: its left and top edges in, its right and bottom out. */
export const inside = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.w && point.y < rect.y + rect.h;

/** What the loupe shows of a frame: `span` frame pixels across, centred on
 *  `centre`, in a frame `frameWidth` × `frameHeight`. */
export interface FrameView {
  centre: Point;
  span: number;
  frameWidth: number;
  frameHeight: number;
}

/** Whether a patch at `rect` holds every frame pixel the loupe shows: the
 *  view's square, as far as it lies inside the frame. */
export function covers(rect: SourceRect, view: FrameView): boolean {
  const half = view.span / 2;
  const x0 = Math.max(0, view.centre.x - half);
  const y0 = Math.max(0, view.centre.y - half);
  const x1 = Math.min(view.frameWidth, view.centre.x + half);
  const y1 = Math.min(view.frameHeight, view.centre.y + half);
  return rect.x <= x0 && rect.y <= y0 && rect.x + rect.width >= x1 && rect.y + rect.height >= y1;
}

// A mouse notch rolls about 100 px; a trackpad sends many small deltas, which
// add up to a step, and a pause forgets what was gathered. Shift turns the
// wheel horizontal on Windows, so the larger of the two deltas counts.
const WHEEL_NOTCH = 50;
const WHEEL_PAUSE_MS = 250;

/** Turns wheel rolls into steps: 1 up, -1 down, 0 until a notch's worth is in. */
export function wheelStepper(): (e: Pick<WheelEvent, "deltaX" | "deltaY">, now: number) => 1 | -1 | 0 {
  let gathered = 0;
  let last = -Infinity;
  return (e, now) => {
    if (now - last > WHEEL_PAUSE_MS) gathered = 0;
    last = now;
    gathered += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(gathered) < WHEEL_NOTCH) return 0;
    const step = gathered < 0 ? 1 : -1;
    gathered = 0;
    return step;
  };
}

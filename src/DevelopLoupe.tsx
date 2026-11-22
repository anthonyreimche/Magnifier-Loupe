// The loupe over the Develop canvas. It asks Develop for the patch of the
// frame under it at the frame's own pixels (api.develop.captureRegion), so it
// shows the edit at true pixel scale whatever the view's zoom, never an
// enlargement of the fitted canvas. One patch is asked for at a time, half as
// wide again as the loupe: while the pointer moves within it, the loupe is
// painted at once from the patch it holds, and the next patch is asked for
// only when that one no longer covers it, or the edit or the view changed,
// never twice for the same place. The loupe is held to what one patch can
// fill, so a dense screen at 100 % doesn't keep asking for more than Develop
// draws.

import { uiZoomOf, watchPointer, watchWheel } from "./input";
import { Lens, paintLens, placeLens } from "./Lens";
import { covers, inside, layoutPoint, lensDiameter, patchSize, type Point, type Rect } from "./model";
import { React, api } from "./rt";
import type { RegionCapture } from "./safelight";
import { loupeStore, setShownAt } from "./state";

export function DevelopLoupe() {
  const on = loupeStore()((s) => s.on);
  return on ? <DevelopLens /> : null;
}

/** What the loupe draws from, read fresh at each frame. */
interface View {
  rect: Rect | null;
  imageRect: Rect | null;
  diameter: number;
  magnification: number;
  /** Device pixels a frame pixel spans at Develop's 100 %. */
  zoomScale: number;
  parkedAt: Point | null;
}

function DevelopLens() {
  const store = loupeStore();
  const magnification = store((s) => s.magnification);
  const chosenDiameter = store((s) => s.diameter);
  const parkedAt = store((s) => s.parked.develop);
  const setParked = store((s) => s.setParked);
  const { rect, imageRect, nonce, region, zoomScale } = api.develop.useDevelopOverlay();
  const regionKey = region ? `${region.x} ${region.y} ${region.width} ${region.height}` : "";
  const diameter = lensDiameter(chosenDiameter, magnification * zoomScale, window.devicePixelRatio || 1);
  const [colorSpace, setColorSpace] = React.useState<PredefinedColorSpace>("srgb");

  const root = React.useRef<HTMLDivElement>(null);
  const lens = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const view = React.useRef<View>({ rect, imageRect, diameter, magnification, zoomScale, parkedAt });
  view.current = { rect, imageRect, diameter, magnification, zoomScale, parkedAt };
  const [loupe] = React.useState(() => developLoupe(() => view.current, setColorSpace));

  React.useEffect(() => {
    const el = root.current;
    const lensEl = lens.current;
    if (!el || !lensEl) return;
    return loupe.start(el, lensEl, canvas);
  }, [loupe]);

  // A canvas for the patch's colour space is a new canvas, painted at once.
  React.useEffect(() => loupe.changed(), [loupe, colorSpace]);

  React.useEffect(() => loupe.stale(), [loupe, regionKey]);
  React.useEffect(() => loupe.changed(), [loupe, nonce, rect, imageRect, diameter, magnification, zoomScale, parkedAt]);

  const onDrag = (by: Point) => {
    const at = view.current.parkedAt;
    if (at) setParked("develop", { x: at.x + by.x, y: at.y + by.y });
  };

  return (
    <div ref={root} data-loupe-root="" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <Lens
        diameter={diameter}
        magnification={magnification}
        parked={!!parkedAt}
        colorSpace={colorSpace}
        lensRef={lens}
        canvasRef={canvas}
        onDrag={onDrag}
      />
    </div>
  );
}

/** The Develop loupe's pointer, patches and painting, outside React. */
function developLoupe(read: () => View, showSpace: (space: PredefinedColorSpace) => void) {
  let elements: { root: HTMLDivElement; lens: HTMLDivElement; canvas: React.RefObject<HTMLCanvasElement | null> } | null = null;
  let pointer: Point | null = null;
  let held: RegionCapture | null = null;
  // Bumped by each edit and each change of the region the frame covers: a
  // patch drawn before is stale.
  let epoch = 0;
  let heldEpoch = -1;
  // The epoch Develop last had no patch for over the frame (no photo, no float
  // targets): asked again only once something changes.
  let refusedEpoch = -1;
  // The last patch asked for: the same is never asked for twice.
  let lastAsk = "";
  let asking = false;
  let frame = 0;

  const centre = (): Point | null => {
    const v = read();
    if (v.parkedAt) return v.parkedAt;
    return pointer && v.rect && inside(pointer, v.rect) ? pointer : null;
  };

  // A layout point as 0 to 1 across the frame.
  const onFrame = (at: Point): Point | null => {
    const ir = read().imageRect;
    return ir && ir.w > 0 && ir.h > 0 ? { x: (at.x - ir.x) / ir.w, y: (at.y - ir.y) / ir.h } : null;
  };

  function paint(): void {
    frame = 0;
    if (!elements) return;
    const v = read();
    const at = centre();
    setShownAt("develop", at);
    placeLens(elements.lens, at, v.diameter);
    if (!at) return;
    const uv = onFrame(at);
    const dpr = window.devicePixelRatio || 1;
    const lensView = { diameter: v.diameter, zoom: v.magnification * v.zoomScale, uiZoom: uiZoomOf(elements.root), dpr };
    const picture =
      held && uv
        ? {
            image: held.bitmap,
            rect: held.rect,
            centre: { x: uv.x * held.frameWidth, y: uv.y * held.frameHeight },
            colorSpace: held.colorSpace,
          }
        : null;
    const canvas = elements.canvas.current;
    if (canvas) paintLens(canvas, lensView, picture, picture?.colorSpace);
    if (uv) ask(uv, dpr);
  }

  function ask(uv: Point, dpr: number): void {
    // Undefined before Safelight 3.2.7.
    const captureRegion = api.develop.captureRegion;
    if (!captureRegion || asking || (!held && refusedEpoch === epoch)) return;
    const v = read();
    if (held && heldEpoch === epoch) {
      const span = (v.diameter * dpr) / (v.magnification * v.zoomScale);
      const view = {
        centre: { x: uv.x * held.frameWidth, y: uv.y * held.frameHeight },
        span,
        frameWidth: held.frameWidth,
        frameHeight: held.frameHeight,
      };
      if (covers(held.rect, view)) return;
    }
    const size = patchSize(v.diameter, v.magnification * v.zoomScale, dpr);
    const key = `${epoch} ${size} ${uv.x} ${uv.y}`;
    if (key === lastAsk) return;
    lastAsk = key;
    const askedEpoch = epoch;
    const overFrame = uv.x >= 0 && uv.x <= 1 && uv.y >= 0 && uv.y <= 1;
    asking = true;
    captureRegion({ x: uv.x, y: uv.y, width: size, height: size })
      .then(
        (patch) => {
          if (!elements) {
            patch?.bitmap.close();
            return;
          }
          held?.bitmap.close();
          held = patch;
          heldEpoch = askedEpoch;
          if (!patch && overFrame) refusedEpoch = askedEpoch;
          if (patch) showSpace(patch.colorSpace);
        },
        (err: unknown) => console.warn("[magnifier-loupe] couldn't draw the patch:", err),
      )
      .finally(() => {
        asking = false;
        schedule();
      });
  }

  function schedule(): void {
    if (!frame && elements) frame = requestAnimationFrame(paint);
  }

  function moved(client: Point | null): void {
    if (!elements) return;
    pointer = client && layoutPoint(client, elements.root.getBoundingClientRect(), elements.root.offsetWidth);
    schedule();
  }

  // The wheel is over the loupe while it is shown following the pointer, or,
  // parked, inside its ring.
  function takesWheel(client: Point): boolean {
    if (!elements) return false;
    const v = read();
    if (!v.parkedAt) return !!centre();
    const at = layoutPoint(client, elements.root.getBoundingClientRect(), elements.root.offsetWidth);
    return Math.hypot(at.x - v.parkedAt.x, at.y - v.parkedAt.y) <= v.diameter / 2;
  }

  return {
    start(root: HTMLDivElement, lens: HTMLDivElement, canvas: React.RefObject<HTMLCanvasElement | null>): () => void {
      elements = { root, lens, canvas };
      const stops = [
        watchPointer(moved),
        watchWheel(takesWheel),
        // Each edit, a photo opening and every frame the view draws (the
        // histogram follows each) can change the pixels under the loupe.
        api.stores.useDevelopStore.subscribe((s, prev) => {
          if (s.photoId !== prev.photoId) {
            held?.bitmap.close();
            held = null;
          }
          if (
            s.photoId !== prev.photoId ||
            s.params !== prev.params ||
            s.paramBag !== prev.paramBag ||
            s.previewParams !== prev.previewParams ||
            s.previewParamBag !== prev.previewParamBag ||
            s.histogram !== prev.histogram ||
            s.sourceSize !== prev.sourceSize
          ) {
            epoch++;
            schedule();
          }
        }),
      ];
      schedule();
      return () => {
        for (const stop of stops) stop();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        elements = null;
        held?.bitmap.close();
        held = null;
        setShownAt("develop", null);
      };
    },
    /** The view moved, or the loupe's size, magnification or place changed:
     *  painted again, and a patch asked for if the held one doesn't cover it. */
    changed(): void {
      schedule();
    },
    /** The frame covers another region (crop mode): the held patch is stale. */
    stale(): void {
      epoch++;
      schedule();
    },
  };
}

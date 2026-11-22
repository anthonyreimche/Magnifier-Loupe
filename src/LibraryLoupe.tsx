// The loupe over the Library: it enlarges the grid preview of the photo under
// it, the picture the cell already holds, so it shows at once and never
// decodes a photo. Its magnification counts the preview's own pixels, as
// Develop's counts the photo's. Drawn above the grid in a layer of its own that
// takes no pointer events, but for a parked loupe's ring.

import { uiZoomOf, watchPointer, watchWheel } from "./input";
import { Lens, paintLens, placeLens, type Picture } from "./Lens";
import { containedPoint, layoutPoint, type Point } from "./model";
import { React, api } from "./rt";
import { loupeStore, setShownAt } from "./state";

export function LibraryLoupe() {
  const on = loupeStore()((s) => s.on);
  const inLibrary = api.stores.useUIStore((s) => s.activeModule === "library");
  return on && inLibrary ? api.reactDom.createPortal(<LibraryLens />, document.body) : null;
}

interface View {
  diameter: number;
  magnification: number;
  parkedAt: Point | null;
}

function LibraryLens() {
  const store = loupeStore();
  const magnification = store((s) => s.magnification);
  const diameter = store((s) => s.diameter);
  const parkedAt = store((s) => s.parked.library);
  const setParked = store((s) => s.setParked);

  const root = React.useRef<HTMLDivElement>(null);
  const lens = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const view = React.useRef<View>({ diameter, magnification, parkedAt });
  view.current = { diameter, magnification, parkedAt };
  const [loupe] = React.useState(() => libraryLoupe(() => view.current));

  React.useEffect(() => {
    const el = root.current;
    const lensEl = lens.current;
    const canvasEl = canvas.current;
    if (!el || !lensEl || !canvasEl) return;
    return loupe.start(el, lensEl, canvasEl);
  }, [loupe]);

  React.useEffect(() => loupe.changed(), [loupe, diameter, magnification, parkedAt]);

  const onDrag = (by: Point) => {
    const at = view.current.parkedAt;
    if (at) setParked("library", { x: at.x + by.x, y: at.y + by.y });
  };

  return (
    <div
      ref={root}
      data-loupe-root=""
      style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none", overflow: "hidden" }}
    >
      <Lens
        diameter={diameter}
        magnification={magnification}
        parked={!!parkedAt}
        lensRef={lens}
        canvasRef={canvas}
        onDrag={onDrag}
      />
    </div>
  );
}

/** The grid preview under a client point, and the preview pixel there; null
 *  off a photo, in a cell's margin or before its preview has loaded. */
export function previewAt(client: Point): Picture | null {
  const hit = document.elementFromPoint?.(client.x, client.y);
  const img = hit?.closest("[data-photo-id]")?.querySelector("img");
  if (!img || !img.complete || img.naturalWidth <= 0) return null;
  const centre = containedPoint(img.getBoundingClientRect(), img.naturalWidth, img.naturalHeight, client);
  return centre && { image: img, rect: { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }, centre, colorSpace: "srgb" };
}

/** The Library loupe's pointer and painting, outside React. */
function libraryLoupe(read: () => View) {
  let elements: { root: HTMLDivElement; lens: HTMLDivElement; canvas: HTMLCanvasElement } | null = null;
  // In client coordinates, which the grid's cells are measured in.
  let pointer: Point | null = null;
  let frame = 0;

  const toLayout = (root: HTMLDivElement, client: Point) =>
    layoutPoint(client, root.getBoundingClientRect(), root.offsetWidth);
  const toClient = (root: HTMLDivElement, at: Point): Point => {
    const box = root.getBoundingClientRect();
    const zoom = uiZoomOf(root);
    return { x: box.left + at.x * zoom, y: box.top + at.y * zoom };
  };

  function paint(): void {
    frame = 0;
    if (!elements) return;
    const { root } = elements;
    const v = read();
    const client = v.parkedAt ? toClient(root, v.parkedAt) : pointer;
    const picture = client && previewAt(client);
    // A parked loupe stays put, empty over anything but a photo; a following
    // one shows only over a photo.
    const at = v.parkedAt ?? (picture && client ? toLayout(root, client) : null);
    setShownAt("library", at);
    placeLens(elements.lens, at, v.diameter);
    if (!at) return;
    const lensView = {
      diameter: v.diameter,
      zoom: v.magnification,
      uiZoom: uiZoomOf(root),
      dpr: window.devicePixelRatio || 1,
    };
    paintLens(elements.canvas, lensView, picture ?? null);
  }

  function schedule(): void {
    if (!frame && elements) frame = requestAnimationFrame(paint);
  }

  function takesWheel(client: Point): boolean {
    if (!elements) return false;
    const v = read();
    if (!v.parkedAt) return !!previewAt(client);
    const at = toLayout(elements.root, client);
    return Math.hypot(at.x - v.parkedAt.x, at.y - v.parkedAt.y) <= v.diameter / 2;
  }

  return {
    start(root: HTMLDivElement, lens: HTMLDivElement, canvas: HTMLCanvasElement): () => void {
      elements = { root, lens, canvas };
      const onScroll = () => schedule();
      const stops = [
        watchPointer((client) => {
          pointer = client;
          schedule();
        }),
        watchWheel(takesWheel),
        // Scrolling moves the grid under a loupe that stays put; a preview landing
        // or the grid redrawing changes what is under it.
        api.stores.useCatalogStore.subscribe((s, prev) => {
          if (s.photos !== prev.photos) schedule();
        }),
        () => window.removeEventListener("scroll", onScroll, true),
        () => document.removeEventListener("load", onScroll, true),
      ];
      window.addEventListener("scroll", onScroll, { capture: true, passive: true });
      // A preview loading under the pointer; load doesn't bubble, so it is caught on the way down.
      document.addEventListener("load", onScroll, true);
      schedule();
      return () => {
        for (const stop of stops) stop();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        elements = null;
        setShownAt("library", null);
      };
    },
    changed(): void {
      schedule();
    },
  };
}

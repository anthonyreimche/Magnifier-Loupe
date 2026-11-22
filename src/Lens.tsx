// The loupe itself: a round canvas with a thin ring and its magnification.
// Its parent places it and paints it each frame, straight into the DOM, so a
// pointer move never waits on a React render. It takes no pointer events,
// except on the ring of a parked loupe, which drags it.

import { magnificationLabel, placement, sourceScale, type Point, type SourceRect } from "./model";
import { React, api } from "./rt";

/** What is magnified: `image` covers `rect` of its source, and `centre` (in
 *  the source's pixels) goes to the middle of the loupe. `colorSpace` is what
 *  the image is encoded for. */
export interface Picture {
  image: CanvasImageSource;
  rect: SourceRect;
  centre: Point;
  colorSpace: PredefinedColorSpace;
}

export interface LensView {
  diameter: number;
  /** How far a source pixel is enlarged: the loupe's magnification, times the
   *  photo pixels a source pixel stands for at Develop's 100 %. */
  zoom: number;
  /** The interface scale: the view's on-screen width over its layout width. */
  uiZoom: number;
  dpr: number;
}

/** Paints `picture` into the loupe's canvas, at the screen's own pixels, or
 *  clears it for none. Drawn square-pixelled from twice its size up, so the
 *  photo's own pixels show at 400 and 800 %. A canvas's colour space is fixed
 *  by its first context, so the Lens draws a canvas for each (`colorSpace`). */
export function paintLens(
  canvas: HTMLCanvasElement,
  view: LensView,
  picture: Picture | null,
  colorSpace: PredefinedColorSpace = "srgb",
): void {
  const size = Math.max(1, Math.round(view.diameter * view.dpr * view.uiZoom));
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;
  const ctx = canvas.getContext("2d", { colorSpace });
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  if (!picture) return;
  const scale = sourceScale(view.zoom, view.uiZoom);
  ctx.imageSmoothingEnabled = scale < 2;
  const { dx, dy, dw, dh } = placement(picture.rect, picture.centre, scale, size);
  ctx.drawImage(picture.image, dx, dy, dw, dh);
}

/** Shows the loupe centred on `centre` (layout pixels of its parent), or hides it. */
export function placeLens(lens: HTMLElement, centre: Point | null, diameter: number): void {
  if (!centre) {
    lens.style.display = "none";
    return;
  }
  lens.style.display = "block";
  lens.style.transform = `translate(${centre.x - diameter / 2}px, ${centre.y - diameter / 2}px)`;
}

interface LensProps {
  diameter: number;
  magnification: number;
  parked: boolean;
  /** The colour space its canvas is opened in. */
  colorSpace?: PredefinedColorSpace;
  lensRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Moves a parked loupe by this much, in layout pixels, as its ring is dragged. */
  onDrag(by: Point): void;
}

// Light over dark, so the ring reads on any photo.
const RING_DARK = "rgba(0, 0, 0, 0.55)";
const RING_LIGHT = "rgba(255, 255, 255, 0.9)";
// How far either side of the ring a parked loupe can be taken hold of.
const GRIP = 6;

export function Lens(props: LensProps) {
  const { diameter, magnification, parked, onDrag } = props;
  const { tokens } = api.ui;
  const radius = diameter / 2;
  const drag = React.useRef<{ id: number; x: number; y: number; ratio: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const ring = e.currentTarget;
    ring.setPointerCapture?.(e.pointerId);
    const box = ring.ownerSVGElement?.getBoundingClientRect();
    const ratio = box && box.width > 0 ? diameter / box.width : 1;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ratio };
  };
  const onPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    const held = drag.current;
    if (!held || held.id !== e.pointerId) return;
    onDrag({ x: (e.clientX - held.x) * held.ratio, y: (e.clientY - held.y) * held.ratio });
    held.x = e.clientX;
    held.y = e.clientY;
  };
  const release = (e: React.PointerEvent<SVGCircleElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={props.lensRef}
      data-loupe-lens=""
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: diameter,
        height: diameter,
        display: "none",
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      <canvas
        key={props.colorSpace ?? "srgb"}
        ref={props.canvasRef}
        style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: tokens.surface0 }}
      />
      <svg
        width={diameter}
        height={diameter}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
      >
        <circle cx={radius} cy={radius} r={radius} fill="none" stroke={RING_DARK} strokeWidth={3} />
        <circle cx={radius} cy={radius} r={radius} fill="none" stroke={RING_LIGHT} strokeWidth={1} />
        {parked && (
          <circle
            data-loupe-grip=""
            cx={radius}
            cy={radius}
            r={radius}
            fill="none"
            stroke="transparent"
            strokeWidth={GRIP * 2}
            style={{ pointerEvents: "stroke", cursor: api.cursors.resolve("pan") }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <title>Drag to move the loupe</title>
          </circle>
        )}
      </svg>
      <span
        style={{
          position: "absolute",
          left: "50%",
          bottom: 8,
          transform: "translateX(-50%)",
          padding: "1px 5px",
          borderRadius: 3,
          fontSize: 10,
          lineHeight: "14px",
          background: RING_DARK,
          color: RING_LIGHT,
          whiteSpace: "nowrap",
        }}
      >
        {magnificationLabel(magnification)}
      </span>
    </div>
  );
}

import type { MarkerStyle } from "./markerStyle";

/** Canvas units at 100 percent zoom */
export const SHAPE_SIZE = 12;
export const DOT_STROKE = 2;
export const RING_STROKE = 3;
/** Clear space between the shape's corner and the corner of the layer it points at */
export const SHAPE_GAP = 2;

/** The muted red the plugin already uses for warnings, Figma does not expose its category colours */
export const SHAPE_COLOR = { r: 0.659, g: 0.278, b: 0.122 };
export const SHAPE_STROKE_WHITE = { r: 1, g: 1, b: 1 };

export const CONTAINER_NAME = "Avene markers (temporary)";

export interface TargetBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeGeometry {
  x: number;
  y: number;
  size: number;
  strokeWeight: number;
  filled: boolean;
}

/** Figma's zoom runs from 2 percent to 25600 percent, anything else is read as 100 percent */
function usableZoom(zoom: number): number {
  return Number.isFinite(zoom) && zoom >= 0.02 && zoom <= 256 ? zoom : 1;
}

/**
 * Where and how big a dot or ring is, just outside the top left corner of the layer it marks
 * Sized by the zoom when written so it reads about the same on screen, it is not resized afterwards
 */
export function shapeGeometry(
  style: Exclude<MarkerStyle, "annotation">,
  box: TargetBox,
  zoom: number
): ShapeGeometry {
  const scale = 1 / usableZoom(zoom);
  const size = SHAPE_SIZE * scale;
  return {
    x: box.x - size - SHAPE_GAP * scale,
    y: box.y - size - SHAPE_GAP * scale,
    size,
    strokeWeight: (style === "dot" ? DOT_STROKE : RING_STROKE) * scale,
    filled: style === "dot"
  };
}

/** How often the zoom is looked at, Figma has no event for it in a design file */
export const ZOOM_POLL_MS = 120;

/** A zoom change smaller than this is not worth redrawing for */
export const ZOOM_CHANGE_RATIO = 0.02;

/** Whether the zoom has moved enough since it was last used to size the shapes */
export function zoomChanged(previous: number, next: number): boolean {
  if (!(previous > 0) || !(next > 0) || !Number.isFinite(previous) || !Number.isFinite(next)) {
    return true;
  }
  return Math.abs(next - previous) / previous >= ZOOM_CHANGE_RATIO;
}

/**
 * Figma stores numbers as 32 bit floats, so a size written and read back differs in the last
 * digits, and comparing exactly would rewrite a shape that is already right on every pass
 */
export function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-5);
}

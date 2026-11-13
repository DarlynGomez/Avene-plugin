import type { Severity } from "../issues/issueTypes";
import type { MarkerStyle } from "./markerStyle";

/** Canvas units at 100 percent zoom */
export const SHAPE_SIZE = 18;
/** A thin outline, enough to set the fill off from any background without eating into a small shape */
export const DOT_STROKE = 1;
export const RING_STROKE = 2;
/** Clear space between the shape's corner and the corner of the layer it points at */
export const SHAPE_GAP = 2;

/** The muted red the plugin already uses for warnings, Figma does not expose its category colours */
export const SHAPE_COLOR = { r: 0.659, g: 0.278, b: 0.122 };
/** A deferred marker stays on the canvas in a muted gray, its white outline keeps it visible on any background */
export const SHAPE_COLOR_DEFERRED = { r: 0.43, g: 0.43, b: 0.43 };
export const SHAPE_STROKE_WHITE = { r: 1, g: 1, b: 1 };

export const CONTAINER_NAME = "Avene markers (temporary)";

/** What kind of marker a root gets, a failing one, an important failing one, or a deferred one */
export type MarkerKind = "fail" | "important" | "deferred";

/** Corners of the polygon, 3 is a triangle, 4 a diamond and 5 a pentagon, the shape says the kind */
export const MARKER_POINTS: Readonly<Record<MarkerKind, 3 | 4 | 5>> = {
  fail: 4,
  important: 5,
  deferred: 4
};

const hexToRgb = (hex: string) => ({
  r: Number((parseInt(hex.slice(1, 3), 16) / 255).toFixed(3)),
  g: Number((parseInt(hex.slice(3, 5), 16) / 255).toFixed(3)),
  b: Number((parseInt(hex.slice(5, 7), 16) / 255).toFixed(3))
});

/**
 * The fill of a failing marker by how bad the failure is, darker as it gets worse
 * Each reaches 4.5 to 1 against the white outline, and the steps in lightness keep them apart for
 * people who see little difference between red and orange
 */
export const SEVERITY_COLORS: Readonly<Record<Severity, { r: number; g: number; b: number }>> = {
  high: hexToRgb("#8E1B1B"),
  medium: hexToRgb("#A64B08"),
  low: hexToRgb("#2878A3")
};

export interface MarkerLook {
  points: 3 | 4 | 5;
  color: { r: number; g: number; b: number };
  /** The fill opacity, below 1 only for a deferred marker that has been put off for a while */
  opacity: number;
}

export function markerKind(marker: { deferred?: boolean; important?: boolean }): MarkerKind {
  if (marker.deferred) return "deferred";
  return marker.important ? "important" : "fail";
}

/** The shape, color and fill opacity of one marker, the white outline is the same for all of them */
export function markerLook(marker: {
  deferred?: boolean;
  important?: boolean;
  severity?: Severity;
  opacity?: number;
}): MarkerLook {
  const kind = markerKind(marker);
  const failing = marker.severity ? SEVERITY_COLORS[marker.severity] : SHAPE_COLOR;
  return {
    points: MARKER_POINTS[kind],
    color: kind === "deferred" ? SHAPE_COLOR_DEFERRED : failing,
    opacity: marker.opacity ?? 1
  };
}

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

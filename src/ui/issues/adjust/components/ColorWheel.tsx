import { useCallback, useRef, useState } from "react";

import { rgbToHex } from "../../../../shared/colour/colorHex";
import { contrastRatio } from "../../../../shared/colour/contrastRatio";
import { CONTRAST_ADJUST_HEADROOM } from "../../../../shared/colour/headroom";
import { hslToRgb, rgbToHsl } from "../../../../shared/colour/hsl";
import { keepHue } from "../../../../shared/colour/keepHue";
import { pointToHueSaturation } from "../../../../shared/colour/wheelGeometry";
import type { RGBColor } from "../../../../shared/issues/issueTypes";
import { useRafThrottledCallback } from "../useRafThrottledCallback";
import { useWheelPaint } from "../useWheelPaint";
import { applyWheelKey } from "../wheelKeyboard";
import styles from "./ColorWheel.module.css";

interface ColorWheelProps {
  background: RGBColor;
  requiredRatio: number;
  initialColor: RGBColor;
  onColorChange: (color: RGBColor) => void;
}

const ANNOUNCE_THROTTLE_MS = 500;

/**
 * Hue by angle, saturation by radius, a lightness slider. Passing colours render in
 * full, failing ones faded rather than hidden. Clicking or moving keyboard focus onto
 * a faded cell does not refuse it: it snaps to the nearest passing lightness on that
 * hue and says so, via keepHue, the same search Option A uses
 */
export function ColorWheel({
  background,
  requiredRatio,
  initialColor,
  onColorChange
}: ColorWheelProps) {
  const initial = rgbToHsl(initialColor);
  const [hue, setHue] = useState(initial.h);
  const [saturation, setSaturation] = useState(initial.s);
  const [lightness, setLightness] = useState(initial.l);
  const [announcement, setAnnouncement] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastAnnounceRef = useRef(0);

  const target = requiredRatio + CONTRAST_ADJUST_HEADROOM;
  // At most one real write per animation frame
  // A drag fires far more events and each would write to the fill and race the rescan
  const throttledColorChange = useRafThrottledCallback(onColorChange);

  function announce(resolved: RGBColor, snapped: boolean, throttled: boolean) {
    const now = Date.now();
    if (throttled && now - lastAnnounceRef.current <= ANNOUNCE_THROTTLE_MS) {
      return;
    }
    lastAnnounceRef.current = now;
    const ratio = contrastRatio(resolved, background);
    const suffix = snapped ? ", lightness adjusted to the nearest passing value" : "";
    setAnnouncement(`${rgbToHex(resolved)}, ratio ${ratio.toFixed(2)} to 1${suffix}`);
  }

  const settle = useCallback(
    (nextHue: number, nextSaturation: number, throttled: boolean) => {
      const candidate = hslToRgb(nextHue, nextSaturation, lightness);
      const passes = contrastRatio(candidate, background) >= target;
      const resolved = passes ? candidate : keepHue(candidate, background, requiredRatio);
      const resolvedHsl = rgbToHsl(resolved);

      setHue(nextHue);
      setSaturation(nextSaturation);
      setLightness(resolvedHsl.l);
      (throttled ? throttledColorChange : onColorChange)(resolved);
      announce(resolved, !passes, throttled);
    },
    [background, lightness, requiredRatio, target, onColorChange, throttledColorChange]
  );

  function handleLightnessChange(value: number) {
    const candidate = hslToRgb(hue, saturation, value);
    const passes = contrastRatio(candidate, background) >= target;
    setLightness(value);
    if (passes) {
      throttledColorChange(candidate);
      announce(candidate, false, true);
    }
  }

  function handlePointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const radius = rect.width / 2;
    const point = {
      x: (event.clientX - rect.left - radius) / radius,
      y: (event.clientY - rect.top - radius) / radius
    };
    const { hue: nextHue, saturation: nextSaturation } = pointToHueSaturation(point);
    settle(nextHue, nextSaturation, event.type === "pointermove");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const move = applyWheelKey(event.key, event.shiftKey, hue, saturation);
    if (!move) {
      return;
    }
    event.preventDefault();
    settle(move.hue, move.saturation, false);
  }

  useWheelPaint(canvasRef, lightness, background, requiredRatio);

  // A fragment so WheelView can place the canvas and slider in its own grid
  // That lets the slider sit under the hex field
  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        role="slider"
        aria-label="Color wheel: left and right change hue, up and down change saturation"
        aria-valuetext={announcement}
        onPointerDown={handlePointer}
        onPointerMove={(event) => event.buttons === 1 && handlePointer(event)}
        onKeyDown={handleKeyDown}
      />
      <label className={styles.lightnessLabel} aria-label="Depth / Tone">
        <span className={styles.lightnessTopRow} aria-hidden="true">
          <span>Depth / Tone</span>
          <span className={styles.lightnessValue}>{Math.round(lightness * 100)}%</span>
        </span>
        <input
          className={styles.lightnessSlider}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={lightness}
          onChange={(event) => handleLightnessChange(Number(event.target.value))}
        />
      </label>
      <p className={styles.liveRegion} aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

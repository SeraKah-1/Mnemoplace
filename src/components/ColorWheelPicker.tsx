import React, { useRef, useEffect, useState, useCallback } from "react";
import { Palette, Check } from "lucide-react";

interface ColorWheelPickerProps {
  color: string; // Current hex color string e.g. "#6366f1"
  onChange: (hexColor: string) => void;
  size?: number; // Canvas diameter in px (default 180)
}

// Convert HSL to Hex helper
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert Hex to HSL helper
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  color,
  onChange,
  size = 180,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  const initialHsl = hexToHsl(color || "#6366f1");
  const [hue, setHue] = useState<number>(initialHsl.h);
  const [saturation, setSaturation] = useState<number>(initialHsl.s);
  const [lightness, setLightness] = useState<number>(50);

  const radius = size / 2;
  const wheelRadius = radius - 12;

  // Draw Color Wheel Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Draw HSL Color Circle
    for (let x = -wheelRadius; x <= wheelRadius; x++) {
      for (let y = -wheelRadius; y <= wheelRadius; y++) {
        const dist = Math.hypot(x, y);
        if (dist <= wheelRadius) {
          let angle = Math.atan2(y, x) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = (dist / wheelRadius) * 100;
          ctx.fillStyle = `hsl(${angle}, ${sat}%, ${lightness}%)`;
          ctx.fillRect(radius + x, radius + y, 1.5, 1.5);
        }
      }
    }

    // Draw Wheel Outer Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(radius, radius, wheelRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Selection Handle Ring
    const handleAngle = (hue * Math.PI) / 180;
    const handleDist = (saturation / 100) * wheelRadius;
    const handleX = radius + Math.cos(handleAngle) * handleDist;
    const handleY = radius + Math.sin(handleAngle) * handleDist;

    ctx.fillStyle = hslToHex(hue, saturation, lightness);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [hue, saturation, lightness, radius, size, wheelRadius]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Handle pointer interactions (mouse & touch)
  const updateColorFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - radius;
    const y = clientY - rect.top - radius;

    const dist = Math.hypot(x, y);
    const clampedDist = Math.min(dist, wheelRadius);

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const newHue = Math.round(angle);
    const newSat = Math.round((clampedDist / wheelRadius) * 100);

    setHue(newHue);
    setSaturation(newSat);

    const hex = hslToHex(newHue, newSat, lightness);
    onChange(hex);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateColorFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    updateColorFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const currentHex = hslToHex(hue, saturation, lightness);

  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md select-none">
      <div className="flex items-center justify-between w-full border-b border-zinc-800 pb-2 text-xs font-bold text-white">
        <span className="flex items-center gap-1.5 text-amber-400">
          <Palette className="w-4 h-4" /> CIRCULAR COLOR WHEEL
        </span>
        <span
          className="px-2 py-0.5 rounded font-mono text-[11px] border shadow text-white font-bold"
          style={{ backgroundColor: currentHex, borderColor: "rgba(255,255,255,0.4)" }}
        >
          {currentHex.toUpperCase()}
        </span>
      </div>

      {/* Interactive Circular Wheel Canvas */}
      <div className="relative cursor-pointer touch-none">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="rounded-full shadow-inner block"
        />
      </div>

      {/* Lightness Slider */}
      <div className="w-full flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold text-zinc-400 uppercase">Lightness:</span>
        <input
          type="range"
          min="20"
          max="80"
          value={lightness}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setLightness(val);
            onChange(hslToHex(hue, saturation, val));
          }}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <span className="text-[10px] font-mono text-zinc-300 w-6">{lightness}%</span>
      </div>

      {/* Preset Swatches Row */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {["#6366f1", "#ec4899", "#22c55e", "#eab308", "#06b6d4", "#a855f7", "#f97316"].map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => {
              const hsl = hexToHsl(swatch);
              setHue(hsl.h);
              setSaturation(hsl.s);
              setLightness(hsl.l);
              onChange(swatch);
            }}
            className="w-5 h-5 rounded-full border border-white/30 shadow transition-transform hover:scale-125 active:scale-95"
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </div>
  );
};

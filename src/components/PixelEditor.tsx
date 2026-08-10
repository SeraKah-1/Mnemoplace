import React, { useState, useRef, useEffect, useCallback } from "react";
import { DEFAULT_PALETTE } from "../engine/constants";
import { PixelDoodle } from "../domain/types";
import { Undo2, Redo2, Paintbrush, Eraser, PaintBucket, Pipette, Check, X } from "lucide-react";

interface PixelEditorProps {
  initialDoodle?: PixelDoodle | null;
  onSave: (doodle: PixelDoodle) => void;
  onCancel: () => void;
}

export const PixelEditor: React.FC<PixelEditorProps> = ({ initialDoodle, onSave, onCancel }) => {
  const [gridSize, setGridSize] = useState<16 | 32>(initialDoodle?.width as 16 | 32 || 16);
  const [palette, setPalette] = useState<string[]>(initialDoodle?.palette || DEFAULT_PALETTE);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(3); // Default Red
  const [tool, setTool] = useState<"pencil" | "eraser" | "fill" | "picker">("pencil");
  const [customHex, setCustomHex] = useState<string>("#3b82f6");

  // Grid pixel state (store color index per pixel)
  const [pixels, setPixels] = useState<Uint8Array>(() => {
    if (initialDoodle) {
      return new Uint8Array(initialDoodle.pixels);
    }
    return new Uint8Array(16 * 16);
  });

  // Undo / Redo stacks
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Initialize history
  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([new Uint8Array(pixels)]);
      setHistoryIndex(0);
    }
  }, [historyIndex, pixels]);

  // Render pixels to canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cellSize = canvas.width / gridSize;

    // Draw checkerboard background for transparency
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#1e293b" : "#0f172a";
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    // Draw pixel colors
    for (let i = 0; i < pixels.length; i++) {
      const pIdx = pixels[i];
      if (pIdx === 0) continue; // Transparent

      const color = palette[pIdx] || DEFAULT_PALETTE[pIdx] || "#ffffff";
      const r = Math.floor(i / gridSize);
      const c = i % gridSize;

      ctx.fillStyle = color;
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
  }, [pixels, palette, gridSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const saveToHistory = (newPixels: Uint8Array) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(new Uint8Array(newPixels));
    if (updatedHistory.length > 30) updatedHistory.shift();
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setPixels(newPixels);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setPixels(new Uint8Array(history[prevIdx]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setPixels(new Uint8Array(history[nextIdx]));
    }
  };

  const setPixelAt = (r: number, c: number, colorIdx: number) => {
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return;
    const idx = r * gridSize + c;
    if (pixels[idx] === colorIdx) return;

    const nextPixels = new Uint8Array(pixels);
    nextPixels[idx] = colorIdx;
    saveToHistory(nextPixels);
  };

  const floodFill = (startR: number, startC: number, targetColorIdx: number) => {
    const startIdx = startR * gridSize + startC;
    const originalColorIdx = pixels[startIdx];
    if (originalColorIdx === targetColorIdx) return;

    const nextPixels = new Uint8Array(pixels);
    const queue: [number, number][] = [[startR, startC]];

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const idx = r * gridSize + c;
      if (nextPixels[idx] !== originalColorIdx) continue;

      nextPixels[idx] = targetColorIdx;

      queue.push([r + 1, c]);
      queue.push([r - 1, c]);
      queue.push([r, c + 1]);
      queue.push([r, c - 1]);
    }

    saveToHistory(nextPixels);
  };

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cellSize = rect.width / gridSize;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);

    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return;

    if (tool === "pencil") {
      setPixelAt(r, c, selectedColorIdx);
    } else if (tool === "eraser") {
      setPixelAt(r, c, 0); // 0 = transparent
    } else if (tool === "fill") {
      floodFill(r, c, selectedColorIdx);
    } else if (tool === "picker") {
      const pIdx = pixels[r * gridSize + c];
      setSelectedColorIdx(pIdx);
      setTool("pencil");
    }
  };

  const addCustomColorToPalette = () => {
    if (!palette.includes(customHex)) {
      const nextPalette = [...palette, customHex];
      setPalette(nextPalette);
      setSelectedColorIdx(nextPalette.length - 1);
    }
  };

  const handleSave = () => {
    const doodle: PixelDoodle = {
      id: initialDoodle?.id || `doodle_${crypto.randomUUID()}`,
      width: gridSize,
      height: gridSize,
      palette,
      pixels,
      createdAt: initialDoodle?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(doodle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col gap-5 text-zinc-100">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-indigo-400" />
              Hand-Drawn Pixel Editor
            </h2>
            <p className="text-xs text-zinc-400">Draw absurd visual cues to maximize memory encoding</p>
          </div>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Grid Size Selector */}
        <div className="flex justify-between items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool("pencil")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                tool === "pencil" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:bg-zinc-800"
              }`}
              title="Pencil"
            >
              <Paintbrush className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                tool === "eraser" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:bg-zinc-800"
              }`}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("fill")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                tool === "fill" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:bg-zinc-800"
              }`}
              title="Bucket Fill"
            >
              <PaintBucket className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("picker")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                tool === "picker" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:bg-zinc-800"
              }`}
              title="Color Eyedropper"
            >
              <Pipette className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 text-xs">
            <button
              onClick={() => {
                setGridSize(16);
                setPixels(new Uint8Array(16 * 16));
                setHistory([]);
                setHistoryIndex(-1);
              }}
              className={`px-2.5 py-1 rounded-md font-mono ${
                gridSize === 16 ? "bg-zinc-800 text-indigo-400 font-bold" : "text-zinc-500"
              }`}
            >
              16x16
            </button>
            <button
              onClick={() => {
                setGridSize(32);
                setPixels(new Uint8Array(32 * 32));
                setHistory([]);
                setHistoryIndex(-1);
              }}
              className={`px-2.5 py-1 rounded-md font-mono ${
                gridSize === 32 ? "bg-zinc-800 text-indigo-400 font-bold" : "text-zinc-500"
              }`}
            >
              32x32
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex justify-center items-center py-2">
          <div className="border-2 border-indigo-500/40 rounded-xl overflow-hidden shadow-2xl bg-zinc-950 p-1">
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              onMouseDown={(e) => {
                isDrawingRef.current = true;
                handleCanvasInteraction(e);
              }}
              onMouseMove={(e) => {
                if (isDrawingRef.current && tool !== "fill" && tool !== "picker") {
                  handleCanvasInteraction(e);
                }
              }}
              onMouseUp={() => {
                isDrawingRef.current = false;
              }}
              onMouseLeave={() => {
                isDrawingRef.current = false;
              }}
              onTouchStart={(e) => {
                isDrawingRef.current = true;
                handleCanvasInteraction(e);
              }}
              onTouchMove={(e) => {
                if (isDrawingRef.current && tool !== "fill" && tool !== "picker") {
                  handleCanvasInteraction(e);
                }
              }}
              onTouchEnd={() => {
                isDrawingRef.current = false;
              }}
              className="cursor-crosshair touch-none select-none block rounded-lg"
            />
          </div>
        </div>

        {/* Palette Bar */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Color Palette</label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 rounded-xl border border-zinc-800">
            {palette.map((color, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedColorIdx(idx)}
                style={{ backgroundColor: idx === 0 ? "transparent" : color }}
                className={`w-7 h-7 rounded-lg border-2 transition-all relative overflow-hidden ${
                  selectedColorIdx === idx
                    ? "border-white scale-110 shadow-lg ring-2 ring-indigo-500"
                    : "border-zinc-700 hover:border-zinc-400"
                }`}
                title={idx === 0 ? "Transparent (Eraser)" : color}
              >
                {idx === 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                    X
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="color"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              className="w-8 h-8 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0"
            />
            <button
              onClick={addCustomColorToPalette}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg border border-zinc-700 flex items-center gap-1"
            >
              Add Color to Palette
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Attach Doodle
          </button>
        </div>
      </div>
    </div>
  );
};

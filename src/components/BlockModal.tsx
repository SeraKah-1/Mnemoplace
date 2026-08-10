import React, { useState, useEffect } from "react";
import { MemoryBlock, PixelDoodle } from "../domain/types";
import { createNewSRSCard } from "../domain/fsrs";
import { getAllDoodles, saveDoodle } from "../domain/db";
import { PixelEditor } from "./PixelEditor";
import { Sparkles, Paintbrush, Trash2, Check, X, Tag, FileText } from "lucide-react";

import { pixiApp } from "../engine/PixiApp";

interface BlockModalProps {
  worldId: string;
  tileX: number;
  tileY: number;
  existingBlock?: MemoryBlock | null;
  onSave: (block: MemoryBlock) => void;
  onDelete?: (blockId: string) => void;
  onCancel: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  worldId,
  tileX,
  tileY,
  existingBlock,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [title, setTitle] = useState(existingBlock?.title || "");
  const [text, setText] = useState(existingBlock?.text || "");
  const [tagsInput, setTagsInput] = useState(existingBlock?.tags.join(", ") || "");
  const [selectedDoodleId, setSelectedDoodleId] = useState<string | null>(existingBlock?.doodleId || null);

  const [availableDoodles, setAvailableDoodles] = useState<PixelDoodle[]>([]);
  const [showPixelEditor, setShowPixelEditor] = useState(false);

  useEffect(() => {
    getAllDoodles().then(setAvailableDoodles);
  }, []);

  const handleSaveDoodleFromEditor = async (newDoodle: PixelDoodle) => {
    await saveDoodle(newDoodle);
    setSelectedDoodleId(newDoodle.id);
    const updated = await getAllDoodles();
    setAvailableDoodles(updated);
    setShowPixelEditor(false);
    await pixiApp.reloadDoodlesCache();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const block: MemoryBlock = {
      id: existingBlock?.id || `block_${crypto.randomUUID()}`,
      worldId,
      x: tileX,
      y: tileY,
      title: title.trim(),
      text: text.trim(),
      doodleId: selectedDoodleId,
      tags,
      srs: existingBlock?.srs || createNewSRSCard(),
      createdAt: existingBlock?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(block);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 crt-scanlines">
        <div className="jrpg-box p-5 w-full max-w-md flex flex-col gap-4 text-slate-100 animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-pixel font-bold text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {existingBlock ? "EDIT MNEMONIC ANCHOR" : "ANCHOR NEW MEMORY"}
              </h2>
              <p className="text-[10px] text-slate-400 font-pixel mt-0.5">
                TILE ({tileX}, {tileY}) IN {worldId}
              </p>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                Memory Concept Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mitochondria Powerhouse, Japanese Kanji 太陽"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Hand-Drawn Pixel Visual Cue */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                  <Paintbrush className="w-3 h-3 text-indigo-400" />
                  Visual Pixel Cue (Motor-Visual Encoding)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPixelEditor(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  + Draw New Doodle
                </button>
              </div>

              {/* Doodle selector grid */}
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800 max-h-32 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDoodleId(null)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                    selectedDoodleId === null
                      ? "border-indigo-500 bg-indigo-950/40 text-indigo-300 font-bold"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  No Doodle
                </button>

                {availableDoodles.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDoodleId(d.id)}
                    className={`p-1 rounded-lg border transition-all ${
                      selectedDoodleId === d.id
                        ? "border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/40"
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <DoodleSmallThumbnail doodle={d} />
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Note Content */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                <FileText className="w-3 h-3 text-zinc-400" />
                Note Content (Masked in Explore Mode)
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Write detailed explanations, formulas, or mnemonic associations..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-zinc-400" />
                Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vocab, science, exam-2026"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
              {existingBlock && onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(existingBlock.id)}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-semibold rounded-xl flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Anchor
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {existingBlock ? "Update Anchor" : "Anchor Memory"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Render Pixel Editor Modal if requested */}
      {showPixelEditor && (
        <PixelEditor
          onSave={handleSaveDoodleFromEditor}
          onCancel={() => setShowPixelEditor(false)}
        />
      )}
    </>
  );
};

const DoodleSmallThumbnail: React.FC<{ doodle: PixelDoodle }> = ({ doodle }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cellSize = canvas.width / doodle.width;
    for (let i = 0; i < doodle.pixels.length; i++) {
      const pIdx = doodle.pixels[i];
      if (pIdx === 0) continue;

      const color = doodle.palette[pIdx] || "#ffffff";
      const r = Math.floor(i / doodle.width);
      const c = i % doodle.width;

      ctx.fillStyle = color;
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }, [doodle]);

  return <canvas ref={canvasRef} width={28} height={28} className="w-7 h-7 block rounded" />;
};

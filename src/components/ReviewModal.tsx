import React, { useState, useEffect } from "react";
import { MemoryBlock, PixelDoodle, ReviewRating } from "../domain/types";
import { processSRSReview } from "../domain/fsrs";
import { saveBlock, getDoodleById } from "../domain/db";
import { Brain, CheckCircle2, RotateCcw, Eye, Sparkles, Navigation, X } from "lucide-react";

interface ReviewModalProps {
  blocks: MemoryBlock[];
  onUpdateBlock: (updatedBlock: MemoryBlock) => void;
  onTeleportToBlock: (worldId: string, x: number, y: number) => void;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  blocks,
  onUpdateBlock,
  onTeleportToBlock,
  onClose,
}) => {
  // Filter due blocks for pure FSRS scheduling
  const now = Date.now();
  const dueBlocks = blocks.filter((b) => b.srs.due <= now);
  const reviewQueue = dueBlocks;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [doodle, setDoodle] = useState<PixelDoodle | null>(null);

  const currentBlock = reviewQueue[currentIndex] || null;

  useEffect(() => {
    if (currentBlock?.doodleId) {
      getDoodleById(currentBlock.doodleId).then((d) => setDoodle(d || null));
    } else {
      setDoodle(null);
    }
    setIsAnswerRevealed(false);
  }, [currentBlock]);

  if (!currentBlock) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-6 w-full max-w-md text-center text-zinc-100 flex flex-col items-center gap-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
          <h2 className="text-xl font-bold text-white">All Memory Reviews Complete!</h2>
          <p className="text-xs text-zinc-400">Your memory consolidation schedule is up to date.</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
          >
            Return to Palace
          </button>
        </div>
      </div>
    );
  }

  const handleRating = async (rating: ReviewRating) => {
    const updatedSRS = processSRSReview(currentBlock.srs, rating);
    const updatedBlock: MemoryBlock = {
      ...currentBlock,
      srs: updatedSRS,
      updatedAt: Date.now(),
    };

    await saveBlock(updatedBlock);
    onUpdateBlock(updatedBlock);

    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed queue
      setCurrentIndex(reviewQueue.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col gap-5 text-zinc-100 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white leading-tight">FSRS Active Recall Review Station</h2>
              <p className="text-xs text-zinc-400">
                Item {currentIndex + 1} of {reviewQueue.length} {dueBlocks.length > 0 ? "(Due Reviews)" : "(Practice)"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mnemonic Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-inner">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3" />
                Memory Cue
              </span>
              <h3 className="text-lg font-bold text-white leading-snug">{currentBlock.title}</h3>
              {currentBlock.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {currentBlock.tags.map((t) => (
                    <span key={t} className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded-md">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Hand-drawn Pixel Doodle */}
            {doodle && (
              <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-700/60 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
                <DoodleCanvasPreview doodle={doodle} />
              </div>
            )}
          </div>

          {/* Reveal Section */}
          <div className="border-t border-zinc-800/80 pt-3 min-h-[100px] flex items-center justify-center">
            {isAnswerRevealed ? (
              <div className="w-full text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap animate-fade-in bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                {currentBlock.text}
              </div>
            ) : (
              <button
                onClick={() => setIsAnswerRevealed(true)}
                className="w-full py-4 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 text-indigo-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Eye className="w-4 h-4 text-indigo-400" />
                Reveal Note Explanation
              </button>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-800/50 pt-2">
            <button
              onClick={() => onTeleportToBlock(currentBlock.worldId, currentBlock.x, currentBlock.y)}
              className="text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" /> View in Palace
            </button>
            <span>Reps: {currentBlock.srs.reps} | Stability: {currentBlock.srs.stability.toFixed(1)}d</span>
          </div>
        </div>

        {/* FSRS Rating Buttons */}
        {isAnswerRevealed ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-center tracking-wider text-zinc-400">
              Rate Your Active Recall Quality:
            </p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleRating(1)}
                className="py-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 text-red-300 text-xs font-bold rounded-xl flex flex-col items-center transition-all"
              >
                <span>Again</span>
                <span className="text-[9px] font-normal opacity-70">Forgot</span>
              </button>
              <button
                onClick={() => handleRating(2)}
                className="py-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/50 text-amber-300 text-xs font-bold rounded-xl flex flex-col items-center transition-all"
              >
                <span>Hard</span>
                <span className="text-[9px] font-normal opacity-70">Struggled</span>
              </button>
              <button
                onClick={() => handleRating(3)}
                className="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 text-xs font-bold rounded-xl flex flex-col items-center transition-all"
              >
                <span>Good</span>
                <span className="text-[9px] font-normal opacity-70">Recalled</span>
              </button>
              <button
                onClick={() => handleRating(4)}
                className="py-2.5 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/50 text-blue-300 text-xs font-bold rounded-xl flex flex-col items-center transition-all"
              >
                <span>Easy</span>
                <span className="text-[9px] font-normal opacity-70">Instant</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-zinc-500 py-1">
            Think back and attempt active recall before revealing the answer.
          </div>
        )}
      </div>
    </div>
  );
};

const DoodleCanvasPreview: React.FC<{ doodle: PixelDoodle }> = ({ doodle }) => {
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

  return <canvas ref={canvasRef} width={64} height={64} className="w-full h-full block rounded" />;
};

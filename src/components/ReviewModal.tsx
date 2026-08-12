import React, { useState, useEffect, useRef } from "react";
import { MemoryBlock, PixelDoodle, ReviewRating } from "../domain/types";
import { processSRSReview } from "../domain/fsrs";
import { saveBlock, getDoodleById } from "../domain/db";
import { Brain, CheckCircle2, Eye, Sparkles, Navigation, X, ThumbsUp, ThumbsDown, HelpCircle, Zap, MapPin } from "lucide-react";

interface ReviewModalProps {
  blocks: MemoryBlock[];
  activeWorldId?: string;
  activeWorldName?: string;
  onUpdateBlock: (updatedBlock: MemoryBlock) => void;
  onTeleportToBlock: (worldId: string, x: number, y: number) => void;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  blocks,
  activeWorldId,
  activeWorldName,
  onUpdateBlock,
  onTeleportToBlock,
  onClose,
}) => {
  // Freeze review queue upon modal initialization filtered by current floor
  const [reviewQueue] = useState<MemoryBlock[]>(() => {
    const now = Date.now();
    return blocks.filter((b) => {
      const isDue = b.srs.due <= now;
      return activeWorldId ? isDue && b.worldId === activeWorldId : isDue;
    });
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [doodle, setDoodle] = useState<PixelDoodle | null>(null);

  // Smooth Swipe Gesture State
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"right" | "left" | "up" | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const currentBlock = reviewQueue[currentIndex] || null;
  const nextBlock = reviewQueue[currentIndex + 1] || null;

  useEffect(() => {
    if (currentBlock?.doodleId) {
      getDoodleById(currentBlock.doodleId).then((d) => setDoodle(d || null));
    } else {
      setDoodle(null);
    }
    setIsAnswerRevealed(false);
    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, [currentBlock]);

  if (!currentBlock) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="jrpg-box-gold p-6 w-full max-w-md text-center text-slate-100 flex flex-col items-center gap-4 animate-scale-up">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
          <h2 className="text-sm font-pixel font-bold text-amber-300">FLOOR REVIEWS COMPLETE!</h2>
          <p className="text-xs font-pixel text-slate-300">
            {activeWorldName ? `All due items on floor "${activeWorldName}" consolidated.` : "All due memory cards are consolidated."}
          </p>
          <button
            onClick={onClose}
            className="jrpg-btn px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-pixel rounded-xl shadow-lg"
          >
            RETURN TO PALACE
          </button>
        </div>
      </div>
    );
  }

  const handleRating = async (rating: ReviewRating, animDirection?: "right" | "left" | "up") => {
    if (animDirection) {
      setSwipeDirection(animDirection);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }

    const updatedSRS = processSRSReview(currentBlock.srs, rating);
    const updatedBlock: MemoryBlock = {
      ...currentBlock,
      srs: updatedSRS,
      updatedAt: Date.now(),
    };

    await saveBlock(updatedBlock);
    onUpdateBlock(updatedBlock);

    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);

    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswerRevealed(false);
    } else {
      onClose();
    }
  };

  // Pointer / Touch Swipe Event Handlers (Smoothed Physics)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsSwiping(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });

    // Determine visual hint direction
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 35) setSwipeDirection("right");
      else if (dx < -35) setSwipeDirection("left");
      else setSwipeDirection(null);
    } else {
      if (dy < -35) setSwipeDirection("up");
      else setSwipeDirection(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    setIsSwiping(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    const SWIPE_THRESHOLD = 75;

    if (Math.abs(dragOffset.x) > Math.abs(dragOffset.y)) {
      if (dragOffset.x > SWIPE_THRESHOLD) {
        // Swipe RIGHT -> INGAT (Good / Rating 3)
        handleRating(3, "right");
        return;
      } else if (dragOffset.x < -SWIPE_THRESHOLD) {
        // Swipe LEFT -> LUPA (Again / Rating 1)
        handleRating(1, "left");
        return;
      }
    } else {
      if (dragOffset.y < -SWIPE_THRESHOLD) {
        // Swipe UP -> RAGU-RAGU (Hard / Rating 2)
        handleRating(2, "up");
        return;
      }
    }

    // Reset position smoothly if threshold not reached
    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);
  };

  const rotationDeg = dragOffset.x * 0.1;
  const currentDragDist = Math.hypot(dragOffset.x, dragOffset.y);
  const dragScale = 1 + Math.min(currentDragDist / 800, 0.04);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="jrpg-box-gold p-4 sm:p-6 w-full max-w-lg flex flex-col gap-3 text-slate-100 animate-fade-in relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-amber-500/40 pb-2.5">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-pixel font-bold text-amber-300 leading-tight">TINDER SRS RECALL STATION</h2>
              <p className="text-[10px] font-pixel text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">CARD {currentIndex + 1} OF {reviewQueue.length}</span>
                {activeWorldName && (
                  <span className="text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/60 font-mono text-[9px] truncate max-w-[150px]">
                    📍 {activeWorldName}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Swipe Hint Legend */}
        <div className="flex justify-between items-center text-[9px] font-pixel px-2.5 py-1 bg-zinc-950/90 rounded-lg border border-zinc-800/80 text-zinc-400">
          <span className="text-rose-400 font-bold flex items-center gap-1">← Kiri: LUPA</span>
          <span className="text-amber-400 font-bold flex items-center gap-1">↑ Atas: RAGU</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">Kanan: INGAT →</span>
        </div>

        {/* Card Stack Area */}
        <div className="relative h-[380px] w-full flex items-center justify-center">
          {/* Background Stack Card Illusion */}
          {nextBlock && (
            <div className="absolute inset-0 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 scale-95 translate-y-3 opacity-40 blur-[0.5px] pointer-events-none shadow-xl flex flex-col justify-between">
              <h4 className="text-sm font-bold text-zinc-400 truncate">{nextBlock.title}</h4>
            </div>
          )}

          {/* Foreground Swiping Card */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute inset-0 bg-zinc-950 border-2 rounded-3xl p-5 flex flex-col justify-between shadow-2xl cursor-grab active:cursor-grabbing touch-none will-change-transform ${
              isSwiping ? "" : "transition-transform duration-250 ease-out"
            } ${
              swipeDirection === "right"
                ? "border-emerald-500 shadow-emerald-500/25"
                : swipeDirection === "left"
                ? "border-rose-500 shadow-rose-500/25"
                : swipeDirection === "up"
                ? "border-amber-500 shadow-amber-500/25"
                : "border-zinc-800"
            }`}
            style={{
              transform: swipeDirection === "right" && !isSwiping
                ? "translateX(600px) rotate(35deg)"
                : swipeDirection === "left" && !isSwiping
                ? "translateX(-600px) rotate(-35deg)"
                : swipeDirection === "up" && !isSwiping
                ? "translateY(-600px) scale(0.7)"
                : `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotationDeg}deg) scale(${dragScale})`,
            }}
          >
            {/* Visual Direction Overlay Badges */}
            {swipeDirection === "right" && (
              <div className="absolute top-4 left-4 border-2 border-emerald-400 text-emerald-400 font-pixel font-bold text-xs px-3 py-1 rounded-xl rotate-[-12deg] bg-emerald-950/90 shadow-xl animate-fade-in flex items-center gap-1 z-20">
                <ThumbsUp className="w-4 h-4" /> INGAT (KANAN)
              </div>
            )}
            {swipeDirection === "left" && (
              <div className="absolute top-4 right-4 border-2 border-rose-400 text-rose-400 font-pixel font-bold text-xs px-3 py-1 rounded-xl rotate-[12deg] bg-rose-950/90 shadow-xl animate-fade-in flex items-center gap-1 z-20">
                <ThumbsDown className="w-4 h-4" /> LUPA (KIRI)
              </div>
            )}
            {swipeDirection === "up" && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 border-2 border-amber-400 text-amber-400 font-pixel font-bold text-xs px-3 py-1 rounded-xl bg-amber-950/90 shadow-xl animate-fade-in flex items-center gap-1 z-20">
                <HelpCircle className="w-4 h-4" /> RAGU-RAGU (ATAS)
              </div>
            )}

            {/* Card Content Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-1 mb-1 font-pixel">
                  <Sparkles className="w-3.5 h-3.5" />
                  Mnemonic Cue
                </span>
                <h3 className="text-base font-bold text-white leading-snug">{currentBlock.title}</h3>
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
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-700/60 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
                  <DoodleCanvasPreview doodle={doodle} />
                </div>
              )}
            </div>

            {/* Expanded Scrollable Note Text Reveal Area */}
            <div className="my-2 flex-1 flex items-center justify-center overflow-hidden">
              {isAnswerRevealed ? (
                <div className="w-full text-xs text-zinc-100 leading-relaxed whitespace-pre-wrap animate-fade-in bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 max-h-[220px] overflow-y-auto pr-1 shadow-inner">
                  {currentBlock.text}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAnswerRevealed(true)}
                  className="w-full py-5 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-inner"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Tap to Reveal Note Explanation
                </button>
              )}
            </div>

            {/* Card Footer Info */}
            <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-2">
              <button
                type="button"
                onClick={() => onTeleportToBlock(currentBlock.worldId, currentBlock.x, currentBlock.y)}
                className="text-indigo-400 hover:underline flex items-center gap-1 font-pixel"
              >
                <Navigation className="w-3 h-3" /> View in Palace
              </button>
              <span className="font-mono text-[9px]">Reps: {currentBlock.srs.reps} | Stability: {currentBlock.srs.stability.toFixed(1)}d</span>
            </div>
          </div>
        </div>

        {/* Swipe Quick Tap Buttons Row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleRating(1, "left")}
            className="py-2.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
            title="Swipe Left: Forgot"
          >
            <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px]">LUPA</span>
          </button>
          <button
            type="button"
            onClick={() => handleRating(2, "up")}
            className="py-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/50 text-amber-300 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
            title="Swipe Up: Hard"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px]">RAGU</span>
          </button>
          <button
            type="button"
            onClick={() => handleRating(3, "right")}
            className="py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
            title="Swipe Right: Good"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">INGAT</span>
          </button>
          <button
            type="button"
            onClick={() => handleRating(4, "right")}
            className="py-2.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/50 text-sky-300 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
            title="Instant Recall"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px]">INSTAN</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DoodleCanvasPreview: React.FC<{ doodle: PixelDoodle }> = ({ doodle }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
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

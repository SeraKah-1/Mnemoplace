import React, { useEffect, useState, useRef } from "react";
import { MemoryBlock, PixelDoodle } from "../domain/types";
import { pixiApp } from "../engine/PixiApp";
import { PlayerPosition } from "../engine/PlayerController";
import { Eye, Sparkles, HelpCircle } from "lucide-react";
import { getDoodleById } from "../domain/db";

interface ProximityPopupProps {
  worldId: string;
  playerPosition: PlayerPosition;
  allBlocks: MemoryBlock[];
  studyMode: boolean; // Explore (Cue) vs Study (Reveal) Mode
  onOpenBlock: (block: MemoryBlock) => void;
}

export const ProximityPopup: React.FC<ProximityPopupProps> = ({
  worldId,
  playerPosition,
  allBlocks,
  studyMode,
  onOpenBlock,
}) => {
  const [activeBlock, setActiveBlock] = useState<MemoryBlock | null>(null);
  const [doodle, setDoodle] = useState<PixelDoodle | null>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  // Hysteresis threshold logic: active < 2.5 tiles, inactive > 3.5 tiles
  useEffect(() => {
    let closest: MemoryBlock | null = null;
    let minDistance = Infinity;

    for (const b of allBlocks) {
      if (b.worldId !== worldId) continue;
      const dx = b.x - playerPosition.tileX;
      const dy = b.y - playerPosition.tileY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        closest = b;
      }
    }

    if (activeBlock) {
      // Check if current active block exceeds hysteresis upper bound (3.5 tiles)
      const dx = activeBlock.x - playerPosition.tileX;
      const dy = activeBlock.y - playerPosition.tileY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      if (currentDist > 3.5) {
        setActiveBlock(null);
        setIsRevealed(false);
      }
    } else {
      // Activate new block if within lower bound (2.5 tiles)
      if (closest && minDistance <= 2.5) {
        setActiveBlock(closest);
        setIsRevealed(false);
      }
    }
  }, [playerPosition, allBlocks, worldId, activeBlock]);

  // Load doodle when active block changes
  useEffect(() => {
    if (activeBlock?.doodleId) {
      getDoodleById(activeBlock.doodleId).then((d) => setDoodle(d || null));
    } else {
      setDoodle(null);
    }
  }, [activeBlock]);

  // Update screen coordinates using PixiApp projection
  useEffect(() => {
    if (!activeBlock) {
      setScreenPos(null);
      return;
    }
    const pos = pixiApp.worldToScreen(activeBlock.x, activeBlock.y);
    setScreenPos(pos);
  }, [activeBlock, playerPosition]);

  if (!activeBlock || !screenPos) return null;

  const showContent = studyMode || isRevealed;

  return (
    <div
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y - 70}px`,
        transform: "translate(-50%, -100%)",
      }}
      className="fixed z-40 pointer-events-auto cursor-pointer animate-fade-in"
      onClick={() => onOpenBlock(activeBlock)}
    >
      <div className="bg-zinc-900/95 border border-indigo-500/50 backdrop-blur-md text-zinc-100 p-3.5 rounded-2xl shadow-2xl max-w-xs flex flex-col gap-2 relative group hover:border-indigo-400 transition-all">
        {/* Glow accent */}
        <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300" />

        <div className="relative z-10 flex items-start gap-3">
          {/* Hand-drawn Pixel Doodle Cue */}
          {doodle && (
            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-700/60 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <DoodleCanvasPreview doodle={doodle} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-center gap-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Mnemonic Anchor
              </span>
              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                ({activeBlock.x}, {activeBlock.y})
              </span>
            </div>

            <h3 className="text-sm font-bold text-white truncate leading-tight mt-0.5">{activeBlock.title}</h3>

            {/* Tags */}
            {activeBlock.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {activeBlock.tags.map((t, idx) => (
                  <span key={idx} className="text-[9px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 px-1.5 py-0.2 rounded-md">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Section (Desirable Difficulties Active Retrieval Cue vs Answer) */}
        <div className="relative z-10 border-t border-zinc-800/80 pt-2 mt-1 text-xs">
          {showContent ? (
            <p className="text-zinc-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">{activeBlock.text}</p>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsRevealed(true);
              }}
              className="bg-zinc-950/80 border border-zinc-800 p-2 rounded-xl text-center flex items-center justify-center gap-1.5 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] font-semibold">Click to Recall Memory Note</span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-800/50 pt-1.5">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-indigo-400" />
            Press Space / Click to Inspect
          </span>
          <span className="text-zinc-400 font-mono">SRS Due: {new Date(activeBlock.srs.due).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

// Helper component to render small canvas preview of PixelDoodle
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

  return <canvas ref={canvasRef} width={48} height={48} className="w-full h-full block rounded" />;
};

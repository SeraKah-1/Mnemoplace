import React, { useEffect, useState, useRef } from "react";
import { MemoryBlock, PixelDoodle } from "../domain/types";
import { pixiApp } from "../engine/PixiApp";
import { PlayerPosition } from "../engine/PlayerController";
import { chunkManager } from "../engine/ChunkManager";
import { Eye, Sparkles, HelpCircle, MapPin } from "lucide-react";
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

  const district = chunkManager.getDistrictInfo(playerPosition.tileX, playerPosition.tileY);

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

  const showContent = studyMode || isRevealed;

  return (
    <>
      {/* Permanent District Landmark Location Banner — sits below header HUD (top-[72px]) */}
      <div className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none" style={{ top: '60px' }}>
        <div className="jrpg-box px-3 py-1.5 flex items-center gap-2 animate-fade-in shadow-xl">
          <MapPin className="w-3.5 h-3.5 text-amber-400 animate-bounce flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-pixel font-bold text-amber-400 tracking-widest uppercase">
              {district.districtTag}
            </span>
            <span className="text-slate-600 text-[8px]">›</span>
            <span className="text-[9px] font-pixel text-slate-100 font-bold">
              {district.roomName}
            </span>
          </div>
        </div>
      </div>

      {activeBlock && screenPos && (
        <div
          style={{
            left: `${screenPos.x}px`,
            top: `${screenPos.y - 70}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="fixed z-50 pointer-events-auto cursor-pointer animate-fade-in"
          onClick={() => onOpenBlock(activeBlock)}
        >
      <div className="jrpg-box p-3.5 text-slate-100 max-w-xs flex flex-col gap-2 relative group hover:border-amber-400 transition-all">
        <div className="relative z-10 flex items-start gap-3">
          {/* Hand-drawn Pixel Doodle Cue */}
          {doodle && (
            <div className="w-12 h-12 rounded bg-slate-950 border-2 border-slate-700 p-0.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <DoodleCanvasPreview doodle={doodle} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-center gap-1">
              <span className="text-[10px] font-pixel font-bold tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                MNEMONIC ANCHOR
              </span>
              <span className="text-[9px] font-pixel text-slate-400">
                ({activeBlock.x}, {activeBlock.y})
              </span>
            </div>

            <h3 className="text-xs font-pixel font-bold text-white truncate leading-snug mt-0.5">{activeBlock.title}</h3>

            {/* Tags */}
            {activeBlock.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {activeBlock.tags.map((t, idx) => (
                  <span key={idx} className="text-[9px] font-pixel bg-indigo-950 text-cyan-300 border border-indigo-700 px-1 py-0.2 rounded">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Section (Desirable Difficulties Active Retrieval Cue vs Answer) */}
        <div className="relative z-10 border-t-2 border-slate-800 pt-2 mt-1 text-xs">
          {showContent ? (
            <p className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap">{activeBlock.text}</p>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsRevealed(true);
              }}
              className="bg-slate-950 border-2 border-amber-500/60 p-2 rounded text-center flex items-center justify-center gap-1.5 text-amber-300 hover:border-amber-400 transition-all active:translate-y-0.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-[10px] font-pixel font-bold">CLICK TO RECALL MEMORY</span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex justify-between items-center text-[9px] font-pixel text-slate-400 border-t-2 border-slate-800/80 pt-1.5">
          <span className="flex items-center gap-1 text-cyan-300">
            <Eye className="w-3 h-3 text-cyan-400" />
            TAP TO INSPECT
          </span>
          <span className="text-slate-400 font-mono">DUE: {new Date(activeBlock.srs.due).toLocaleDateString()}</span>
        </div>
        </div>
      </div>
    )}
  </>
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

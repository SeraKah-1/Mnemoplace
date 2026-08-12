import React, { useEffect, useState, useRef } from "react";
import { MemoryBlock, PixelDoodle, WorldFolder } from "../domain/types";
import { pixiApp } from "../engine/PixiApp";
import { PlayerPosition } from "../engine/PlayerController";
import { chunkManager } from "../engine/ChunkManager";
import { Eye, Sparkles, HelpCircle, MapPin, Edit3, Check, X, RotateCcw, GripHorizontal } from "lucide-react";
import { getDoodleById } from "../domain/db";

interface ProximityPopupProps {
  worldId: string;
  activeWorld: WorldFolder;
  playerPosition: PlayerPosition;
  allBlocks: MemoryBlock[];
  studyMode: boolean; // Explore (Cue) vs Study (Reveal) Mode
  onOpenBlock: (block: MemoryBlock) => void;
  onLiftBlock?: (block: MemoryBlock) => void;
}

export const ProximityPopup: React.FC<ProximityPopupProps> = ({
  worldId,
  activeWorld,
  playerPosition,
  allBlocks,
  studyMode,
  onOpenBlock,
  onLiftBlock,
}) => {
  const [activeBlock, setActiveBlock] = useState<MemoryBlock | null>(null);
  const [doodle, setDoodle] = useState<PixelDoodle | null>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  // Dragging state for mobile touchscreen & mouse
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialOffsetX: number; initialOffsetY: number }>({
    clientX: 0,
    clientY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });

  // Room Rename Modal state
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [roomInput, setRoomInput] = useState<string>("");

  const district = chunkManager.getDistrictInfo(worldId, playerPosition.tileX, playerPosition.tileY);

  // Reset drag offset when active block changes
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [activeBlock?.id]);

  // Hysteresis threshold logic: active < 80px (~2.5 tiles), inactive > 120px (~3.5 tiles)
  useEffect(() => {
    let closest: MemoryBlock | null = null;
    let minDistance = Infinity;
    const dims = pixiApp.getMapDimensions();
    const isImageMap = Boolean(activeWorld.mapImageUrl);

    for (const b of allBlocks) {
      if (b.worldId !== worldId) continue;

      let bPxX: number;
      let bPxY: number;

      if (isImageMap && b.pinX !== undefined && b.pinY !== undefined) {
        // Custom Image Spatial Pin calculation
        bPxX = (b.pinX / 100) * dims.width;
        bPxY = (b.pinY / 100) * dims.height;
      } else {
        // 2D Tile Grid Tile calculation (16px tile size)
        bPxX = b.x * 16 + 8;
        bPxY = b.y * 16 + 8;
      }

      const dist = Math.hypot(playerPosition.x - bPxX, playerPosition.y - bPxY);

      if (dist < minDistance) {
        minDistance = dist;
        closest = b;
      }
    }

    const triggerThreshold = isImageMap ? 45 : 32; // ~1-1.5 tiles (32px radius)
    const exitThreshold = isImageMap ? 65 : 48;    // ~2 tiles (48px radius)

    if (activeBlock) {
      let activePxX = (isImageMap && activeBlock.pinX !== undefined && activeBlock.pinY !== undefined)
        ? (activeBlock.pinX / 100) * dims.width
        : activeBlock.x * 16 + 8;
      let activePxY = (isImageMap && activeBlock.pinX !== undefined && activeBlock.pinY !== undefined)
        ? (activeBlock.pinY / 100) * dims.height
        : activeBlock.y * 16 + 8;

      const currentDist = Math.hypot(playerPosition.x - activePxX, playerPosition.y - activePxY);

      if (currentDist > exitThreshold) {
        setActiveBlock(null);
        setIsRevealed(false);
      }
    } else {
      if (closest && minDistance <= triggerThreshold) {
        setActiveBlock(closest);
        setIsRevealed(false);
      }
    }
  }, [playerPosition, allBlocks, worldId, activeBlock, activeWorld]);

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

    const updateScreenPos = () => {
      const pos = pixiApp.worldToScreen(activeBlock.x, activeBlock.y, activeBlock.pinX, activeBlock.pinY);
      setScreenPos(pos);
    };

    updateScreenPos();
    const interval = setInterval(updateScreenPos, 30);
    return () => clearInterval(interval);
  }, [activeBlock, playerPosition]);

  // Touch & Mouse Drag Handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX,
      clientY,
      initialOffsetX: dragOffset.x,
      initialOffsetY: dragOffset.y,
    };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - dragStartRef.current.clientX;
    const dy = clientY - dragStartRef.current.clientY;
    setDragOffset({
      x: dragStartRef.current.initialOffsetX + dx,
      y: dragStartRef.current.initialOffsetY + dy,
    });
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  const handleOpenRename = () => {
    setRoomInput(district.roomName);
    setShowRenameModal(true);
  };

  const handleSaveRename = () => {
    chunkManager.setCustomRoomName(worldId, district.cx, district.cy, roomInput);
    setShowRenameModal(false);
  };

  const handleResetRename = () => {
    chunkManager.setCustomRoomName(worldId, district.cx, district.cy, "");
    setShowRenameModal(false);
  };

  const showContent = studyMode || isRevealed;

  // Viewport Edge Clamping calculation (prevents thumbnail/popup from overflowing screen boundaries)
  const cardHalfWidth = 145; // 290px / 2
  const clampedX = screenPos ? Math.max(cardHalfWidth + 12, Math.min(window.innerWidth - cardHalfWidth - 12, screenPos.x)) : 0;
  const clampedY = screenPos ? Math.max(130, Math.min(window.innerHeight - 40, screenPos.y - 70)) : 0;

  const finalPosX = clampedX + dragOffset.x;
  const finalPosY = clampedY + dragOffset.y;

  return (
    <>
      {/* Permanent District Landmark Location Banner — sits below header HUD (top-[60px]) */}
      <div className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-auto" style={{ top: '60px' }}>
        <div className="jrpg-box px-3 py-1.5 flex items-center gap-2 animate-fade-in shadow-2xl">
          <MapPin className="w-3.5 h-3.5 text-amber-400 animate-bounce flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-pixel font-bold text-amber-400 tracking-widest uppercase truncate max-w-[90px] sm:max-w-none">
              {district.districtTag}
            </span>
            <span className="text-slate-600 text-[8px]">›</span>
            <span className="text-[9px] font-pixel text-slate-100 font-bold truncate max-w-[120px] sm:max-w-[180px]">
              {district.roomName}
            </span>
            {/* Edit / Rename Room Button */}
            <button
              onClick={handleOpenRename}
              className="p-1 hover:bg-slate-800 rounded text-cyan-400 hover:text-amber-300 transition-all active:scale-95 ml-0.5"
              title="Rename Room / Chamber"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Room Rename JRPG Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="jrpg-box p-4 max-w-sm w-full flex flex-col gap-3 shadow-2xl">
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2">
              <h3 className="text-xs font-pixel font-bold text-amber-400 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                RENAME ROOM / CHAMBER
              </h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[10px] font-pixel text-slate-300">
              Chamber Position: <span className="text-amber-300 font-mono">[{district.cx}, {district.cy}]</span> ({district.districtTag})
            </div>

            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="e.g. Ruang Rumus Fisika, N5 Vocabulary Room"
              className="w-full bg-slate-900 border-2 border-slate-700 text-white font-pixel text-xs p-2.5 rounded focus:border-amber-400 outline-none"
              autoFocus
            />

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleResetRename}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-pixel rounded flex items-center gap-1"
                title="Reset to default name"
              >
                <RotateCcw className="w-3 h-3" />
                RESET
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRenameModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel rounded"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveRename}
                  className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-pixel font-bold rounded flex items-center gap-1 shadow-lg"
                >
                  <Check className="w-3 h-3 text-amber-400" />
                  SAVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proximity Thumbnail Hover Card (Draggable via touch/mouse, with edge clamping) */}
      {activeBlock && screenPos && (
        <div
          style={{
            left: `${finalPosX}px`,
            top: `${finalPosY}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="fixed z-40 pointer-events-auto cursor-pointer animate-fade-in"
          onClick={() => onOpenBlock(activeBlock)}
        >
          <div className="jrpg-box p-3 text-slate-100 max-w-[280px] sm:max-w-xs w-full flex flex-col gap-2 relative group hover:border-amber-400 transition-all shadow-2xl overflow-hidden">

            {/* Touchscreen Drag Handle */}
            <div
              className="bg-slate-950/90 border-b border-slate-800 p-1 -mx-3 -mt-3 mb-1 flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing touch-none select-none text-slate-400 hover:text-amber-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleDragStart(e.clientX, e.clientY);
                const onMove = (me: MouseEvent) => handleDragMove(me.clientX, me.clientY);
                const onUp = () => {
                  handleDragEnd();
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches[0]) {
                  handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                if (e.touches[0]) {
                  handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleDragEnd();
              }}
            >
              <GripHorizontal className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-[8px] font-pixel text-amber-300 font-bold uppercase tracking-wider">
                ::: DRAG TO MOVE :::
              </span>
            </div>

            <div className="relative z-10 flex items-start gap-2.5">
              {/* Hand-drawn Pixel Doodle Cue */}
              {doodle && (
                <div className="w-11 h-11 rounded bg-slate-950 border-2 border-slate-700 p-0.5 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md">
                  <DoodleCanvasPreview doodle={doodle} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center gap-1">
                  <span className="text-[9px] font-pixel font-bold tracking-wider text-amber-300 flex items-center gap-1 truncate">
                    <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    MNEMONIC ANCHOR
                  </span>
                  <span className="text-[9px] font-pixel text-slate-400 font-mono flex-shrink-0">
                    ({activeBlock.x}, {activeBlock.y})
                  </span>
                </div>

                <h3 className="text-xs font-pixel font-bold text-white truncate leading-snug mt-0.5">{activeBlock.title}</h3>

                {/* Tags */}
                {activeBlock.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeBlock.tags.map((t, idx) => (
                      <span key={idx} className="text-[8px] font-pixel bg-indigo-950 text-cyan-300 border border-indigo-700 px-1 py-0.2 rounded truncate max-w-[90px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content Section (Desirable Difficulties Active Retrieval Cue vs Answer) */}
            <div className="relative z-10 border-t-2 border-slate-800 pt-2 mt-0.5 text-xs">
              {showContent ? (
                <div className="text-slate-200 text-[10px] sm:text-[11px] leading-relaxed whitespace-pre-wrap max-h-[220px] overflow-y-auto pr-1">
                  {activeBlock.text}
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRevealed(true);
                  }}
                  className="bg-slate-950 border-2 border-amber-500/60 p-1.5 rounded text-center flex items-center justify-center gap-1.5 text-amber-300 hover:border-amber-400 transition-all active:translate-y-0.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[9px] font-pixel font-bold">CLICK TO RECALL MEMORY</span>
                </div>
              )}
            </div>

            <div className="relative z-10 flex justify-between items-center text-[8px] font-pixel text-slate-400 border-t-2 border-slate-800/80 pt-1">
              {onLiftBlock ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLiftBlock(activeBlock);
                  }}
                  className="flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/60 font-bold active:scale-95 transition-transform"
                  title="Lift and Move Anchor Pin (G)"
                >
                  <GripHorizontal className="w-3 h-3 text-amber-400" />
                  MOVE (G)
                </button>
              ) : (
                <span className="flex items-center gap-1 text-cyan-300">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  TAP TO INSPECT
                </span>
              )}
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

  return <canvas ref={canvasRef} width={44} height={44} className="w-full h-full block rounded" />;
};

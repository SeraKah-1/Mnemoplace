import React, { useState, useRef } from "react";
import { WorldFolder, MemoryBlock } from "../domain/types";
import { MapPin, Plus, ZoomIn, ZoomOut, RotateCcw, Sparkles, Brain, Eye } from "lucide-react";

interface SpatialMapCanvasProps {
  activeWorld: WorldFolder;
  blocks: MemoryBlock[];
  onSelectBlock: (block: MemoryBlock) => void;
  onPlacePinClick: (pinX: number, pinY: number) => void;
}

export const SpatialMapCanvas: React.FC<SpatialMapCanvasProps> = ({
  activeWorld,
  blocks,
  onSelectBlock,
  onPlacePinClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [hoveredBlock, setHoveredBlock] = useState<MemoryBlock | null>(null);

  // Filter blocks belonging to this specific world floor that have pin coordinates
  const floorBlocks = blocks.filter(
    (b) => b.worldId === activeWorld.id && b.pinX !== undefined && b.pinY !== undefined
  );

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent triggering pin creation if clicking an existing pin element
    if ((e.target as HTMLElement).closest(".spatial-pin-badge")) return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pinX = Number(((clickX / rect.width) * 100).toFixed(2));
    const pinY = Number(((clickY / rect.height) * 100).toFixed(2));

    onPlacePinClick(pinX, pinY);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden select-none">
      {/* Top Map Toolbar */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-2 shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-950/50 border border-indigo-500/30 rounded-lg">
          <Brain className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white truncate max-w-[200px]">{activeWorld.name}</span>
          <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
            {floorBlocks.length} Anchors
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            showLabels ? "bg-zinc-800 text-indigo-400 border border-zinc-700" : "text-zinc-400 hover:text-white"
          }`}
          title="Toggle Pin Labels"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Labels</span>
        </button>

        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Instructional Hint */}
      <div className="absolute top-4 right-4 z-30 hidden md:flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-xl px-4 py-2 text-[11px] text-zinc-400 shadow-xl">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>Click anywhere on the map to place a new memory anchor pin</span>
      </div>

      {/* Main Interactive Map Viewport */}
      <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 sm:p-8">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
          className="relative inline-block max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 bg-zinc-900 group/canvas"
        >
          {/* Interactive Image Container */}
          <div
            ref={containerRef}
            onClick={handleImageClick}
            className="relative cursor-crosshair inline-block max-w-full"
          >
            <img
              src={activeWorld.mapImageUrl}
              alt={activeWorld.name}
              className="max-w-full h-auto block select-none pointer-events-none min-w-[500px] min-h-[400px] object-contain"
            />

            {/* Grid Overlay Pattern for Depth */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Rendered Spatial Pins */}
            {floorBlocks.map((block) => {
              const isHovered = hoveredBlock?.id === block.id;
              const posX = block.pinX ?? 50;
              const posY = block.pinY ?? 50;

              return (
                <div
                  key={block.id}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(block);
                  }}
                  className="spatial-pin-badge absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group/pin"
                >
                  {/* Outer Glow Ring */}
                  <div className="absolute inset-0 bg-indigo-500/40 rounded-full blur-md animate-ping pointer-events-none" />

                  {/* Anchor Pin Icon Badge */}
                  <div className="relative w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white hover:scale-125 hover:bg-amber-500 hover:border-amber-200 transition-all duration-200">
                    <MapPin className="w-4 h-4 fill-white text-indigo-600 group-hover/pin:text-amber-500 transition-colors" />
                  </div>

                  {/* Pin Title Label Pill */}
                  {showLabels && (
                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 rounded-full text-[10px] font-bold text-zinc-100 shadow-xl group-hover/pin:border-amber-400 group-hover/pin:text-amber-300 transition-all">
                      {block.pinLabel || block.title}
                    </div>
                  )}

                  {/* Hover Detail Tooltip Card */}
                  {isHovered && (
                    <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-64 p-3 bg-zinc-900/95 backdrop-blur-xl border border-indigo-500/50 rounded-xl shadow-2xl z-50 text-left pointer-events-none animate-fade-in">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          {block.pinLabel || "Anchor Pin"}
                        </span>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                          {block.tags[0] || "Memory"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{block.title}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">{block.text}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

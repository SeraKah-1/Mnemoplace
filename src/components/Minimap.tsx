import React, { useRef, useEffect, useState } from "react";
import { MemoryBlock, WorldFolder } from "../domain/types";
import { PlayerPosition } from "../engine/PlayerController";
import { chunkManager } from "../engine/ChunkManager";
import { pixiApp } from "../engine/PixiApp";
import { Map, X, ZoomIn, ZoomOut, Maximize2, Minimize2, Navigation, Compass } from "lucide-react";

interface MinimapProps {
  worldId: string;
  activeWorld: WorldFolder;
  playerPosition: PlayerPosition;
  blocks: MemoryBlock[];
  themeColor: string;
  onTeleportToTile: (x: number, y: number) => void;
  onClose?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  worldId,
  activeWorld,
  playerPosition,
  blocks,
  themeColor,
  onTeleportToTile,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewRadius, setViewRadius] = useState<number>(30); // 15 = Zoomed In, 60 = Zoomed Out
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const district = chunkManager.getDistrictInfo(worldId, playerPosition.tileX, playerPosition.tileY);

  // Preload map background image if present
  useEffect(() => {
    if (activeWorld.mapImageUrl) {
      const img = new Image();
      img.src = activeWorld.mapImageUrl;
      img.onload = () => setMapImage(img);
    } else {
      setMapImage(null);
    }
  }, [activeWorld.mapImageUrl]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerPx = width / 2;

    ctx.clearRect(0, 0, width, height);

    // 1. Dark Slate Background Base
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    const dims = pixiApp.getMapDimensions();

    // 2. Render Actual Map Content
    if (activeWorld.mapImageUrl && mapImage) {
      // CUSTOM IMAGE MAP MODE: Draw actual skeleton/house diagram
      const playerPxX = playerPosition.x;
      const playerPxY = playerPosition.y;

      // Scale calculations: viewRadius corresponds to tile units (32px per tile unit)
      const visiblePxWidth = viewRadius * 2 * 32;
      const scale = width / visiblePxWidth;

      // Image source crop box
      const sx = playerPxX - visiblePxWidth / 2;
      const sy = playerPxY - visiblePxWidth / 2;
      const sWidth = visiblePxWidth;
      const sHeight = visiblePxWidth;

      // Draw map image
      try {
        ctx.save();
        ctx.drawImage(
          mapImage,
          0, 0, mapImage.naturalWidth || dims.width, mapImage.naturalHeight || dims.height,
          centerPx - playerPxX * scale, centerPx - playerPxY * scale, dims.width * scale, dims.height * scale
        );
        ctx.restore();
      } catch (_) {}
    } else {
      // 2D TILE GRID MODE: Draw actual tile colors on minimap canvas
      const scale = width / (viewRadius * 2);
      const loadedChunks = chunkManager.getLoadedChunks();

      for (const chunk of loadedChunks) {
        for (let r = 0; r < 16; r++) {
          for (let c = 0; c < 16; c++) {
            const tileX = chunk.cx * 16 + c;
            const tileY = chunk.cy * 16 + r;

            const relX = tileX - playerPosition.tileX;
            const relY = tileY - playerPosition.tileY;

            if (Math.abs(relX) <= viewRadius && Math.abs(relY) <= viewRadius) {
              const drawX = centerPx + relX * scale;
              const drawY = centerPx + relY * scale;
              const tileIdx = r * 16 + c;
              const tileType = chunk.tiles[tileIdx] || 0;

              // Tile colors
              let color = themeColor || "#1e293b";
              if (tileType === 1) color = "#334155"; // Cobble
              else if (tileType === 2) color = "#475569"; // Stone
              else if (tileType === 3) color = "#7e22ce"; // Rune
              else if (tileType === 4) color = "#78350f"; // Wood
              else if (tileType === 5) color = "#0f172a"; // Wall
              else if (tileType === 6) color = "#451a03"; // Fence
              else if (tileType === 7) color = "#581c87"; // Obsidian

              ctx.fillStyle = color;
              ctx.fillRect(drawX, drawY, Math.ceil(scale), Math.ceil(scale));
            }
          }
        }
      }
    }

    // 3. Grid Lines Overlay
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    const gridStep = width / 8;
    for (let i = 0; i <= width; i += gridStep) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // 4. Render Memory Anchor Pins
    const scale = width / (viewRadius * 2 * 32);

    for (const b of blocks) {
      let bPxX: number;
      let bPxY: number;

      if (activeWorld.mapImageUrl && b.pinX !== undefined && b.pinY !== undefined) {
        bPxX = (b.pinX / 100) * dims.width;
        bPxY = (b.pinY / 100) * dims.height;
      } else {
        bPxX = b.x * 32 + 16;
        bPxY = b.y * 32 + 16;
      }

      const drawX = centerPx + (bPxX - playerPosition.x) * scale;
      const drawY = centerPx + (bPxY - playerPosition.y) * scale;

      if (drawX >= 0 && drawX <= width && drawY >= 0 && drawY <= height) {
        // Glowing Pin Marker
        ctx.fillStyle = b.doodleId ? "#818cf8" : "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pin Label Text
        if (viewRadius <= 40 && (b.pinLabel || b.title)) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(b.pinLabel || b.title, drawX, drawY - 7);
        }
      }
    }

    // 5. Render Character Marker (Glowing Player Icon with Direction Pointer)
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerPx, centerPx, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerPx, centerPx, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Direction Pointer Arrow
    let angle = 0;
    if (playerPosition.direction === "up") angle = -Math.PI / 2;
    else if (playerPosition.direction === "right") angle = 0;
    else if (playerPosition.direction === "down") angle = Math.PI / 2;
    else if (playerPosition.direction === "left") angle = Math.PI;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(centerPx + Math.cos(angle) * 11, centerPx + Math.sin(angle) * 11);
    ctx.lineTo(centerPx + Math.cos(angle + 2.4) * 6, centerPx + Math.sin(angle + 2.4) * 6);
    ctx.lineTo(centerPx + Math.cos(angle - 2.4) * 6, centerPx + Math.sin(angle - 2.4) * 6);
    ctx.closePath();
    ctx.fill();
  }, [playerPosition, blocks, themeColor, viewRadius, activeWorld, mapImage]);

  // Click Map for Fast Travel Teleportation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const centerPx = width / 2;
    const dims = pixiApp.getMapDimensions();

    if (activeWorld.mapImageUrl) {
      const scale = width / (viewRadius * 2 * 32);
      const targetPxX = playerPosition.x + (clickX - centerPx) / scale;
      const targetPxY = playerPosition.y + (clickY - centerPx) / scale;

      const targetTileX = Math.round(targetPxX / 32);
      const targetTileY = Math.round(targetPxY / 32);
      pixiApp.getPlayerController().setPosition(targetPxX, targetPxY);
      onTeleportToTile(targetTileX, targetTileY);
    } else {
      const scale = width / (viewRadius * 2);
      const relTileX = Math.round((clickX - centerPx) / scale);
      const relTileY = Math.round((clickY - centerPx) / scale);

      const targetTileX = playerPosition.tileX + relTileX;
      const targetTileY = playerPosition.tileY + relTileY;
      onTeleportToTile(targetTileX, targetTileY);
    }
  };

  const handleZoomIn = () => setViewRadius((r) => Math.max(r - 10, 15));
  const handleZoomOut = () => setViewRadius((r) => Math.min(r + 15, 75));

  const canvasSize = isExpanded ? 360 : 220;

  return (
    <div
      className={`jrpg-box p-3 text-slate-100 flex flex-col gap-2 shadow-2xl transition-all duration-200 ${
        isExpanded ? "w-[390px]" : "w-[250px]"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center text-xs border-b-2 border-slate-800 pb-1.5 font-pixel">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span className="font-bold">RADAR MAP</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded"
            title={isExpanded ? "Minimize" : "Expand Map"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Room / Bone Location Badge */}
      <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] font-pixel text-amber-300 truncate flex justify-between items-center">
        <span>📍 {district.roomName}</span>
        <span className="text-[9px] text-zinc-400 font-mono">Zoom: {viewRadius}t</span>
      </div>

      {/* Map Canvas Viewport */}
      <div className="relative border-2 border-indigo-500/40 rounded-xl overflow-hidden cursor-crosshair shadow-2xl bg-zinc-950">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onClick={handleCanvasClick}
          className="block w-full h-full"
          title="Click to Fast Travel / Teleport"
        />

        {/* Outer Radar Ring */}
        <div className="absolute inset-0 border border-cyan-500/20 rounded-xl pointer-events-none" />
      </div>

      <div className="flex justify-between items-center text-[9px] text-zinc-400 font-pixel px-1">
        <span className="flex items-center gap-1">
          <Navigation className="w-2.5 h-2.5 text-cyan-400" /> Click Map to Teleport
        </span>
        <span className="text-amber-400 font-mono font-bold">
          ({playerPosition.tileX}, {playerPosition.tileY})
        </span>
      </div>
    </div>
  );
};

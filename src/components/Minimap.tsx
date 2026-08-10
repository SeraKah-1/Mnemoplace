import React, { useRef, useEffect } from "react";
import { MemoryBlock } from "../domain/types";
import { PlayerPosition } from "../engine/PlayerController";
import { Map, X } from "lucide-react";

interface MinimapProps {
  playerPosition: PlayerPosition;
  blocks: MemoryBlock[];
  themeColor: string;
  onTeleportToTile: (x: number, y: number) => void;
  onClose?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPosition,
  blocks,
  themeColor,
  onTeleportToTile,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const VIEW_RADIUS_TILES = 40; // Overview radius in tiles (-40 to +40 tiles around player)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerPx = canvas.width / 2;
    const scale = canvas.width / (VIEW_RADIUS_TILES * 2);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Render Blocks
    for (const b of blocks) {
      const relX = b.x - playerPosition.tileX;
      const relY = b.y - playerPosition.tileY;

      if (Math.abs(relX) <= VIEW_RADIUS_TILES && Math.abs(relY) <= VIEW_RADIUS_TILES) {
        const drawX = centerPx + relX * scale;
        const drawY = centerPx + relY * scale;

        ctx.fillStyle = b.doodleId ? "#818cf8" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render Player Position (Glowing Dot)
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(centerPx, centerPx, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [playerPosition, blocks, themeColor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerPx = canvas.width / 2;
    const scale = canvas.width / (VIEW_RADIUS_TILES * 2);

    const relTileX = Math.round((clickX - centerPx) / scale);
    const relTileY = Math.round((clickY - centerPx) / scale);

    const targetTileX = playerPosition.tileX + relTileX;
    const targetTileY = playerPosition.tileY + relTileY;

    onTeleportToTile(targetTileX, targetTileY);
  };

  return (
    <div className="jrpg-box p-3 text-slate-100 flex flex-col gap-2 shadow-2xl">
      <div className="flex justify-between items-center text-xs border-b-2 border-slate-800 pb-1.5 font-pixel">
        <span className="font-bold flex items-center gap-1.5 text-cyan-400">
          <Map className="w-3.5 h-3.5" />
          SPATIAL MAP
        </span>
        <span className="text-[10px] text-amber-300">
          ({playerPosition.tileX}, {playerPosition.tileY})
        </span>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="relative border border-zinc-800 rounded-xl overflow-hidden cursor-crosshair shadow-inner">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          onClick={handleCanvasClick}
          className="block w-full h-full"
          title="Click to Fast Travel"
        />
      </div>

      <p className="text-[9px] text-zinc-500 text-center">Click anywhere on minimap to Teleport</p>
    </div>
  );
};

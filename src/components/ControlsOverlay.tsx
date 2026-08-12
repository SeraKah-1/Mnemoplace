import React, { useState } from "react";
import {
  Brain,
  BookOpen,
  Map,
  Folder,
  ShieldCheck,
  Eye,
  EyeOff,
  Hammer,
  Trash2,
  Plus,
  Sparkles,
  Check,
} from "lucide-react";
import { WorldFolder, MemoryBlock } from "../domain/types";

interface ControlsOverlayProps {
  activeWorld: WorldFolder;
  dueCount: number;
  studyMode: boolean;
  buildMode: boolean;
  selectedTileType: number;
  holdingBlock?: MemoryBlock | null;
  onToggleBuildMode: () => void;
  onSelectTileType: (type: number) => void;
  onToggleStudyMode: () => void;
  onOpenFolders: () => void;
  onOpenJournal: () => void;
  onOpenReview: () => void;
  onToggleMinimap: () => void;
  onOpenBackup: () => void;
  onPlaceAnchorClick: () => void;
  onDeleteAtPlayer: () => void;
  onVirtualDirection: (vx: number, vy: number) => void;
  onOpenSync?: () => void;
  onUpdateMapScale?: (scale: number) => void;
  onDropHoldingBlock?: () => void;
  onCancelHoldingBlock?: () => void;
}

export const TILE_BLOCK_TYPES = [
  { id: 0, name: "Grass",         icon: "🌿", color: "bg-emerald-900 border-emerald-500" },
  { id: 1, name: "Cobble",        icon: "🪨", color: "bg-slate-800 border-slate-500" },
  { id: 2, name: "Stone",         icon: "🏛️", color: "bg-indigo-900 border-indigo-500" },
  { id: 3, name: "Rune",          icon: "🔮", color: "bg-purple-950 border-purple-500" },
  { id: 4, name: "Wood",          icon: "🪵", color: "bg-amber-900 border-amber-500" },
  { id: 5, name: "Stone Wall",    icon: "🧱", color: "bg-slate-900 border-slate-400 font-bold" },
  { id: 6, name: "Wood Fence",    icon: "🪵", color: "bg-amber-950 border-amber-600 font-bold" },
  { id: 7, name: "Obsidian Pillar",icon: "🔮", color: "bg-purple-900 border-purple-400 font-bold" },
];

// ── Reusable D-Pad directional button ─────────────────────────────
interface DPadBtnProps {
  vx: number;
  vy: number;
  onDir: (vx: number, vy: number) => void;
  children: React.ReactNode;
  className?: string;
}
const DPadBtn: React.FC<DPadBtnProps> = ({ vx, vy, onDir, children, className = "" }) => (
  <button
    onMouseDown={() => onDir(vx, vy)}
    onMouseUp={() => onDir(0, 0)}
    onMouseLeave={() => onDir(0, 0)}
    onTouchStart={(e) => { e.preventDefault(); onDir(vx, vy); }}
    onTouchEnd={(e) => { e.preventDefault(); onDir(0, 0); }}
    onTouchCancel={() => onDir(0, 0)}
    onPointerDown={(e) => { if (e.pointerType === "touch") e.preventDefault(); onDir(vx, vy); }}
    onPointerUp={() => onDir(0, 0)}
    onPointerCancel={() => onDir(0, 0)}
    className={`flex items-center justify-center select-none active:scale-90 transition-transform ${className}`}
  >
    {children}
  </button>
);

// ── Xbox Face Button (A/B/X/Y) ────────────────────────────────────
interface FaceBtnProps {
  label: string;
  icon: React.ReactNode;
  color: string;           // ring + text color class
  bgColor: string;         // fill bg class
  onClick: () => void;
  badge?: string | number; // optional top-right badge
  title?: string;
}
const FaceBtn: React.FC<FaceBtnProps> = ({ label, icon, color, bgColor, onClick, badge, title }) => (
  <button
    onClick={onClick}
    onTouchStart={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={`relative w-12 h-12 rounded-full ${bgColor} border-2 ${color} flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-90 transition-transform select-none touch-none`}
  >
    {badge !== undefined && (
      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[8px] font-bold font-mono px-1 rounded-full leading-none py-0.5 min-w-[16px] text-center">
        {badge}
      </span>
    )}
    <span className="text-base leading-none">{icon}</span>
    <span className={`text-[7px] font-pixel font-bold ${color.replace("border-", "text-")}`}>{label}</span>
  </button>
);

// ── Bumper / Shoulder button ───────────────────────────────────────
interface BumperBtnProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}
const BumperBtn: React.FC<BumperBtnProps> = ({ label, icon, onClick, active, title }) => (
  <button
    onClick={onClick}
    onTouchStart={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 font-pixel text-[9px] transition-all active:translate-y-0.5 select-none shadow-md touch-none ${
      active
        ? "bg-emerald-800 border-emerald-400 text-emerald-200 animate-pulse"
        : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  activeWorld,
  dueCount,
  studyMode,
  buildMode,
  selectedTileType,
  onToggleBuildMode,
  onSelectTileType,
  onToggleStudyMode,
  onOpenFolders,
  onOpenJournal,
  onOpenReview,
  onToggleMinimap,
  onOpenBackup,
  onPlaceAnchorClick,
  onDeleteAtPlayer,
  onVirtualDirection,
  onOpenSync,
  onUpdateMapScale,
  holdingBlock,
  onDropHoldingBlock,
  onCancelHoldingBlock,
}) => {
  const [showHotbar, setShowHotbar] = useState(false);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between">

      {/* ───── HOLDING ANCHOR BANNER (Top Center) ───────────────── */}
      {holdingBlock && (
        <div className="pointer-events-auto fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="jrpg-box-gold px-4 py-2 flex items-center gap-3 shadow-2xl border-2 border-amber-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-pixel font-bold text-amber-300 truncate max-w-[160px]">
                HOLDING: <span className="text-white font-sans font-bold">{holdingBlock.title}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onDropHoldingBlock}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-pixel font-bold rounded shadow active:scale-95 transition-transform flex items-center gap-1"
                title="Drop Anchor Here (E / Space)"
              >
                <Check className="w-3.5 h-3.5" /> PLACE HERE (E)
              </button>
              {onCancelHoldingBlock && (
                <button
                  onClick={onCancelHoldingBlock}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-pixel rounded shadow"
                  title="Cancel Move (Esc)"
                >
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOP HEADER HUD ─────────────────────────────────────────── */}
      <div className="pointer-events-auto flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 jrpg-box p-2 mx-0 shadow-2xl overflow-x-auto max-w-full">
        {/* Logo + World */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse" />
            <h1 className="text-xs sm:text-sm font-pixel font-bold tracking-wider text-white">
              MNEMO<span className="text-amber-400">PLACE</span>
            </h1>
          </div>

          <button
            onClick={onOpenFolders}
            className="flex items-center gap-1.5 bg-slate-900 border-2 border-indigo-500/60 hover:border-amber-400 px-2.5 py-1 rounded text-[11px] font-pixel text-slate-100 transition-all active:translate-y-0.5"
          >
            <div style={{ backgroundColor: activeWorld.themeColor }} className="w-2.5 h-2.5 rounded-sm border border-white/40" />
            <span className="font-pixel truncate max-w-[90px] sm:max-w-[140px] text-amber-300">{activeWorld.name}</span>
            <Folder className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Right cluster of mode toggles & tool buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Build mode */}
          <button
            onClick={onToggleBuildMode}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-pixel border-2 transition-all active:translate-y-0.5 ${
              buildMode
                ? "bg-emerald-950 border-emerald-500 text-emerald-300 shadow-lg animate-pulse"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-400"
            }`}
            title="Toggle Build Mode (B)"
          >
            <Hammer className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">BUILD</span>
          </button>

          {/* Study mode */}
          <button
            onClick={onToggleStudyMode}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-pixel border-2 transition-all active:translate-y-0.5 ${
              studyMode
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-indigo-950/80 border-indigo-500 text-cyan-300"
            }`}
            title="Toggle Study Mode (Tab)"
          >
            {studyMode ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{studyMode ? "STUDY" : "EXPLORE"}</span>
          </button>

          {/* Map Scale Slider for Custom Image Maps */}
          {activeWorld.mapImageUrl && onUpdateMapScale && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/90 border-2 border-amber-500/60 rounded text-[10px] font-pixel text-indigo-300">
              <span className="font-bold text-amber-400">SCALE:</span>
              <span className="font-mono text-white font-bold">{activeWorld.mapScale || 2.0}x</span>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={activeWorld.mapScale || 2.0}
                onChange={(e) => onUpdateMapScale(parseFloat(e.target.value))}
                className="w-16 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                title="Adjust Map Canvas Exploration Scale"
              />
            </div>
          )}

          {/* SRS review */}
          <button
            onClick={onOpenReview}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-pixel border-2 transition-all active:translate-y-0.5 ${
              dueCount > 0
                ? "bg-amber-500 border-amber-300 text-slate-950 font-bold shadow-lg animate-pulse"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-400"
            }`}
            title="SRS Review (R)"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SRS</span>
            <span className="bg-slate-950 text-amber-400 px-1 text-[10px] font-mono font-bold rounded">
              {dueCount}
            </span>
          </button>

          {/* Journal */}
          <button
            onClick={onOpenJournal}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-cyan-400 rounded transition-all active:translate-y-0.5"
            title="Journal (J)"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Minimap */}
          <button
            onClick={onToggleMinimap}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-violet-400 rounded transition-all active:translate-y-0.5"
            title="Minimap (M)"
          >
            <Map className="w-4 h-4" />
          </button>

          {/* Backup */}
          <button
            onClick={onOpenBackup}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-emerald-400 rounded transition-all active:translate-y-0.5"
            title="Backup Data"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── BUILD HOTBAR (center, appears when build mode on) ─────── */}
      {buildMode && (
        <div className="pointer-events-auto self-center jrpg-box p-2 shadow-2xl flex items-center gap-1.5 animate-fade-in">
          <span className="text-[9px] font-pixel text-emerald-400 font-bold px-1 hidden sm:block">TILE:</span>
          {TILE_BLOCK_TYPES.map((block) => (
            <button
              key={block.id}
              onClick={() => onSelectTileType(block.id)}
              className={`px-2 py-1.5 rounded border-2 font-pixel text-xs flex items-center gap-1 transition-all active:translate-y-0.5 ${
                selectedTileType === block.id
                  ? `${block.color} text-amber-300 ring-2 ring-amber-400 font-bold scale-105`
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              title={`${block.name} (${block.id})`}
            >
              <span>{block.icon}</span>
              <span className="hidden sm:inline text-[10px]">{block.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── BOTTOM BAR: DESKTOP CUES + MOBILE XBOX GAMEPAD ──────── */}
      <div className="pointer-events-auto flex items-end justify-between gap-3 w-full px-3 pb-3">

        {/* ───── LEFT SIDE: D-PAD ──────────────────────────────── */}
        {/* Mobile only */}
        <div className="sm:hidden flex flex-col items-center gap-0">
          {/* D-Pad shell */}
          <div className="relative w-[132px] h-[132px] flex items-center justify-center">
            {/* D-pad cross background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[44px] h-[132px] bg-slate-800 border border-slate-600 rounded-sm opacity-70" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[132px] h-[44px] bg-slate-800 border border-slate-600 rounded-sm opacity-70" />
            </div>

            {/* UP */}
            <DPadBtn vx={0} vy={-1} onDir={onVirtualDirection}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-t-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
            </DPadBtn>

            {/* LEFT */}
            <DPadBtn vx={-1} vy={0} onDir={onVirtualDirection}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-l-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20 12l-8-8v5H4v6h8v5z"/></svg>
            </DPadBtn>

            {/* CENTER dot */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-6 h-6 bg-slate-900 border-2 border-slate-600 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              </div>
            </div>

            {/* RIGHT */}
            <DPadBtn vx={1} vy={0} onDir={onVirtualDirection}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-r-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M4 12l8 8v-5h8v-6h-8V4z"/></svg>
            </DPadBtn>

            {/* DOWN */}
            <DPadBtn vx={0} vy={1} onDir={onVirtualDirection}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-b-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 20l8-8h-5V4h-6v8H4z"/></svg>
            </DPadBtn>
          </div>

          {/* LB / RB shoulder bumpers row above D-pad */}
          <div className="flex gap-2 mb-1 -mt-1 order-first">
            <BumperBtn label="BUILD" icon={<Hammer className="w-3 h-3" />} onClick={onToggleBuildMode} active={buildMode} title="Build Mode (B)" />
            <BumperBtn label="STUDY" icon={studyMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} onClick={onToggleStudyMode} active={studyMode} title="Study Mode (Tab)" />
          </div>
        </div>

        {/* ───── CENTER: START / SELECT (mobile only) ───────────── */}
        <div className="sm:hidden flex flex-col items-center gap-2 self-end mb-4">
          {/* Show/hide hotbar toggle for build tiles */}
          {buildMode && (
            <button
              onClick={() => setShowHotbar(h => !h)}
              className="px-2 py-1 bg-slate-800 border border-slate-600 rounded-full text-[8px] font-pixel text-slate-300 active:bg-slate-700"
            >
              {showHotbar ? "▲ TILES" : "▼ TILES"}
            </button>
          )}

          {/* START = Folder / Floor nav */}
          <button
            onClick={onOpenFolders}
            className="px-3 py-1 bg-slate-800 border-2 border-indigo-500 text-indigo-300 rounded-full text-[9px] font-pixel active:bg-indigo-900 transition-all shadow-md"
            title="Tower Elevator (F)"
          >
            ≡ FLOOR
          </button>

          {/* SELECT = Journal */}
          <button
            onClick={onOpenJournal}
            className="px-3 py-1 bg-slate-800 border-2 border-cyan-600 text-cyan-300 rounded-full text-[9px] font-pixel active:bg-cyan-900 transition-all shadow-md"
            title="Journal (J)"
          >
            ⊟ INDEX
          </button>
        </div>

        {/* ───── DESKTOP KEYBOARD CUE BAR ───────────────────────── */}
        <div className="jrpg-box px-3 py-1.5 text-[10px] font-pixel text-slate-300 hidden sm:flex items-center gap-2.5">
          <span>MOVE: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded font-mono">WASD</kbd></span>
          <span className="text-slate-600">•</span>
          <span>ANCHOR: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-cyan-300 rounded font-mono">E/SPC</kbd></span>
          <span className="text-slate-600">•</span>
          <span>DELETE: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-rose-300 rounded font-mono">DEL/X</kbd></span>
          <span className="text-slate-600">•</span>
          <span>FLOOR: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-emerald-300 rounded font-mono">F</kbd></span>
          <span className="text-slate-600">•</span>
          <span>MAP: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-violet-300 rounded font-mono">M</kbd></span>
          <span className="text-slate-600">•</span>
          <span>BUILD: <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-emerald-300 rounded font-mono">B</kbd></span>
        </div>

        {/* ───── RIGHT SIDE: XBOX FACE BUTTONS ─────────────────── */}
        <div className="sm:hidden flex flex-col items-center gap-0">
          {/* RT / LT shoulder bumpers row above face buttons */}
          <div className="flex gap-2 mb-1">
            <BumperBtn label="MAP" icon={<Map className="w-3 h-3" />} onClick={onToggleMinimap} title="Minimap (M)" />
            <BumperBtn
              label={`SRS ${dueCount > 0 ? `(${dueCount})` : ""}`}
              icon={<Brain className="w-3 h-3" />}
              onClick={onOpenReview}
              active={dueCount > 0}
              title="SRS Review (R)"
            />
          </div>

          {/* Face button diamond  Y
                                 X   B
                                   A          */}
          <div className="relative w-[132px] h-[132px]">
            {/* controller body pill */}
            <div className="absolute inset-4 bg-slate-800/70 border border-slate-600 rounded-full" />

            {/* Y — top: ANCHOR / BUILD TILE */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <FaceBtn
                label={buildMode ? "PAINT" : "ANCHOR"}
                icon={buildMode ? <Sparkles className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                color={buildMode ? "border-emerald-400 text-emerald-300" : "border-amber-400 text-amber-300"}
                bgColor={buildMode ? "bg-emerald-900" : "bg-amber-900"}
                onClick={onPlaceAnchorClick}
                title={buildMode ? "Paint Selected Tile" : "Place Anchor (E)"}
              />
            </div>

            {/* X — left: JOURNAL */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <FaceBtn
                label="JOURNAL"
                icon={<BookOpen className="w-4 h-4" />}
                color="border-sky-400 text-sky-300"
                bgColor="bg-sky-900"
                onClick={onOpenJournal}
                title="Journal (J)"
              />
            </div>

            {/* B — right: DELETE / ERASE */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <FaceBtn
                label={buildMode ? "ERASE" : "DELETE"}
                icon={<Trash2 className="w-4 h-4" />}
                color="border-rose-400 text-rose-300"
                bgColor="bg-rose-900"
                onClick={onDeleteAtPlayer}
                title={buildMode ? "Erase Tile / Wall (DEL)" : "Delete block (DEL)"}
              />
            </div>

            {/* A — bottom: BACKUP */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <FaceBtn
                label="BACKUP"
                icon={<ShieldCheck className="w-4 h-4" />}
                color="border-emerald-400 text-emerald-300"
                bgColor="bg-emerald-900"
                onClick={onOpenBackup}
                title="Backup Data"
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── MOBILE BUILD HOTBAR (full-width slide up) ──────────── */}
      {buildMode && showHotbar && (
        <div className="sm:hidden pointer-events-auto fixed bottom-40 left-0 right-0 flex justify-center z-40">
          <div className="jrpg-box p-2 flex items-center gap-1.5 shadow-2xl animate-fade-in overflow-x-auto max-w-full">
            {TILE_BLOCK_TYPES.map((block) => (
              <button
                key={block.id}
                onClick={() => { onSelectTileType(block.id); setShowHotbar(false); }}
                className={`px-2.5 py-1.5 rounded border-2 font-pixel text-[10px] flex flex-col items-center gap-0.5 transition-all active:translate-y-0.5 flex-shrink-0 ${
                  selectedTileType === block.id
                    ? `${block.color} text-amber-300 ring-2 ring-amber-400 font-bold scale-105`
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                <span className="text-base">{block.icon}</span>
                <span className="text-[8px] leading-none">{block.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

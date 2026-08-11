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
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
} from "lucide-react";
import { WorldFolder } from "../domain/types";

interface ControlsOverlayProps {
  activeWorld: WorldFolder;
  dueCount: number;
  studyMode: boolean;
  buildMode: boolean;
  selectedTileType: number;
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
}

export const TILE_BLOCK_TYPES = [
  { id: 0, name: "Grass", icon: "🌿", color: "bg-emerald-900 border-emerald-500" },
  { id: 1, name: "Cobble", icon: "🪨", color: "bg-slate-800 border-slate-500" },
  { id: 2, name: "Stone", icon: "🏛️", color: "bg-indigo-900 border-indigo-500" },
  { id: 3, name: "Rune", icon: "🔮", color: "bg-purple-950 border-purple-500" },
  { id: 4, name: "Wood", icon: "🪵", color: "bg-amber-900 border-amber-500" },
  { id: 5, name: "Stone Wall", icon: "🧱", color: "bg-slate-900 border-slate-400 font-bold" },
  { id: 6, name: "Wood Fence", icon: "🪵", color: "bg-amber-950 border-amber-600 font-bold" },
  { id: 7, name: "Obsidian Pillar", icon: "🔮", color: "bg-purple-900 border-purple-400 font-bold" },
];

// ── Reusable D-Pad directional button with mobile touch optimization ───
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
    onTouchStart={(e) => {
      e.preventDefault();
      onDir(vx, vy);
    }}
    onTouchEnd={(e) => {
      e.preventDefault();
      onDir(0, 0);
    }}
    onTouchCancel={() => onDir(0, 0)}
    onPointerDown={(e) => {
      if (e.pointerType === "touch") e.preventDefault();
      onDir(vx, vy);
    }}
    onPointerUp={() => onDir(0, 0)}
    onPointerCancel={() => onDir(0, 0)}
    className={`flex items-center justify-center select-none active:scale-95 transition-transform touch-none ${className}`}
  >
    {children}
  </button>
);

// ── Xbox Face Button (A/B/X/Y) ────────────────────────────────────
interface FaceBtnProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: string | number;
  title?: string;
}
const FaceBtn: React.FC<FaceBtnProps> = ({ label, icon, color, bgColor, onClick, badge, title }) => (
  <button
    onClick={onClick}
    title={title}
    onTouchStart={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 ${color} ${bgColor} shadow-lg active:scale-90 transition-transform select-none touch-none`}
  >
    {badge !== undefined && badge !== 0 && (
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
    title={title}
    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 font-pixel text-[9px] transition-all active:translate-y-0.5 select-none shadow-md ${
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
}) => {
  const [showHotbar, setShowHotbar] = useState(false);
  const [isHudHidden, setIsHudHidden] = useState(false);
  const [isGamepadHidden, setIsGamepadHidden] = useState(false);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between">
      {/* ── TOP HEADER HUD (Collapsible) ─────────────────────────── */}
      {isHudHidden ? (
        /* Collapsed Floating Immersive Pill */
        <div className="pointer-events-auto flex items-center justify-between p-2 m-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl max-w-fit animate-fade-in">
          <button
            onClick={() => setIsHudHidden(false)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            title="Expand Full HUD Controls"
          >
            <Eye className="w-4 h-4 text-amber-300" />
            <span>Show HUD</span>
          </button>
        </div>
      ) : (
        /* Full Expanded Top HUD Bar */
        <div className="pointer-events-auto flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 jrpg-box p-2 mx-0 shadow-2xl overflow-x-auto max-w-full">
          {/* Logo + World Selector */}
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

          {/* Right Cluster of Mode Toggles & Tools */}
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
                  className="w-16 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 touch-manipulation"
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

            {/* Hide HUD Toggle Button */}
            <button
              onClick={() => setIsHudHidden(true)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border-2 border-amber-400/80 text-amber-300 rounded transition-all active:translate-y-0.5"
              title="Hide HUD (Immersive View)"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── BUILD HOTBAR (center, appears when build mode on) ─────── */}
      {buildMode && !isHudHidden && (
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

      {/* ── BOTTOM BAR: MOBILE TOUCH GAMEPAD & ACTION BUTTONS ─────── */}
      {!isGamepadHidden && (
        <div className="pointer-events-auto flex items-end justify-between gap-3 w-full px-3 pb-3">
          {/* ───── LEFT SIDE: MOBILE TOUCH D-PAD ───────────────────── */}
          <div className="sm:hidden flex flex-col items-center gap-0 opacity-85 hover:opacity-100 transition-opacity">
            <div className="relative w-[132px] h-[132px] flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[44px] h-[132px] bg-slate-800/90 border border-slate-600 rounded-sm" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[132px] h-[44px] bg-slate-800/90 border border-slate-600 rounded-sm" />
              </div>

              {/* UP */}
              <DPadBtn
                vx={0}
                vy={-1}
                onDir={onVirtualDirection}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-t-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300 shadow-md"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 4l-8 8h5v8h6v-8h5z" />
                </svg>
              </DPadBtn>

              {/* LEFT */}
              <DPadBtn
                vx={-1}
                vy={0}
                onDir={onVirtualDirection}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-l-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300 shadow-md"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M20 12l-8-8v5H4v6h8v5z" />
                </svg>
              </DPadBtn>

              {/* CENTER DOT */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 bg-slate-900 border-2 border-slate-600 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                </div>
              </div>

              {/* RIGHT */}
              <DPadBtn
                vx={1}
                vy={0}
                onDir={onVirtualDirection}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-r-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300 shadow-md"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M4 12l8 8v-5h8v-6h-8V4z" />
                </svg>
              </DPadBtn>

              {/* DOWN */}
              <DPadBtn
                vx={0}
                vy={1}
                onDir={onVirtualDirection}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44px] h-[44px] bg-slate-700 border-2 border-slate-500 rounded-b-lg hover:bg-indigo-700 active:bg-indigo-600 text-cyan-300 shadow-md"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 20l8-8h-5V4h-6v8H4z" />
                </svg>
              </DPadBtn>
            </div>

            {/* LB / RB Shoulder Bumpers */}
            <div className="flex gap-2 mb-1 -mt-1 order-first">
              <BumperBtn
                label="BUILD"
                icon={<Hammer className="w-3 h-3" />}
                onClick={onToggleBuildMode}
                active={buildMode}
                title="Build Mode (B)"
              />
              <BumperBtn
                label="STUDY"
                icon={studyMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                onClick={onToggleStudyMode}
                active={studyMode}
                title="Study Mode (Tab)"
              />
            </div>
          </div>

          {/* ───── CENTER: MOBILE QUICK TOGGLES ───────────────────── */}
          <div className="sm:hidden flex flex-col items-center gap-2 self-end mb-2">
            <button
              onClick={() => setIsGamepadHidden(!isGamepadHidden)}
              className="px-2.5 py-1 bg-slate-900/90 border border-slate-700 rounded-full text-[9px] font-pixel text-slate-300 active:bg-slate-800 shadow"
            >
              🎮 Touch Pad
            </button>
          </div>

          {/* ───── RIGHT SIDE: MOBILE FACE BUTTONS (A/B/X/Y) ───────── */}
          <div className="sm:hidden flex flex-col items-center opacity-85 hover:opacity-100 transition-opacity">
            <div className="relative w-[132px] h-[132px]">
              <div className="absolute inset-4 bg-slate-800/70 border border-slate-600 rounded-full" />

              {/* Y — Top: ANCHOR / PLACE */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <FaceBtn
                  label="ANCHOR"
                  icon={<Plus className="w-4 h-4" />}
                  color="border-amber-400 text-amber-300"
                  bgColor="bg-amber-900"
                  onClick={onPlaceAnchorClick}
                  title="Place Anchor (E)"
                />
              </div>

              {/* X — Left: JOURNAL */}
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

              {/* B — Right: DELETE */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <FaceBtn
                  label="DELETE"
                  icon={<Trash2 className="w-4 h-4" />}
                  color="border-rose-400 text-rose-300"
                  bgColor="bg-rose-900"
                  onClick={onDeleteAtPlayer}
                  title="Delete block (DEL)"
                />
              </div>

              {/* A — Bottom: BACKUP */}
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
      )}
    </div>
  );
};

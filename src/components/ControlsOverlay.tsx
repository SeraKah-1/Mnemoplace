import React from "react";
import { Brain, BookOpen, Map, Folder, ShieldCheck, Eye, EyeOff, Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { WorldFolder, MemoryBlock } from "../domain/types";

interface ControlsOverlayProps {
  activeWorld: WorldFolder;
  dueCount: number;
  studyMode: boolean;
  onToggleStudyMode: () => void;
  onOpenFolders: () => void;
  onOpenJournal: () => void;
  onOpenReview: () => void;
  onToggleMinimap: () => void;
  onOpenBackup: () => void;
  onPlaceAnchorClick: () => void;
  onVirtualDirection: (vx: number, vy: number) => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  activeWorld,
  dueCount,
  studyMode,
  onToggleStudyMode,
  onOpenFolders,
  onOpenJournal,
  onOpenReview,
  onToggleMinimap,
  onOpenBackup,
  onPlaceAnchorClick,
  onVirtualDirection,
}) => {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-4 crt-scanlines">
      {/* Top Retro JRPG Header Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 jrpg-box p-2.5 sm:p-3 shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse" />
            <h1 className="text-xs sm:text-sm font-pixel font-bold tracking-wider text-white">
              MNEMO<span className="text-amber-400">PLACE</span>
            </h1>
          </div>

          {/* Active World Realm Selector Badge */}
          <button
            onClick={onOpenFolders}
            className="flex items-center gap-1.5 bg-slate-900 border-2 border-indigo-500/60 hover:border-amber-400 px-2.5 py-1 rounded text-[11px] font-pixel text-slate-100 transition-all active:translate-y-0.5"
          >
            <div style={{ backgroundColor: activeWorld.themeColor }} className="w-2.5 h-2.5 rounded-sm border border-white/40" />
            <span className="font-pixel truncate max-w-[100px] sm:max-w-[140px] text-amber-300">{activeWorld.name}</span>
            <Folder className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle (Explore Cue vs Study Reveal) */}
          <button
            onClick={onToggleStudyMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-pixel border-2 transition-all active:translate-y-0.5 ${
              studyMode
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-indigo-950/80 border-indigo-500 text-cyan-300"
            }`}
            title="Toggle between Cue Mode (Active Recall) and Study Mode (Full Reveal)"
          >
            {studyMode ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{studyMode ? "STUDY (REVEAL)" : "EXPLORE (CUE)"}</span>
          </button>

          {/* FSRS Review Queue Badge */}
          <button
            onClick={onOpenReview}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-pixel border-2 transition-all active:translate-y-0.5 ${
              dueCount > 0
                ? "bg-amber-500 border-amber-300 text-slate-950 font-bold shadow-lg animate-pulse"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-400"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SRS REVIEW</span>
            <span className="bg-slate-950 text-amber-400 px-1 py-0.2 text-[10px] font-mono font-bold rounded">
              {dueCount}
            </span>
          </button>

          {/* Journal Search */}
          <button
            onClick={onOpenJournal}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-cyan-400 rounded transition-all active:translate-y-0.5"
            title="Memory Journal & Index"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Backup Data */}
          <button
            onClick={onOpenBackup}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-emerald-400 rounded transition-all active:translate-y-0.5"
            title="JSON Backup & Data Safety"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Bar & JRPG Mobile Virtual Controls */}
      <div className="pointer-events-auto flex items-end justify-between gap-3 w-full">
        {/* Mobile Virtual D-pad Controller (Tactile 4-Way Directional Cross) */}
        <div className="jrpg-box p-2 flex flex-col items-center gap-1 sm:hidden select-none">
          <button
            onMouseDown={() => onVirtualDirection(0, -1)}
            onMouseUp={() => onVirtualDirection(0, 0)}
            onTouchStart={(e) => { e.preventDefault(); onVirtualDirection(0, -1); }}
            onTouchEnd={(e) => { e.preventDefault(); onVirtualDirection(0, 0); }}
            className="w-12 h-12 bg-slate-800 active:bg-indigo-600 border-2 border-slate-600 rounded flex items-center justify-center text-white active:scale-95 shadow-md"
          >
            <ArrowUp className="w-6 h-6 text-cyan-400" />
          </button>
          <div className="flex gap-1">
            <button
              onMouseDown={() => onVirtualDirection(-1, 0)}
              onMouseUp={() => onVirtualDirection(0, 0)}
              onTouchStart={(e) => { e.preventDefault(); onVirtualDirection(-1, 0); }}
              onTouchEnd={(e) => { e.preventDefault(); onVirtualDirection(0, 0); }}
              className="w-12 h-12 bg-slate-800 active:bg-indigo-600 border-2 border-slate-600 rounded flex items-center justify-center text-white active:scale-95 shadow-md"
            >
              <ArrowLeft className="w-6 h-6 text-cyan-400" />
            </button>
            <div className="w-12 h-12 bg-slate-950 border-2 border-slate-800 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
            </div>
            <button
              onMouseDown={() => onVirtualDirection(1, 0)}
              onMouseUp={() => onVirtualDirection(0, 0)}
              onTouchStart={(e) => { e.preventDefault(); onVirtualDirection(1, 0); }}
              onTouchEnd={(e) => { e.preventDefault(); onVirtualDirection(0, 0); }}
              className="w-12 h-12 bg-slate-800 active:bg-indigo-600 border-2 border-slate-600 rounded flex items-center justify-center text-white active:scale-95 shadow-md"
            >
              <ArrowRight className="w-6 h-6 text-cyan-400" />
            </button>
          </div>
          <button
            onMouseDown={() => onVirtualDirection(0, 1)}
            onMouseUp={() => onVirtualDirection(0, 0)}
            onTouchStart={(e) => { e.preventDefault(); onVirtualDirection(0, 1); }}
            onTouchEnd={(e) => { e.preventDefault(); onVirtualDirection(0, 0); }}
            className="w-12 h-12 bg-slate-800 active:bg-indigo-600 border-2 border-slate-600 rounded flex items-center justify-center text-white active:scale-95 shadow-md"
          >
            <ArrowDown className="w-6 h-6 text-cyan-400" />
          </button>
        </div>

        {/* Desktop Retro Keyboard Cue Bar */}
        <div className="jrpg-box px-3 py-1.5 text-[11px] font-pixel text-slate-300 hidden sm:flex items-center gap-3">
          <span>
            MOVE: <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded font-mono">WASD</kbd> /{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded font-mono">ARROWS</kbd>
          </span>
          <span className="text-slate-600">•</span>
          <span>TAP ANY TILE TO PLACE MEMORY ANCHOR</span>
        </div>

        {/* Mobile JRPG Retro Action Buttons (A / B / X / Y) */}
        <div className="flex items-center gap-2">
          {/* Action Button A (Place Anchor) */}
          <button
            onClick={onPlaceAnchorClick}
            className="jrpg-btn px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-pixel font-bold rounded flex items-center gap-1.5 shadow-xl active:translate-y-0.5"
          >
            <span className="w-5 h-5 bg-amber-400 text-slate-950 rounded font-mono font-bold flex items-center justify-center text-xs">
              A
            </span>
            <span>ANCHOR</span>
          </button>

          {/* Minimap Toggle */}
          <button
            onClick={onToggleMinimap}
            className="jrpg-btn px-2.5 py-2 sm:px-3.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-pixel rounded flex items-center gap-1.5 shadow-xl active:translate-y-0.5"
          >
            <Map className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">MAP</span>
          </button>
        </div>
      </div>
    </div>
  );
};

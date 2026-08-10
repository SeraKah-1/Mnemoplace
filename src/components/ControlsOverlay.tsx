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
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Header Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md rounded-2xl p-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            <h1 className="text-base font-bold tracking-tight text-white hidden sm:block">
              Mnemo<span className="text-indigo-400">Place</span>
            </h1>
          </div>

          {/* Active World Realm Selector Badge */}
          <button
            onClick={onOpenFolders}
            className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 px-3 py-1.5 rounded-xl text-xs text-white transition-all"
          >
            <div style={{ backgroundColor: activeWorld.themeColor }} className="w-3 h-3 rounded-full border border-white/20" />
            <span className="font-semibold truncate max-w-[140px]">{activeWorld.name}</span>
            <Folder className="w-3.5 h-3.5 text-zinc-500" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle (Explore Cue vs Study Reveal) */}
          <button
            onClick={onToggleStudyMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              studyMode
                ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                : "bg-indigo-950/60 border-indigo-800/60 text-indigo-300"
            }`}
            title="Toggle between Cue Mode (active recall) and Study Mode (full reveal)"
          >
            {studyMode ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="hidden md:inline">{studyMode ? "Study (Reveal) Mode" : "Explore (Cue) Mode"}</span>
          </button>

          {/* FSRS Review Queue Badge */}
          <button
            onClick={onOpenReview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all relative ${
              dueCount > 0
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg animate-pulse"
                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>SRS Review</span>
            {dueCount > 0 && (
              <span className="bg-amber-400 text-zinc-950 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full">
                {dueCount}
              </span>
            )}
          </button>

          {/* Journal Search */}
          <button
            onClick={onOpenJournal}
            className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl transition-all"
            title="Memory Journal & Index"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Backup Data */}
          <button
            onClick={onOpenBackup}
            className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl transition-all"
            title="JSON Backup & Data Safety"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Bar & Controls */}
      <div className="pointer-events-auto flex items-end justify-between gap-4">
        {/* Mobile Virtual D-pad Joystick */}
        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-md rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-1 sm:hidden">
          <button
            onMouseDown={() => onVirtualDirection(0, -1)}
            onMouseUp={() => onVirtualDirection(0, 0)}
            onTouchStart={() => onVirtualDirection(0, -1)}
            onTouchEnd={() => onVirtualDirection(0, 0)}
            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-200 active:scale-95"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex gap-1">
            <button
              onMouseDown={() => onVirtualDirection(-1, 0)}
              onMouseUp={() => onVirtualDirection(0, 0)}
              onTouchStart={() => onVirtualDirection(-1, 0)}
              onTouchEnd={() => onVirtualDirection(0, 0)}
              className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-200 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onMouseDown={() => onVirtualDirection(0, 1)}
              onMouseUp={() => onVirtualDirection(0, 0)}
              onTouchStart={() => onVirtualDirection(0, 1)}
              onTouchEnd={() => onVirtualDirection(0, 0)}
              className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-200 active:scale-95"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              onMouseDown={() => onVirtualDirection(1, 0)}
              onMouseUp={() => onVirtualDirection(0, 0)}
              onTouchStart={() => onVirtualDirection(1, 0)}
              onTouchEnd={() => onVirtualDirection(0, 0)}
              className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-200 active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop Helper Instruction Cues */}
        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-md rounded-2xl px-4 py-2 text-[11px] text-zinc-400 hidden sm:flex items-center gap-3">
          <span>
            Move: <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded font-mono">WASD</kbd> /{" "}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded font-mono">Arrows</kbd>
          </span>
          <span>•</span>
          <span>Click any tile to Place Anchor</span>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMinimap}
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-2xl shadow-xl flex items-center gap-2 transition-all active:scale-95"
          >
            <Map className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Spatial Minimap</span>
          </button>

          <button
            onClick={onPlaceAnchorClick}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-2xl flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Place Anchor</span>
          </button>
        </div>
      </div>
    </div>
  );
};

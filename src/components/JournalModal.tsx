import React, { useState } from "react";
import { MemoryBlock, WorldFolder } from "../domain/types";
import { Search, Navigation, Tag, Calendar, X, BookOpen, Clock } from "lucide-react";

interface JournalModalProps {
  blocks: MemoryBlock[];
  worlds: WorldFolder[];
  activeWorldId: string;
  onTeleportToBlock: (worldId: string, x: number, y: number) => void;
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  blocks,
  worlds,
  activeWorldId,
  onTeleportToBlock,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedWorldId, setSelectedWorldId] = useState<string>(activeWorldId);

  // Extract all unique tags
  const allTags = Array.from(new Set(blocks.flatMap((b) => b.tags)));

  // Filter blocks
  const filteredBlocks = blocks.filter((b) => {
    if (selectedWorldId !== "all" && b.worldId !== selectedWorldId) return false;
    if (selectedTag && !b.tags.includes(selectedTag)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchText = b.text.toLowerCase().includes(q);
      const matchTag = b.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchText || matchTag;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 crt-scanlines">
      <div className="jrpg-box p-5 w-full max-w-2xl h-[85vh] flex flex-col gap-4 text-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-pixel font-bold text-amber-300 leading-tight">MEMORY JOURNAL & INDEX</h2>
              <p className="text-[10px] font-pixel text-slate-400 mt-0.5">Search and fast travel to any spatial anchor</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, notes, or tags..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedWorldId}
            onChange={(e) => setSelectedWorldId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All World Realms</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" /> Tags:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${
                selectedTag === null ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${
                  selectedTag === t
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredBlocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <BookOpen className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-sm font-semibold">No memory anchors found</p>
              <p className="text-xs text-zinc-600 max-w-xs mt-1">
                Try adjusting your search keywords or create new blocks by clicking on tiles in the world.
              </p>
            </div>
          ) : (
            filteredBlocks.map((b) => {
              const worldName = worlds.find((w) => w.id === b.worldId)?.name || b.worldId;
              const isDue = b.srs.due <= Date.now();

              return (
                <div
                  key={b.id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 p-4 rounded-xl transition-all flex justify-between items-start gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-md font-mono">
                        {worldName} ({b.x}, {b.y})
                      </span>
                      {isDue && (
                        <span className="text-[9px] bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          SRS Due for Review
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {b.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 whitespace-pre-wrap">{b.text}</p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        Added: {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        Next SRS: {new Date(b.srs.due).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onTeleportToBlock(b.worldId, b.x, b.y);
                      onClose();
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-1.5 flex-shrink-0 transition-all active:scale-95"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Teleport
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

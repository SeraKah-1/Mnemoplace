import React, { useState } from "react";
import { WorldFolder } from "../domain/types";
import { saveWorld, deleteWorld } from "../domain/db";
import { Folder, Plus, Trash2, Check, X, Palette } from "lucide-react";

interface FolderModalProps {
  worlds: WorldFolder[];
  activeWorldId: string;
  onSelectWorld: (worldId: string) => void;
  onRefreshWorlds: () => void;
  onClose: () => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  worlds,
  activeWorldId,
  onSelectWorld,
  onRefreshWorlds,
  onClose,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState("#6366f1");

  const handleCreateWorld = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newWorld: WorldFolder = {
      id: `world_${crypto.randomUUID()}`,
      name: name.trim(),
      description: description.trim(),
      themeColor,
      spawnX: 0,
      spawnY: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveWorld(newWorld);
    onRefreshWorlds();
    onSelectWorld(newWorld.id);
    setName("");
    setDescription("");
    setShowCreateForm(false);
  };

  const handleDelete = async (worldId: string) => {
    if (worlds.length <= 1) {
      alert("Cannot delete the only remaining world realm.");
      return;
    }
    if (confirm("Are you sure you want to delete this memory world realm and all its anchors?")) {
      await deleteWorld(worldId);
      onRefreshWorlds();
      if (worldId === activeWorldId) {
        const remaining = worlds.find((w) => w.id !== worldId);
        if (remaining) onSelectWorld(remaining.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 crt-scanlines">
      <div className="jrpg-box p-5 w-full max-w-lg flex flex-col gap-4 text-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-pixel font-bold text-amber-300 leading-tight">MEMORY WORLD REALMS</h2>
              <p className="text-[10px] font-pixel text-slate-400 mt-0.5">Separate topics into distinct spatial realms</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Worlds */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {worlds.map((w) => {
            const isActive = w.id === activeWorldId;
            return (
              <div
                key={w.id}
                onClick={() => {
                  onSelectWorld(w.id);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                  isActive
                    ? "bg-indigo-950/60 border-indigo-500 shadow-lg ring-1 ring-indigo-500/40"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: w.themeColor }}
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm flex-shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {w.name}
                      {isActive && (
                        <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.2 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </h3>
                    {w.description && <p className="text-xs text-zinc-400 mt-0.5">{w.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {worlds.length > 1 && (
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-900"
                      title="Delete World"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create New World Form */}
        {showCreateForm ? (
          <form onSubmit={handleCreateWorld} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Create New World Realm</h3>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Realm Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Japanese Kanji, Quantum Mechanics, AWS Architecture"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Topic notes and goals"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Palette className="w-3 h-3 text-indigo-400" /> Theme Accent:
              </label>
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-8 h-8 rounded border border-zinc-700 bg-zinc-900 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Create Realm
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-indigo-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Create New World Realm
          </button>
        )}
      </div>
    </div>
  );
};

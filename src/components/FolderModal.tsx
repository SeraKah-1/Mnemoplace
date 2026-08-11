import React, { useState } from "react";
import { WorldFolder } from "../domain/types";
import { saveWorld, deleteWorld } from "../domain/db";
import { BUILTIN_PRESETS, FloorPreset } from "../presets";
import { Folder, Plus, Trash2, Check, X, Palette, Image as ImageIcon, LayoutGrid, Upload, Sparkles } from "lucide-react";

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
  const [mapMode, setMapMode] = useState<"grid" | "image">("image");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("preset-skeleton");
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [mapScale, setMapScale] = useState<number>(2.5);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomImageUrl(event.target.result as string);
        setSelectedPresetId("custom");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateWorld = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalImageUrl: string | undefined = undefined;
    if (mapMode === "image") {
      if (selectedPresetId === "custom" && customImageUrl) {
        finalImageUrl = customImageUrl;
      } else {
        const preset = BUILTIN_PRESETS.find((p) => p.id === selectedPresetId);
        finalImageUrl = preset?.imageUrl || BUILTIN_PRESETS[0].imageUrl;
      }
    }

    const newWorld: WorldFolder = {
      id: `world_${crypto.randomUUID()}`,
      name: name.trim(),
      description: description.trim(),
      themeColor,
      mapMode,
      mapImageUrl: finalImageUrl,
      mapScale: mapMode === "image" ? mapScale : undefined,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="jrpg-box p-5 w-full max-w-lg flex flex-col gap-4 text-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-pixel font-bold text-amber-300 leading-tight">TOWER ELEVATOR & REALM FLOORS</h2>
              <p className="text-[10px] font-pixel text-slate-400 mt-0.5">Ascend/Descend between distinct tower floors</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Tower Floors */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {worlds.map((w, idx) => {
            const isActive = w.id === activeWorldId;
            const floorNum = w.floorNumber || idx + 1;
            const isImageMap = w.mapMode === "image" || Boolean(w.mapImageUrl);

            return (
              <div
                key={w.id}
                onClick={() => {
                  onSelectWorld(w.id);
                  onClose();
                }}
                className={`p-3 rounded border-2 flex justify-between items-center cursor-pointer transition-all ${
                  isActive
                    ? "bg-indigo-950 border-amber-400 shadow-lg"
                    : "bg-slate-950 border-slate-800 hover:border-indigo-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-slate-900 border border-slate-700 rounded font-pixel text-amber-300 text-xs font-bold flex items-center justify-center">
                    F{floorNum}
                  </div>
                  <div>
                    <h3 className="text-xs font-pixel font-bold text-white flex items-center gap-2">
                      {w.name}
                      {isImageMap ? (
                        <span className="text-[9px] font-pixel bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5" /> SPATIAL MAP
                        </span>
                      ) : (
                        <span className="text-[9px] font-pixel bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                          <LayoutGrid className="w-2.5 h-2.5" /> 2D TILE REALM
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[9px] font-pixel bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                          CURRENT
                        </span>
                      )}
                    </h3>
                    {w.description && <p className="text-[10px] font-pixel text-slate-400 mt-0.5">{w.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {worlds.length > 1 && (
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900"
                      title="Delete Tower Floor"
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
          <form onSubmit={handleCreateWorld} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Create New Floor Realm
            </h3>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Floor Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Human Skeleton Anatomy, House Floor Plan, AWS Architecture"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about bones, rooms, or concepts mapped to this floor"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
              />
            </div>

            {/* Map Mode Choice */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Map Type</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMapMode("image")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    mapMode === "image"
                      ? "bg-indigo-950/80 border-indigo-500 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-bold">Custom Image / Diagram</div>
                    <div className="text-[9px] text-zinc-400">Skeleton, House Plan, Biology Diagram</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMapMode("grid")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    mapMode === "grid"
                      ? "bg-indigo-950/80 border-indigo-500 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold">2D RPG Tile Grid</div>
                    <div className="text-[9px] text-zinc-400">Tile-by-tile exploration & building</div>
                  </div>
                </button>
              </div>
            </div>

            {/* If Image Map Mode Selected: Choose Preset or Upload */}
            {mapMode === "image" && (
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Select Floor Image / Diagram
                </label>

                {/* Built-in Presets */}
                <div className="grid grid-cols-2 gap-2">
                  {BUILTIN_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                        selectedPresetId === preset.id
                          ? "bg-indigo-950 border-amber-400 shadow-md"
                          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-full h-16 bg-zinc-950 rounded overflow-hidden flex items-center justify-center border border-zinc-800">
                        <img src={preset.imageUrl} alt={preset.title} className="w-full h-full object-contain" />
                      </div>
                      <div className="text-[11px] font-bold text-white truncate">{preset.title}</div>
                      <div className="text-[9px] text-zinc-400 line-clamp-1">{preset.description}</div>
                    </div>
                  ))}
                </div>

                {/* Custom Upload Input */}
                <div className="pt-1">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-1">
                    Or Upload Your Own Image (e.g. Human Skeleton, Anatomy, Floorplan)
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-zinc-300">
                      {customImageUrl ? "Image uploaded! (Click to change)" : "Upload Custom Image (PNG, JPG, WebP)"}
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Map Scale Selector */}
                <div className="pt-2 border-t border-zinc-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
                      Map Exploration Canvas Scale ({mapScale}x)
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono font-bold">
                      {Math.round(1000 * mapScale)}px × {Math.round(1000 * mapScale)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.5"
                    value={mapScale}
                    onChange={(e) => setMapScale(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <p className="text-[9px] text-zinc-400 mt-1 leading-tight">
                    Adjust canvas size so your 2D character has plenty of space to walk freely across the diagram.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
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
                <Check className="w-3.5 h-3.5" /> Create Floor
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Floor / Custom Map
          </button>
        )}
      </div>
    </div>
  );
};

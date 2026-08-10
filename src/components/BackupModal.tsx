import React, { useRef } from "react";
import { exportFullDatabase, importFullDatabase, DatabaseBackup } from "../domain/db";
import { Download, Upload, ShieldCheck, RefreshCw, X } from "lucide-react";

interface BackupModalProps {
  onDatabaseImported: () => void;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ onDatabaseImported, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      const backup = await exportFullDatabase();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mnemoplace_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export database backup.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData: DatabaseBackup = JSON.parse(text);

      if (!backupData.meta || !backupData.worlds || !backupData.blocks) {
        throw new Error("Invalid backup file structure.");
      }

      if (confirm(`Import backup from ${new Date(backupData.exportedAt).toLocaleDateString()}? This will replace your current memory data.`)) {
        await importFullDatabase(backupData);
        alert("Database successfully restored!");
        onDatabaseImported();
        onClose();
      }
    } catch (err: any) {
      console.error("Import failed:", err);
      alert(`Failed to import backup: ${err.message || err}`);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="jrpg-box p-5 w-full max-w-md flex flex-col gap-4 text-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-pixel font-bold text-amber-300 leading-tight">DATA SAFETY & JSON BACKUP</h2>
              <p className="text-[10px] font-pixel text-slate-400 mt-0.5">Local-first IndexedDB backup</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Export */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-400" /> Export JSON Backup
            </h3>
            <p className="text-xs text-zinc-400">
              Download your complete memory palace (worlds, custom doodles, blocks, and FSRS review states) as a portable JSON file.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Backup (.json)
            </button>
          </div>

          {/* Import */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-400" /> Restore JSON Backup
            </h3>
            <p className="text-xs text-zinc-400">
              Upload a previously exported `.json` backup file to restore your memory palaces on any device.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-emerald-400" /> Choose Backup File...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

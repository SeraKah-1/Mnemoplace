// ─── AuthModal: Google / GitHub OAuth + Cloud Sync Status ─────────────
import React, { useState, useEffect, useCallback } from "react";
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithGitHub,
  signOut,
  getUser,
  AuthUser,
} from "../lib/supabase";
import { syncAllData, SyncProgress } from "../domain/sync";
import {
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Github,
  X,
} from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSyncComplete: () => void;
}

type SyncStatus = "idle" | "syncing" | "success" | "error";

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSyncComplete }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncResult, setSyncResult] = useState<{ pushed: number; pulled: number; errors: string[] } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load current user on mount
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    getUser().then(u => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try { await signInWithGoogle(); }
    catch (e: unknown) { setAuthError(e instanceof Error ? e.message : "Login failed"); }
  };

  const handleGitHubLogin = async () => {
    setAuthError(null);
    try { await signInWithGitHub(); }
    catch (e: unknown) { setAuthError(e instanceof Error ? e.message : "Login failed"); }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSyncResult(null);
    setSyncStatus("idle");
  };

  const handleSync = useCallback(async () => {
    if (!user) return;
    setSyncStatus("syncing");
    setSyncResult(null);
    setSyncProgress(null);
    try {
      const result = await syncAllData(user.id, (p) => setSyncProgress(p));
      setSyncResult(result);
      setSyncStatus(result.errors.length === 0 ? "success" : "error");
      if (result.errors.length === 0) onSyncComplete();
    } catch (e: unknown) {
      setSyncResult({ pushed: 0, pulled: 0, errors: [e instanceof Error ? e.message : "Sync failed"] });
      setSyncStatus("error");
    }
  }, [user, onSyncComplete]);

  const phaseLabel = (p: SyncProgress) => ({
    worlds: "🏰 Syncing floors...",
    blocks: "📦 Syncing memory blocks...",
    doodles: "🎨 Syncing pixel doodles...",
    chunks: "🗺️ Syncing tile overrides...",
    done: "✅ Sync complete!",
  }[p.phase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="jrpg-box w-full max-w-md p-6 relative animate-fade-in shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-300 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6">
          {isSupabaseConfigured
            ? <Cloud className="w-5 h-5 text-cyan-400 animate-pulse" />
            : <CloudOff className="w-5 h-5 text-rose-400" />}
          <h2 className="text-sm font-pixel font-bold text-white tracking-wider">
            CLOUD <span className="text-cyan-400">SYNC</span>
          </h2>
        </div>

        {/* ── NOT CONFIGURED ─────────────────────────────────────── */}
        {!isSupabaseConfigured && (
          <div className="space-y-4">
            <div className="bg-rose-950/60 border-2 border-rose-700 rounded p-3 text-[11px] font-pixel text-rose-200 leading-relaxed">
              <p className="font-bold text-rose-300 mb-2">⚠️ Supabase Not Configured</p>
              <p>Add these to your <code className="text-amber-300">.env</code> file:</p>
              <pre className="mt-2 bg-slate-950 rounded p-2 text-[10px] text-cyan-300 overflow-x-auto">{`VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}</pre>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded p-3 text-[10px] font-pixel text-slate-300 space-y-1.5">
              <p className="text-amber-300 font-bold">Setup Steps:</p>
              <p>1. Go to <span className="text-cyan-300">supabase.com</span> → New Project</p>
              <p>2. SQL Editor → Run <code className="text-emerald-300">supabase/schema.sql</code></p>
              <p>3. Settings → API → copy URL + anon key</p>
              <p>4. Authentication → Providers → Enable Google/GitHub</p>
              <p>5. Add keys to <code className="text-amber-300">.env</code> → restart server</p>
            </div>
          </div>
        )}

        {/* ── CONFIGURED + LOADING ───────────────────────────────── */}
        {isSupabaseConfigured && loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-[11px] font-pixel">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking session...</span>
          </div>
        )}

        {/* ── CONFIGURED + NOT LOGGED IN ─────────────────────────── */}
        {isSupabaseConfigured && !loading && !user && (
          <div className="space-y-4">
            <p className="text-[11px] font-pixel text-slate-300 text-center leading-relaxed">
              Sign in to sync your memory blocks, floors, and doodles across all your devices.
            </p>

            {authError && (
              <div className="bg-rose-950/60 border border-rose-700 rounded p-2 text-[10px] font-pixel text-rose-200">
                {authError}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 border-2 border-white text-slate-900 rounded font-pixel text-[11px] font-bold transition-all active:scale-95 shadow-lg"
            >
              {/* Google SVG icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-white rounded font-pixel text-[11px] font-bold transition-all active:scale-95 shadow-lg"
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
            </button>

            <p className="text-center text-[9px] font-pixel text-slate-500">
              Your data stays private — protected by Row Level Security.
            </p>
          </div>
        )}

        {/* ── CONFIGURED + LOGGED IN ─────────────────────────────── */}
        {isSupabaseConfigured && !loading && user && (
          <div className="space-y-4">
            {/* User badge */}
            <div className="flex items-center gap-3 bg-emerald-950/50 border-2 border-emerald-700/60 rounded p-3">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border-2 border-emerald-500" />
              )}
              <div>
                <p className="text-[11px] font-pixel font-bold text-emerald-300">
                  {user.user_metadata?.full_name || user.user_metadata?.user_name || "Logged In"}
                </p>
                <p className="text-[9px] font-pixel text-slate-400">{user.email}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
            </div>

            {/* Sync progress */}
            {syncStatus === "syncing" && syncProgress && (
              <div className="bg-indigo-950/60 border-2 border-indigo-600/60 rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="text-[10px] font-pixel text-cyan-300">{phaseLabel(syncProgress)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-pixel text-slate-400">
                  <span>↑ Pushed: <span className="text-amber-300">{syncProgress.pushed}</span></span>
                  <span>↓ Pulled: <span className="text-cyan-300">{syncProgress.pulled}</span></span>
                </div>
              </div>
            )}

            {/* Sync result */}
            {syncResult && syncStatus !== "syncing" && (
              <div className={`border-2 rounded p-3 space-y-1 ${
                syncStatus === "success"
                  ? "bg-emerald-950/60 border-emerald-600/60"
                  : "bg-rose-950/60 border-rose-600/60"
              }`}>
                <div className="flex items-center gap-2">
                  {syncStatus === "success"
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="text-[10px] font-pixel font-bold text-white">
                    {syncStatus === "success" ? "Sync Successful!" : "Sync Completed with Errors"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-pixel text-slate-300">
                  <span>↑ Pushed: <span className="text-amber-300">{syncResult.pushed}</span></span>
                  <span>↓ Pulled: <span className="text-cyan-300">{syncResult.pulled}</span></span>
                </div>
                {syncResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {syncResult.errors.map((e, i) => (
                      <p key={i} className="text-[9px] font-pixel text-rose-300 bg-rose-950/40 rounded px-2 py-1">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sync + Sign out buttons */}
            <button
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-indigo-500 text-white rounded font-pixel text-[11px] font-bold transition-all active:scale-95 shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-slate-300 rounded font-pixel text-[10px] transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>

            <p className="text-center text-[9px] font-pixel text-slate-500">
              Sync uses Last-Write-Wins — newer edits always win.
            </p>
          </div>
        )}

        {/* ── NOT CONFIGURED BOTTOM LINK ─────────────────────────── */}
        {!isSupabaseConfigured && (
          <div className="mt-4 text-center">
            <p className="text-[9px] font-pixel text-slate-500">
              No server needed — Supabase free tier supports this app fully.
            </p>
          </div>
        )}

        {/* Unused import suppression */}
        <span className="hidden"><LogIn /></span>
      </div>
    </div>
  );
};

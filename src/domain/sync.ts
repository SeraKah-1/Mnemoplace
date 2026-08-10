// ─── Mnemoplace Cloud Sync Engine ────────────────────────────────────
//
// Strategy: Last-Write-Wins (LWW) via `updated_at` epoch timestamp.
//   • Push: upsert all local records to Supabase cloud.
//   • Pull: fetch all remote records, merge into IndexedDB.
//   • Merge rule: whichever side has higher `updated_at` wins.
//
// Pixels are stored as bytea (raw Uint8Array buffer).
// Chunks: only modified chunks (non-default tiles) are synced.

import { getSupabase } from "../lib/supabase";
import {
  getAllWorlds,
  getAllBlocks,
  getAllDoodles,
  getAllChunks,
  saveWorld,
  saveBlock,
  saveDoodle,
  saveChunk,
} from "./db";
import { WorldFolder, MemoryBlock, PixelDoodle, ChunkData } from "./types";

// ── Type helpers ─────────────────────────────────────────────────────

type RemoteWorld = {
  id: string; user_id: string; name: string; floor_number: number | null;
  theme_color: string; spawn_x: number; spawn_y: number;
  last_tile_x: number | null; last_tile_y: number | null;
  description: string | null; created_at: number; updated_at: number;
};

type RemoteBlock = {
  id: string; user_id: string; world_id: string; x: number; y: number;
  title: string; text: string; doodle_id: string | null; tags: string[];
  srs_due: number; srs_stability: number; srs_difficulty: number;
  srs_elapsed_days: number; srs_scheduled_days: number;
  srs_reps: number; srs_lapses: number; srs_state: number;
  srs_last_review: number | null; created_at: number; updated_at: number;
};

type RemoteDoodle = {
  id: string; user_id: string; width: number; height: number;
  palette: string[]; pixels: string; // base64 from bytea
  created_at: number; updated_at: number;
};

type RemoteChunk = {
  key: string; user_id: string; world_id: string; cx: number; cy: number;
  tiles: string; // base64 from bytea
  block_ids: string[]; updated_at: number;
};

// ── Converters: local ↔ remote ────────────────────────────────────────

function worldToRemote(w: WorldFolder, userId: string): RemoteWorld {
  return {
    id: w.id, user_id: userId, name: w.name,
    floor_number: w.floorNumber ?? null,
    theme_color: w.themeColor,
    spawn_x: w.spawnX, spawn_y: w.spawnY,
    last_tile_x: w.lastTileX ?? null, last_tile_y: w.lastTileY ?? null,
    description: w.description ?? null,
    created_at: w.createdAt, updated_at: w.updatedAt,
  };
}

function remoteToWorld(r: RemoteWorld): WorldFolder {
  return {
    id: r.id, name: r.name,
    floorNumber: r.floor_number ?? undefined,
    themeColor: r.theme_color,
    spawnX: r.spawn_x, spawnY: r.spawn_y,
    lastTileX: r.last_tile_x ?? undefined, lastTileY: r.last_tile_y ?? undefined,
    description: r.description ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function blockToRemote(b: MemoryBlock, userId: string): RemoteBlock {
  return {
    id: b.id, user_id: userId, world_id: b.worldId, x: b.x, y: b.y,
    title: b.title, text: b.text, doodle_id: b.doodleId, tags: b.tags,
    srs_due: b.srs.due, srs_stability: b.srs.stability, srs_difficulty: b.srs.difficulty,
    srs_elapsed_days: b.srs.elapsed_days, srs_scheduled_days: b.srs.scheduled_days,
    srs_reps: b.srs.reps, srs_lapses: b.srs.lapses, srs_state: b.srs.state,
    srs_last_review: b.srs.last_review ?? null,
    created_at: b.createdAt, updated_at: b.updatedAt,
  };
}

function remoteToBlock(r: RemoteBlock): MemoryBlock {
  return {
    id: r.id, worldId: r.world_id, x: r.x, y: r.y,
    title: r.title, text: r.text, doodleId: r.doodle_id, tags: r.tags,
    srs: {
      due: r.srs_due, stability: r.srs_stability, difficulty: r.srs_difficulty,
      elapsed_days: r.srs_elapsed_days, scheduled_days: r.srs_scheduled_days,
      reps: r.srs_reps, lapses: r.srs_lapses, state: r.srs_state,
      last_review: r.srs_last_review ?? undefined,
    },
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function doodleToRemote(d: PixelDoodle, userId: string): Omit<RemoteDoodle, "pixels"> & { pixels: Uint8Array } {
  return {
    id: d.id, user_id: userId, width: d.width, height: d.height,
    palette: d.palette,
    pixels: d.pixels instanceof Uint8Array ? d.pixels : new Uint8Array(d.pixels),
    created_at: d.createdAt, updated_at: d.updatedAt,
  };
}

function remoteToDoodle(r: RemoteDoodle): PixelDoodle {
  // Supabase returns bytea as a hex string like "\\x0102..."
  const hex = r.pixels.startsWith("\\x") ? r.pixels.slice(2) : r.pixels;
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  return {
    id: r.id, width: r.width, height: r.height, palette: r.palette,
    pixels: bytes, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function chunkToRemote(c: ChunkData, userId: string): Omit<RemoteChunk, "tiles"> & { tiles: Uint8Array } {
  const tileBytes = new Uint8Array(c.tiles.buffer);
  return {
    key: c.key, user_id: userId, world_id: c.worldId, cx: c.cx, cy: c.cy,
    tiles: tileBytes, block_ids: c.blockIds, updated_at: c.updatedAt,
  };
}

function remoteToChunk(r: RemoteChunk): ChunkData {
  const hex = r.tiles.startsWith("\\x") ? r.tiles.slice(2) : r.tiles;
  const rawBytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const tiles = new Uint16Array(rawBytes.buffer);
  return {
    key: r.key, worldId: r.world_id, cx: r.cx, cy: r.cy,
    tiles, blockIds: r.block_ids, updatedAt: r.updated_at,
  };
}

// ── Sync Progress Callback ────────────────────────────────────────────

export interface SyncProgress {
  phase: "worlds" | "blocks" | "doodles" | "chunks" | "done";
  pushed: number;
  pulled: number;
  total: number;
}

export type SyncProgressCallback = (p: SyncProgress) => void;

// ── Main Sync Function ────────────────────────────────────────────────

export async function syncAllData(
  userId: string,
  onProgress?: SyncProgressCallback
): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const sb = getSupabase();
  const errors: string[] = [];
  let totalPushed = 0;
  let totalPulled = 0;

  // ─── 1. WORLDS ──────────────────────────────────────────────────────
  onProgress?.({ phase: "worlds", pushed: 0, pulled: 0, total: 0 });
  try {
    const localWorlds = await getAllWorlds();

    // Push all local → remote (upsert)
    if (localWorlds.length > 0) {
      const { error } = await sb.from("world_folders")
        .upsert(localWorlds.map(w => worldToRemote(w, userId)), { onConflict: "id" });
      if (error) errors.push(`worlds push: ${error.message}`);
      else totalPushed += localWorlds.length;
    }

    // Pull remote → local (merge LWW)
    const { data: remoteWorlds, error: pullErr } = await sb
      .from("world_folders").select("*").eq("user_id", userId);
    if (pullErr) errors.push(`worlds pull: ${pullErr.message}`);
    else if (remoteWorlds) {
      const localMap = new Map(localWorlds.map(w => [w.id, w]));
      for (const r of remoteWorlds as RemoteWorld[]) {
        const local = localMap.get(r.id);
        if (!local || r.updated_at > local.updatedAt) {
          await saveWorld(remoteToWorld(r));
          totalPulled++;
        }
      }
    }
  } catch (e: unknown) {
    errors.push(`worlds: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ─── 2. MEMORY BLOCKS ───────────────────────────────────────────────
  onProgress?.({ phase: "blocks", pushed: totalPushed, pulled: totalPulled, total: 0 });
  try {
    const localBlocks = await getAllBlocks();

    if (localBlocks.length > 0) {
      // Batch upsert in chunks of 500 to avoid request size limits
      for (let i = 0; i < localBlocks.length; i += 500) {
        const batch = localBlocks.slice(i, i + 500).map(b => blockToRemote(b, userId));
        const { error } = await sb.from("memory_blocks").upsert(batch, { onConflict: "id" });
        if (error) errors.push(`blocks push batch ${i}: ${error.message}`);
        else totalPushed += batch.length;
      }
    }

    const { data: remoteBlocks, error: pullErr } = await sb
      .from("memory_blocks").select("*").eq("user_id", userId);
    if (pullErr) errors.push(`blocks pull: ${pullErr.message}`);
    else if (remoteBlocks) {
      const localMap = new Map(localBlocks.map(b => [b.id, b]));
      for (const r of remoteBlocks as RemoteBlock[]) {
        const local = localMap.get(r.id);
        if (!local || r.updated_at > local.updatedAt) {
          await saveBlock(remoteToBlock(r));
          totalPulled++;
        }
      }
    }
  } catch (e: unknown) {
    errors.push(`blocks: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ─── 3. PIXEL DOODLES ───────────────────────────────────────────────
  onProgress?.({ phase: "doodles", pushed: totalPushed, pulled: totalPulled, total: 0 });
  try {
    const localDoodles = await getAllDoodles();

    if (localDoodles.length > 0) {
      for (const d of localDoodles) {
        const remote = doodleToRemote(d, userId);
        const { error } = await sb.from("pixel_doodles").upsert(remote, { onConflict: "id" });
        if (error) errors.push(`doodle push ${d.id}: ${error.message}`);
        else totalPushed++;
      }
    }

    const { data: remoteDoodles, error: pullErr } = await sb
      .from("pixel_doodles").select("*").eq("user_id", userId);
    if (pullErr) errors.push(`doodles pull: ${pullErr.message}`);
    else if (remoteDoodles) {
      const localMap = new Map(localDoodles.map(d => [d.id, d]));
      for (const r of remoteDoodles as RemoteDoodle[]) {
        const local = localMap.get(r.id);
        if (!local || r.updated_at > local.updatedAt) {
          await saveDoodle(remoteToDoodle(r));
          totalPulled++;
        }
      }
    }
  } catch (e: unknown) {
    errors.push(`doodles: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ─── 4. CHUNK OVERRIDES ─────────────────────────────────────────────
  onProgress?.({ phase: "chunks", pushed: totalPushed, pulled: totalPulled, total: 0 });
  try {
    const localChunks = await getAllChunks();
    // Only sync chunks with actual tile overrides (non-zero tiles)
    const modifiedChunks = localChunks.filter(c =>
      c.tiles.some(t => t !== 0) || c.blockIds.length > 0
    );

    if (modifiedChunks.length > 0) {
      for (const c of modifiedChunks) {
        const remote = chunkToRemote(c, userId);
        const { error } = await sb.from("chunk_overrides").upsert(remote, { onConflict: "key" });
        if (error) errors.push(`chunk push ${c.key}: ${error.message}`);
        else totalPushed++;
      }
    }

    const { data: remoteChunks, error: pullErr } = await sb
      .from("chunk_overrides").select("*").eq("user_id", userId);
    if (pullErr) errors.push(`chunks pull: ${pullErr.message}`);
    else if (remoteChunks) {
      const localMap = new Map(localChunks.map(c => [c.key, c]));
      for (const r of remoteChunks as RemoteChunk[]) {
        const local = localMap.get(r.key);
        if (!local || r.updated_at > local.updatedAt) {
          await saveChunk(remoteToChunk(r));
          totalPulled++;
        }
      }
    }
  } catch (e: unknown) {
    errors.push(`chunks: ${e instanceof Error ? e.message : String(e)}`);
  }

  onProgress?.({ phase: "done", pushed: totalPushed, pulled: totalPulled, total: totalPushed + totalPulled });
  return { pushed: totalPushed, pulled: totalPulled, errors };
}

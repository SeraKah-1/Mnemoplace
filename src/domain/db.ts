import { openDB, IDBPDatabase } from "idb";
import { AppMeta, WorldFolder, ChunkData, MemoryBlock, PixelDoodle } from "./types";
import { createNewSRSCard } from "./fsrs";

const DB_NAME = "mnemoplace_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Meta store
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }

        // World Folders store
        if (!db.objectStoreNames.contains("worlds")) {
          db.createObjectStore("worlds", { keyPath: "id" });
        }

        // Chunks store (sparse key `${worldId}:${cx},${cy}`)
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks", { keyPath: "key" });
        }

        // Memory Blocks store
        if (!db.objectStoreNames.contains("blocks")) {
          const blockStore = db.createObjectStore("blocks", { keyPath: "id" });
          blockStore.createIndex("worldId", "worldId", { unique: false });
          blockStore.createIndex("srsDue", "srs.due", { unique: false });
        }

        // Pixel Doodles store
        if (!db.objectStoreNames.contains("doodles")) {
          db.createObjectStore("doodles", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Meta Operations ───
export async function getAppMeta(): Promise<AppMeta> {
  const db = await getDB();
  const meta = await db.get("meta", "app_meta");
  if (!meta) {
    const defaultMeta: AppMeta = {
      version: 1,
      activeWorldId: "world_default",
      lastSavedAt: Date.now(),
    };
    await db.put("meta", defaultMeta, "app_meta");
    return defaultMeta;
  }
  return meta;
}

export async function updateActiveWorld(worldId: string): Promise<void> {
  const db = await getDB();
  const meta = await getAppMeta();
  meta.activeWorldId = worldId;
  meta.lastSavedAt = Date.now();
  await db.put("meta", meta, "app_meta");
}

// ─── World Operations ───
export async function getAllWorlds(): Promise<WorldFolder[]> {
  const db = await getDB();
  const worlds = await db.getAll("worlds");
  if (worlds.length === 0) {
    const defaultWorld: WorldFolder = {
      id: "world_default",
      name: "Main Memory Palace",
      themeColor: "#6366f1",
      spawnX: 0,
      spawnY: 0,
      description: "Your primary spatial memory realm",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put("worlds", defaultWorld);
    return [defaultWorld];
  }
  return worlds;
}

export async function saveWorld(world: WorldFolder): Promise<void> {
  const db = await getDB();
  world.updatedAt = Date.now();
  await db.put("worlds", world);
}

export async function deleteWorld(worldId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["worlds", "chunks", "blocks"], "readwrite");
  await tx.objectStore("worlds").delete(worldId);

  // Delete all chunks for this world
  const chunkStore = tx.objectStore("chunks");
  const allChunkKeys = await chunkStore.getAllKeys();
  for (const key of allChunkKeys) {
    if (typeof key === "string" && key.startsWith(`${worldId}:`)) {
      await chunkStore.delete(key);
    }
  }

  // Delete all blocks for this world
  const blockIndex = tx.objectStore("blocks").index("worldId");
  const blocks = await blockIndex.getAll(worldId);
  for (const block of blocks) {
    await tx.objectStore("blocks").delete(block.id);
  }

  await tx.done;
}

// ─── Chunk Operations ───
export async function getChunk(key: string): Promise<ChunkData | undefined> {
  const db = await getDB();
  return db.get("chunks", key);
}

export async function saveChunk(chunk: ChunkData): Promise<void> {
  const db = await getDB();
  chunk.updatedAt = Date.now();
  await db.put("chunks", chunk);
}

export async function saveChunksBatch(chunks: ChunkData[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("chunks", "readwrite");
  const store = tx.objectStore("chunks");
  const now = Date.now();
  for (const chunk of chunks) {
    chunk.updatedAt = now;
    await store.put(chunk);
  }
  await tx.done;
}

// ─── Block Operations ───
export async function getAllBlocks(worldId?: string): Promise<MemoryBlock[]> {
  const db = await getDB();
  if (worldId) {
    return db.getAllFromIndex("blocks", "worldId", worldId);
  }
  return db.getAll("blocks");
}

export async function getBlockById(id: string): Promise<MemoryBlock | undefined> {
  const db = await getDB();
  return db.get("blocks", id);
}

export async function saveBlock(block: MemoryBlock): Promise<void> {
  const db = await getDB();
  block.updatedAt = Date.now();
  await db.put("blocks", block);
}

export async function deleteBlock(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("blocks", id);
}

// ─── Doodle Operations ───
export async function getAllDoodles(): Promise<PixelDoodle[]> {
  const db = await getDB();
  return db.getAll("doodles");
}

export async function getDoodleById(id: string): Promise<PixelDoodle | undefined> {
  const db = await getDB();
  return db.get("doodles", id);
}

export async function saveDoodle(doodle: PixelDoodle): Promise<void> {
  const db = await getDB();
  doodle.updatedAt = Date.now();
  await db.put("doodles", doodle);
}

// ─── Full Data Backup Export / Import ───
export interface SerializedChunkData {
  key: string;
  worldId: string;
  cx: number;
  cy: number;
  tiles: number[];
  blockIds: string[];
  updatedAt: number;
}

export interface DatabaseBackup {
  meta: AppMeta;
  worlds: WorldFolder[];
  chunks: SerializedChunkData[];
  blocks: MemoryBlock[];
  doodles: {
    id: string;
    width: number;
    height: number;
    palette: string[];
    pixels: number[];
    createdAt: number;
    updatedAt: number;
  }[];
  exportedAt: number;
}

export async function exportFullDatabase(): Promise<DatabaseBackup> {
  const db = await getDB();
  const meta = await getAppMeta();
  const worlds = await db.getAll("worlds");
  const rawChunks = await db.getAll("chunks");
  const blocks = await db.getAll("blocks");
  const rawDoodles = await db.getAll("doodles");

  const chunks: SerializedChunkData[] = rawChunks.map((c: ChunkData) => ({
    ...c,
    tiles: Array.from(c.tiles),
  }));

  const doodles = rawDoodles.map((d: PixelDoodle) => ({
    id: d.id,
    width: d.width,
    height: d.height,
    palette: d.palette,
    pixels: Array.from(d.pixels) as number[],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  return {
    meta,
    worlds,
    chunks,
    blocks,
    doodles,
    exportedAt: Date.now(),
  };
}

export async function importFullDatabase(backup: DatabaseBackup): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["meta", "worlds", "chunks", "blocks", "doodles"], "readwrite");

  await tx.objectStore("meta").clear();
  await tx.objectStore("worlds").clear();
  await tx.objectStore("chunks").clear();
  await tx.objectStore("blocks").clear();
  await tx.objectStore("doodles").clear();

  await tx.objectStore("meta").put(backup.meta, "app_meta");

  for (const w of backup.worlds) {
    await tx.objectStore("worlds").put(w);
  }

  for (const c of backup.chunks) {
    let tilesArray: Uint16Array;
    if (Array.isArray(c.tiles)) {
      tilesArray = new Uint16Array(c.tiles);
    } else if (c.tiles && typeof c.tiles === "object") {
      const keys = Object.keys(c.tiles).map(Number).sort((a, b) => a - b);
      const values = keys.map((k) => (c.tiles as any)[k]);
      tilesArray = new Uint16Array(values);
    } else {
      tilesArray = new Uint16Array(256);
    }

    const chunkData: ChunkData = {
      ...c,
      tiles: tilesArray,
    };
    await tx.objectStore("chunks").put(chunkData);
  }

  for (const b of backup.blocks) {
    await tx.objectStore("blocks").put(b);
  }

  for (const d of backup.doodles) {
    const pixelDoodle: PixelDoodle = {
      id: d.id,
      width: d.width,
      height: d.height,
      palette: d.palette,
      pixels: new Uint8Array(d.pixels),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
    await tx.objectStore("doodles").put(pixelDoodle);
  }

  await tx.done;
}

import { ChunkData, MemoryBlock } from "../domain/types";
import { getChunk, saveChunk, getAllBlocks, saveBlock, deleteBlock } from "../domain/db";
import { CHUNK_SIZE, CHUNK_ACTIVE_RADIUS, tileToChunkCoord, getChunkKey } from "./constants";

export class ChunkManager {
  private activeWorldId: string = "world_default";
  private activeChunks = new Map<string, ChunkData>();
  private dirtyChunkKeys = new Set<string>();
  private activeBlocks = new Map<string, MemoryBlock>(); // Key: `${worldId}:${x},${y}`

  public getWorldId(): string {
    return this.activeWorldId;
  }

  public setWorldId(worldId: string) {
    if (this.activeWorldId !== worldId) {
      this.flushDirtyChunks();
      this.activeChunks.clear();
      this.activeBlocks.clear();
      this.activeWorldId = worldId;
    }
  }

  // Load active chunks surrounding player position
  public async loadActiveChunksAround(
    worldId: string,
    playerTileX: number,
    playerTileY: number,
    radius: number = CHUNK_ACTIVE_RADIUS
  ): Promise<{ loadedChunkKeys: string[]; blocks: MemoryBlock[] }> {
    this.setWorldId(worldId);

    const centerCx = tileToChunkCoord(playerTileX);
    const centerCy = tileToChunkCoord(playerTileY);

    const neededKeys = new Set<string>();
    const loadedChunkKeys: string[] = [];

    for (let dcx = -radius; dcx <= radius; dcx++) {
      for (let dcy = -radius; dcy <= radius; dcy++) {
        const cx = centerCx + dcx;
        const cy = centerCy + dcy;
        const key = getChunkKey(worldId, cx, cy);
        neededKeys.add(key);
        loadedChunkKeys.push(key);

        if (!this.activeChunks.has(key)) {
          let chunk = await getChunk(key);
          if (!chunk) {
            // Generate procedural terrain chunk in memory
            const tiles = this.generateProceduralTerrain(cx, cy);

            chunk = {
              key,
              worldId,
              cx,
              cy,
              tiles,
              blockIds: [],
              updatedAt: Date.now(),
            };
          }
          this.activeChunks.set(key, chunk);
        }
      }
    }

    // Evict chunks outside active radius
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        if (this.dirtyChunkKeys.has(key)) {
          await saveChunk(chunk);
          this.dirtyChunkKeys.delete(key);
        }
        this.activeChunks.delete(key);
      }
    }

    // Reload blocks belonging to active chunks only
    const activeBlockIds = new Set<string>();
    for (const chunk of this.activeChunks.values()) {
      for (const id of chunk.blockIds) {
        activeBlockIds.add(id);
      }
    }

    const allWorldBlocks = await getAllBlocks(worldId);
    this.activeBlocks.clear();
    for (const b of allWorldBlocks) {
      if (activeBlockIds.has(b.id)) {
        const blockKey = `${b.worldId}:${b.x},${b.y}`;
        this.activeBlocks.set(blockKey, b);
      }
    }

    console.log(`[ChunkManager] Loaded ${this.activeChunks.size} active chunks, ${this.activeBlocks.size} active blocks for ${worldId}`);

    return {
      loadedChunkKeys,
      blocks: Array.from(this.activeBlocks.values()),
    };
  }

  public getLoadedChunks(): ChunkData[] {
    return Array.from(this.activeChunks.values());
  }

  public getBlockAt(worldId: string, tileX: number, tileY: number): MemoryBlock | undefined {
    return this.activeBlocks.get(`${worldId}:${tileX},${tileY}`);
  }

  public getAllLoadedBlocks(): MemoryBlock[] {
    return Array.from(this.activeBlocks.values());
  }

  public async createOrUpdateBlock(block: MemoryBlock): Promise<void> {
    await saveBlock(block);
    const blockKey = `${block.worldId}:${block.x},${block.y}`;
    this.activeBlocks.set(blockKey, block);

    // Update chunk reference
    const cx = tileToChunkCoord(block.x);
    const cy = tileToChunkCoord(block.y);
    const chunkKey = getChunkKey(block.worldId, cx, cy);
    let chunk = this.activeChunks.get(chunkKey);
    if (!chunk) {
      chunk = await getChunk(chunkKey);
    }
    if (chunk) {
      if (!chunk.blockIds.includes(block.id)) {
        chunk.blockIds.push(block.id);
        await saveChunk(chunk);
      }
    }
  }

  public async removeBlockById(blockId: string): Promise<boolean> {
    let targetBlock: MemoryBlock | null = null;
    for (const b of this.activeBlocks.values()) {
      if (b.id === blockId) {
        targetBlock = b;
        break;
      }
    }

    if (!targetBlock) {
      // Fetch from DB if not in active map
      const allBlocks = await getAllBlocks();
      targetBlock = allBlocks.find((b) => b.id === blockId) || null;
    }

    if (!targetBlock) return false;

    return this.removeBlockAt(targetBlock.worldId, targetBlock.x, targetBlock.y);
  }

  public async removeBlockAt(worldId: string, tileX: number, tileY: number): Promise<boolean> {
    const blockKey = `${worldId}:${tileX},${tileY}`;
    const block = this.activeBlocks.get(blockKey);
    if (!block) return false;

    await deleteBlock(block.id);
    this.activeBlocks.delete(blockKey);

    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    const chunkKey = getChunkKey(worldId, cx, cy);
    let chunk = this.activeChunks.get(chunkKey);
    if (!chunk) {
      chunk = await getChunk(chunkKey);
    }
    if (chunk) {
      chunk.blockIds = chunk.blockIds.filter((id) => id !== block.id);
      await saveChunk(chunk);
    }

    return true;
  }

  public async setTileAt(worldId: string, tileX: number, tileY: number, tileType: number): Promise<void> {
    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    const chunkKey = getChunkKey(worldId, cx, cy);
    let chunk = this.activeChunks.get(chunkKey);
    if (!chunk) {
      chunk = await getChunk(chunkKey);
      if (!chunk) {
        chunk = {
          key: chunkKey,
          worldId,
          cx,
          cy,
          tiles: this.generateProceduralTerrain(cx, cy),
          blockIds: [],
          updatedAt: Date.now(),
        };
      }
      this.activeChunks.set(chunkKey, chunk);
    }

    const localX = ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((tileY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const tileIdx = localY * CHUNK_SIZE + localX;

    chunk.tiles[tileIdx] = tileType;
    chunk.updatedAt = Date.now();
    await saveChunk(chunk);
  }

  private generateProceduralTerrain(cx: number, cy: number): Uint16Array {
    const tiles = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const globalX = cx * CHUNK_SIZE + localX;
        const globalY = cy * CHUNK_SIZE + localY;
        const tileIdx = localY * CHUNK_SIZE + localX;

        // Cobblestone Main Roads at 16-tile intervals
        if (Math.abs(globalX) % 16 === 0 || Math.abs(globalY) % 16 === 0) {
          tiles[tileIdx] = 1; // Cobblestone Path
        } else {
          const hash = Math.sin(globalX * 12.9898 + globalY * 78.233) * 43758.5453;
          const val = hash - Math.floor(hash);

          if (val > 0.88) {
            tiles[tileIdx] = 4; // Wood Deck Planks
          } else if (val > 0.76) {
            tiles[tileIdx] = 2; // Dungeon Stone Floor
          } else if (val > 0.72) {
            tiles[tileIdx] = 3; // Memory Portal Rune
          } else {
            tiles[tileIdx] = 0; // Baseline Grass
          }
        }
      }
    }
    return tiles;
  }

  public async flushDirtyChunks(): Promise<void> {
    if (this.dirtyChunkKeys.size === 0) return;
    for (const key of this.dirtyChunkKeys) {
      const chunk = this.activeChunks.get(key);
      if (chunk) {
        await saveChunk(chunk);
      }
    }
    this.dirtyChunkKeys.clear();
  }
}

export const chunkManager = new ChunkManager();

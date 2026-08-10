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
            // Generate sparse empty chunk in memory (do not write empty grass chunks to DB)
            const tiles = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
            tiles.fill(0);

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

    // Reload all blocks for active world
    const allWorldBlocks = await getAllBlocks(worldId);
    this.activeBlocks.clear();
    for (const b of allWorldBlocks) {
      const blockKey = `${b.worldId}:${b.x},${b.y}`;
      this.activeBlocks.set(blockKey, b);
    }

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

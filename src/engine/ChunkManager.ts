import { ChunkData, MemoryBlock } from "../domain/types";
import { getChunk, saveChunk, getAllBlocks, getBlockById, saveBlock, deleteBlock } from "../domain/db";
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

    this.activeBlocks.clear();
    await Promise.all(
      Array.from(activeBlockIds).map(async (id) => {
        const b = await getBlockById(id);
        if (b) {
          const blockKey = `${b.worldId}:${b.x},${b.y}`;
          this.activeBlocks.set(blockKey, b);
        }
      })
    );

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
    const targetChunkKey = getChunkKey(block.worldId, cx, cy);

    // Prune block ID from former chunks if block moved position
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (key !== targetChunkKey && chunk.blockIds.includes(block.id)) {
        chunk.blockIds = chunk.blockIds.filter((id) => id !== block.id);
        await saveChunk(chunk);
      }
    }

    let targetChunk = this.activeChunks.get(targetChunkKey);
    if (!targetChunk) {
      targetChunk = await getChunk(targetChunkKey);
    }
    if (targetChunk) {
      if (!targetChunk.blockIds.includes(block.id)) {
        targetChunk.blockIds.push(block.id);
        await saveChunk(targetChunk);
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

  public isTileSolid(worldId: string, tileX: number, tileY: number): boolean {
    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    const chunkKey = getChunkKey(worldId, cx, cy);
    const chunk = this.activeChunks.get(chunkKey);
    if (!chunk) return false;

    const localX = ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((tileY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const tileIdx = localY * CHUNK_SIZE + localX;
    const tileType = chunk.tiles[tileIdx] || 0;

    return tileType === 5 || tileType === 6 || tileType === 7;
  }

  private customRoomNames = new Map<string, string>(); // Key: `${worldId}:${cx},${cy}`

  public loadCustomRoomNames() {
    try {
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem("mnemoplace_room_names");
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string") this.customRoomNames.set(k, v);
        }
      }
    } catch (_) {}
  }

  public setCustomRoomName(worldId: string, cx: number, cy: number, name: string): string {
    const key = `${worldId}:${cx},${cy}`;
    const trimmed = name.trim();
    if (!trimmed) {
      this.customRoomNames.delete(key);
    } else {
      this.customRoomNames.set(key, trimmed);
    }
    try {
      if (typeof localStorage !== "undefined") {
        const obj: Record<string, string> = {};
        for (const [k, v] of this.customRoomNames.entries()) {
          obj[k] = v;
        }
        localStorage.setItem("mnemoplace_room_names", JSON.stringify(obj));
      }
    } catch (_) {}
    return trimmed;
  }

  public getDistrictInfo(worldId: string, tileX: number, tileY: number): { roomName: string; districtTag: string; cx: number; cy: number; isCustom: boolean } {
    if (this.customRoomNames.size === 0) {
      this.loadCustomRoomNames();
    }

    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    const key = `${worldId}:${cx},${cy}`;

    const custom = this.customRoomNames.get(key);
    let districtTag = "Chamber Zone";
    let defaultName = "";

    if (cx === 0 && cy === 0) {
      districtTag = "Tower Main Plaza";
      defaultName = "Sovereign Grand Courtyard";
    } else if (cy < 0 && Math.abs(cx) <= Math.abs(cy)) {
      districtTag = "North Academic Spire";
      defaultName = `Arcane Library Wing [Chamber ${cx},${cy}]`;
    } else if (cx > 0 && Math.abs(cy) < Math.abs(cx)) {
      districtTag = "East Celestial Wing";
      defaultName = `Sanctuary Garden [Chamber ${cx},${cy}]`;
    } else if (cx < 0 && Math.abs(cy) < Math.abs(cx)) {
      districtTag = "West Relic Crypt";
      defaultName = `Dungeon Stone Vault [Chamber ${cx},${cy}]`;
    } else {
      districtTag = "South Horizon Terrace";
      defaultName = `Observatory Deck [Chamber ${cx},${cy}]`;
    }

    return {
      roomName: custom || defaultName,
      districtTag,
      cx,
      cy,
      isCustom: Boolean(custom),
    };
  }

  private generateProceduralTerrain(cx: number, cy: number): Uint16Array {
    const tiles = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);

    // Determine room floor theme based on quadrant coordinates
    let floorTile = 1; // Default Cobblestone
    let wallTile = 5; // Default Solid Stone Wall

    if (cx === 0 && cy === 0) {
      floorTile = 1; // Grand Courtyard: Cobblestone
      wallTile = 7; // Obsidian Pillars
    } else if (cy < 0 && Math.abs(cx) <= Math.abs(cy)) {
      floorTile = 4; // Library: Wood Planks
      wallTile = 6; // Wood Fences
    } else if (cx > 0 && Math.abs(cy) < Math.abs(cx)) {
      floorTile = 0; // Garden: Grass
      wallTile = 5; // Stone Walls
    } else if (cx < 0 && Math.abs(cy) < Math.abs(cx)) {
      floorTile = 2; // Vault: Dungeon Stone
      wallTile = 5; // Stone Walls
    } else {
      floorTile = 3; // Observatory: Rune Floor
      wallTile = 7; // Obsidian Pillars
    }

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const tileIdx = localY * CHUNK_SIZE + localX;
        const isNorthWall = localY === 0;
        const isSouthWall = localY === CHUNK_SIZE - 1;
        const isWestWall = localX === 0;
        const isEastWall = localX === CHUNK_SIZE - 1;
        const isWallBoundary = isNorthWall || isSouthWall || isWestWall || isEastWall;

        // 4-Tile Wide Doorway Passageways in the center of each wall (local 6..9)
        const isDoorwayX = localX >= 6 && localX <= 9;
        const isDoorwayY = localY >= 6 && localY <= 9;
        const isDoorway = (isNorthWall || isSouthWall) ? isDoorwayX : (isWestWall || isEastWall) ? isDoorwayY : false;

        if (isWallBoundary && !isDoorway) {
          tiles[tileIdx] = wallTile; // Solid Collision Wall
        } else {
          // Inner Room Floor Patterns & Center Landmark Altar
          const isCenterAltar = (localX >= 7 && localX <= 8) && (localY >= 7 && localY <= 8);
          if (isCenterAltar) {
            tiles[tileIdx] = 3; // Rune Sanctum Centerpiece
          } else if (isDoorway) {
            tiles[tileIdx] = 1; // Cobblestone Door Threshold
          } else {
            tiles[tileIdx] = floorTile;
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

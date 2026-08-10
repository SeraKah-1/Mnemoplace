// ─── Engine Constants ────────────────────────────────────────────────

export const TILE_SIZE = 16; // 16x16 pixels per tile
export const CHUNK_SIZE = 16; // 16x16 tiles per chunk (256x256 px total per chunk)
export const CHUNK_ACTIVE_RADIUS = 2; // 5x5 chunks surrounding player loaded in memory

export const DEFAULT_PALETTE = [
  "#00000000", // 0: Transparent
  "#1e293b", // 1: Dark Slate
  "#f8fafc", // 2: White
  "#ef4444", // 3: Red
  "#f97316", // 4: Orange
  "#eab308", // 5: Yellow
  "#22c55e", // 6: Green
  "#06b6d4", // 7: Cyan
  "#3b82f6", // 8: Blue
  "#8b5cf6", // 9: Purple
  "#ec4899", // 10: Pink
  "#78350f", // 11: Brown
  "#94a3b8", // 12: Slate Gray
  "#475569", // 13: Dark Gray
  "#15803d", // 14: Dark Green
  "#1d4ed8", // 15: Dark Blue
];

// Ground tile types: 0 = Grass Baseline, 1 = Stone Path, 2 = Tile Floor, 3 = Water Edge, 4 = Wood Deck
export const TILE_TYPES = {
  GRASS: 0,
  PATH: 1,
  TILE_FLOOR: 2,
  WATER: 3,
  WOOD: 4,
} as const;

export function tileToWorldPx(tilePos: number): number {
  return tilePos * TILE_SIZE;
}

export function worldPxToTile(worldPx: number): number {
  return Math.floor(worldPx / TILE_SIZE);
}

export function tileToChunkCoord(tileCoord: number): number {
  return Math.floor(tileCoord / CHUNK_SIZE);
}

export function getChunkKey(worldId: string, cx: number, cy: number): string {
  return `${worldId}:${cx},${cy}`;
}

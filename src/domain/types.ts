// ─── Mnemoplace Core Type Definitions ────────────────────────────────

export interface AppMeta {
  version: number;
  activeWorldId: string;
  lastSavedAt: number;
}

export interface WorldFolder {
  id: string; // Unique slug/UUID, e.g. "world_floor_1"
  name: string; // e.g. "Floor 1: Human Skeleton Anatomy"
  floorNumber?: number; // Tower Floor Level (1, 2, 3...)
  themeColor: string; // Hex color string for ground tile tint & minimap accent
  mapImageUrl?: string; // Base64 data URL or URL for custom floor image (e.g. Skeleton, House Plan, Map)
  mapMode?: 'grid' | 'image'; // 'grid' for 2D Pixi tile grid, 'image' for custom spatial image map
  mapScale?: number; // Custom image map dimension multiplier (e.g. 1.0x to 5.0x, default 2.0x = 2000px)
  spawnX: number; // User-defined default spawn tile X
  spawnY: number; // User-defined default spawn tile Y
  lastTileX?: number; // Autosaved last player tile X
  lastTileY?: number; // Autosaved last player tile Y
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChunkData {
  key: string; // Composite key: `${worldId}:${cx},${cy}`
  worldId: string;
  cx: number; // Chunk X coordinate
  cy: number; // Chunk Y coordinate
  tiles: Uint16Array; // 256 tiles (16x16 layout indices, e.g., 0 = path, 1 = grass, 2 = stone)
  blockIds: string[]; // Block IDs present in this chunk
  updatedAt: number;
}

export interface SRSCardState {
  due: number; // Epoch ms timestamp for next review
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  learning_steps?: number;
  last_review?: number;
}

export interface MemoryBlock {
  id: string;
  worldId: string;
  x: number; // Global tile X position
  y: number; // Global tile Y position
  pinX?: number; // Responsive Image Map Pin X (percentage 0..100)
  pinY?: number; // Responsive Image Map Pin Y (percentage 0..100)
  pinLabel?: string; // Label for spatial pin anchor (e.g. "Femur", "Frontal Lobe", "Kitchen Sink")
  title: string;
  text: string;
  doodleId: string | null;
  tags: string[];
  srs: SRSCardState;
  createdAt: number;
  updatedAt: number;
}

export interface PixelDoodle {
  id: string;
  width: number; // 16 or 32
  height: number; // 16 or 32
  palette: string[]; // Palette array of hex colors (e.g. ["#00000000", "#FF4444", ...])
  pixels: Uint8Array; // Flat array of width * height color indices
  createdAt: number;
  updatedAt: number;
}

export type ReviewRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

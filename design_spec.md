# 🧠 Mnemoplace: Neurocognitive Spatial Memory System (Design Spec & Technical Blueprint)

> **Document Status**: Frozen Specification (v1.0)  
> **Target Architecture**: React 19 + PixiJS v8 + IndexedDB (`idb`) + `ts-fsrs` + TailwindCSS  
> **Core Principle**: Local-First, Neurocognitively Validated, Zero Placebo Code, Crisp 2D Pixel RPG Mechanics.

---

## 1. Cognitive Science & Neurocognitive Foundations

Mnemoplace is designed around peer-reviewed memory mechanisms rather than gamification gimmicks.

1. **Method of Loci (Hippocampal Mapping)**: Spatial navigation in a 2D top-down tilemap leverages the brain's grid/place cells in the hippocampus.
2. **Drawing Effect (Motor-Visual Dual Encoding)**: Hand-drawn pixel doodles achieve up to ~2x higher recall than text alone by combining motor planning with visual imagery (Wammes et al.).
3. **Bizarreness Effect (Distinctiveness Baseline)**: Absurd doodles only enhance memory if they contrast with a plain, consistent background. Baseline terrain remains clean/simple so custom blocks stand out.
4. **Desirable Difficulties (Bjork's Retrieval Practice)**: Proximity popups show **Cues only** (doodle + title/tag) in Explore Mode. The answer/full note is masked until active retrieval is attempted.
5. **Spaced Repetition (FSRS Algorithm)**: Prevents the Ebbinghaus Forgetting Curve by scheduling reviews based on memory stability and difficulty parameters (`ts-fsrs`).

---

## 2. Data Schemas & Local-First Architecture (Version 1 Frozen)

Data is stored locally in IndexedDB via `idb`. All schema versions include migration helpers.

```typescript
// Meta Store
interface AppMeta {
  version: 1;
  activeWorldId: string;
  lastSavedAt: number;
}

// World / Topic Folder Store
interface WorldFolder {
  id: string; // e.g. "world_japanese_vocab"
  name: string; // e.g. "Japanese Vocabulary"
  themeColor: string; // Hex color for ground/minimap accent
  spawnX: number; // Default spawn tile X
  spawnY: number; // Default spawn tile Y
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// Chunk Store (16x16 Tiles Sparse Keyed)
interface Chunk {
  key: string; // Composite key: `${worldId}:${cx},${cy}`
  worldId: string;
  cx: number; // Chunk X coordinate
  cy: number; // Chunk Y coordinate
  tiles: Uint16Array; // 256 tiles (16x16 layout indices)
  blockIds: string[]; // Block IDs contained in this chunk
  updatedAt: number;
}

// Memory Block Store
interface MemoryBlock {
  id: string;
  worldId: string;
  x: number; // Global tile X
  y: number; // Global tile Y
  title: string;
  text: string;
  doodleId: string | null;
  tags: string[];
  // FSRS Card State
  srs: {
    due: number; // Epoch ms timestamp
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review?: number;
  };
  createdAt: number;
  updatedAt: number;
}

// Custom Pixel Doodle Store
interface PixelDoodle {
  id: string;
  width: number; // 16 or 32
  height: number; // 16 or 32
  palette: string[]; // Array of hex colors (e.g. ["#00000000", "#FF0000", ...])
  pixels: Uint8Array; // Width * Height color indices pointing to palette
  createdAt: number;
  updatedAt: number;
}
```

---

## 3. Rendering Engine & Chunk Architecture

### Specifications
* **Engine**: PixiJS v8 with custom WebGL container & viewport transformation.
* **Chunk Size**: $16 \times 16$ tiles ($16 \text{px} \times 16 \text{px}$ per tile = $256 \text{px} \times 256 \text{px}$ per chunk).
* **Active Radius**: $3 \times 3$ chunks ($9$ active chunks surrounding player position).
* **Sparse Generation**: Unvisited chunks generate on-the-fly with clean baseline tile textures.
* **Texture Atlas Strategy**: Custom pixel doodles from `PixelDoodleStore` are dynamically rendered into single-frame HTML Canvas textures and cached in PixiJS `Texture.from()` to ensure 60FPS draw-call batching.
* **Pixel Crispness**: Enforced CSS & WebGL texture properties: `image-rendering: pixelated`, `SCALE_MODES.NEAREST`.

---

## 4. In-App Pixel Doodle Editor

* **Tools**: Pencil, Eraser, Bucket Fill, Eyedropper.
* **History**: 30-step Undo/Redo stack.
* **Format**: Color-indexed `Uint8Array` + palette array (ultra-lightweight storage, ~300 bytes per doodle).

---

## 5. Proximity Cue Popups & Navigation System

### Proximity Popup Engine
* **DOM Overlay**: Rendered as a absolute-positioned HTML container over the canvas using PixiJS camera projection:  
  $$\text{screenX} = (\text{tileX} \cdot 16 - \text{camX}) \cdot \text{zoom} + \frac{\text{screenWidth}}{2}$$
  $$\text{screenY} = (\text{tileY} \cdot 16 - \text{camY}) \cdot \text{zoom} + \frac{\text{screenHeight}}{2}$$
* **Hysteresis Anti-Flicker Threshold**:
  * Show popup when $\text{distance} < 2.5 \text{ tiles}$.
  * Hide popup when $\text{distance} > 3.5 \text{ tiles}$.
* **Cue Mode vs Reveal Mode**:
  * **Explore (Cue) Mode**: Displays only Doodle preview + Title + Tags. Content is hidden to stimulate active recall.
  * **Study (Reveal) Mode**: Clicking or pressing `Enter`/`Space` opens full modal with detailed notes + FSRS rating controls (Again, Hard, Good, Easy).

### Fast Travel & Red String Portals
* **Red String Portals**: Visual links linking related memory blocks across different worlds/folders.
* **Safe Teleport Pipeline**:
  1. Trigger `fadeToBlack(150ms)` transition.
  2. Async await `ChunkManager.ensureChunksLoaded(targetWorldId, targetX, targetY, radius=1)`.
  3. Snap player position & camera coordinates.
  4. Trigger `fadeIn(150ms)`.

---

## 6. Recall Tools & Spaced Repetition (FSRS)

1. **Journal / Search Index**:
   * Instant search by Title, Tags, Text content, or SRS Due Status.
   * Clicking any journal entry triggers instant camera fast travel.
2. **Spatial Minimap (Worlds-in-Miniature)**:
   * Displays overall grid topography, folder boundaries, and memory block density.
   * Double-clicking minimap initiates fast travel.
3. **FSRS Review Station**:
   * Automated queue of blocks due for review based on `ts-fsrs` scheduling algorithms.
   * Guided tour walk-through mode for review sessions.

---

## 7. Implementation Roadmap & Layered Execution Plan

* **Layer 1: Core Domain & Persistence** (Database setup, TypeScript contracts, migration scripts).
* **Layer 2: Sparse World Grid & Chunk Manager** (16x16 chunk math, IndexedDB flush, chunk eviction).
* **Layer 3: PixiJS Rendering Engine** (Camera follow, viewport culling, tilemap rendering).
* **Layer 4: Interaction & Placement** (Movement controller, collision, place block modal).
* **Layer 5: In-App Pixel Art Editor** (Canvas editor, palette management, doodle texture caching).
* **Layer 6: DOM Overlays & Teleportation** (Hysteresis proximity detector, fast travel pipeline).
* **Layer 7: Memory & Review Systems** (Journal modal, FSRS scheduling interface, minimap).
* **Layer 8: Offline PWA & Data Safety** (Export/Import JSON backup, auto-save debounce).

---
*Mnemoplace Design Specification - Built with Evidence-Based Neurocognitive Principles.*

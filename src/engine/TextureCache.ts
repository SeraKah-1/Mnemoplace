import { Texture } from "pixi.js";
import { PixelDoodle } from "../domain/types";
import { TILE_SIZE, DEFAULT_PALETTE } from "./constants";

const MAX_TEXTURE_CACHE_SIZE = 150;
const textureCache = new Map<string, Texture>();

function getCachedTexture(key: string): Texture | undefined {
  if (!textureCache.has(key)) return undefined;
  const tex = textureCache.get(key)!;
  textureCache.delete(key);
  textureCache.set(key, tex);
  return tex;
}

function setCachedTexture(key: string, texture: Texture): Texture {
  if (textureCache.has(key)) {
    textureCache.delete(key);
  } else if (textureCache.size >= MAX_TEXTURE_CACHE_SIZE) {
    const oldestKey = textureCache.keys().next().value;
    if (oldestKey) {
      textureCache.delete(oldestKey);
    }
  }
  textureCache.set(key, texture);
  return texture;
}

export function clearTextureCache() {
  for (const tex of textureCache.values()) {
    try {
      tex.destroy(true);
    } catch (_) {}
  }
  textureCache.clear();
}

/**
 * Procedurally generates high-quality Retro JRPG Pixel Art textures for tiles
 */
export function getTileTexture(tileType: number, themeColor: string = "#6366f1"): Texture {
  try {
    const cacheKey = `tile_v2_${tileType}_${themeColor}`;
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    if (tileType === 0) {
      // 🌿 TILE 0: LUSH RETRO GRASS (Rich 16x16 Pixel Art with wildflowers & grass blades)
      ctx.fillStyle = "#091e17"; // Deep shadow base
      ctx.fillRect(0, 0, 16, 16);

      ctx.fillStyle = "#053a29"; // Dark grass patch
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillRect(8, 8, 8, 8);

      ctx.fillStyle = "#047857"; // Midtone green grass
      ctx.fillRect(1, 1, 6, 6);
      ctx.fillRect(9, 9, 6, 6);
      ctx.fillRect(2, 10, 5, 5);
      ctx.fillRect(10, 2, 4, 4);

      ctx.fillStyle = "#10b981"; // Bright grass blades
      ctx.fillRect(2, 2, 2, 3);
      ctx.fillRect(5, 3, 1, 2);
      ctx.fillRect(10, 10, 2, 3);
      ctx.fillRect(13, 11, 1, 2);
      ctx.fillRect(3, 11, 2, 2);

      ctx.fillStyle = "#34d399"; // Grass blade tips / highlights
      ctx.fillRect(2, 1, 1, 1);
      ctx.fillRect(10, 9, 1, 1);

      // Wildflowers (small 1x1 yellow/white dots)
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(6, 4, 1, 1);
      ctx.fillRect(12, 6, 1, 1);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(3, 14, 1, 1);
      ctx.fillRect(14, 13, 1, 1);

    } else if (tileType === 1) {
      // 🪨 TILE 1: BEVELED COBBLESTONE PAVEMENT (Classic JRPG Town Plaza)
      ctx.fillStyle = "#0f172a"; // Mortar / Gap shadow
      ctx.fillRect(0, 0, 16, 16);

      // Cobble Brick 1 (Top-Left)
      ctx.fillStyle = "#334155"; ctx.fillRect(1, 1, 6, 6);
      ctx.fillStyle = "#64748b"; ctx.fillRect(1, 1, 6, 1); ctx.fillRect(1, 1, 1, 6); // Highlight
      ctx.fillStyle = "#1e293b"; ctx.fillRect(1, 6, 6, 1); ctx.fillRect(6, 1, 1, 6); // Shadow

      // Cobble Brick 2 (Top-Right)
      ctx.fillStyle = "#475569"; ctx.fillRect(8, 1, 7, 5);
      ctx.fillStyle = "#94a3b8"; ctx.fillRect(8, 1, 7, 1); ctx.fillRect(8, 1, 1, 5);
      ctx.fillStyle = "#1e293b"; ctx.fillRect(8, 5, 7, 1); ctx.fillRect(14, 1, 1, 5);

      // Cobble Brick 3 (Bottom-Left)
      ctx.fillStyle = "#475569"; ctx.fillRect(1, 8, 7, 7);
      ctx.fillStyle = "#94a3b8"; ctx.fillRect(1, 8, 7, 1); ctx.fillRect(1, 8, 1, 7);
      ctx.fillStyle = "#1e293b"; ctx.fillRect(1, 14, 7, 1); ctx.fillRect(7, 8, 1, 7);

      // Cobble Brick 4 (Bottom-Right)
      ctx.fillStyle = "#334155"; ctx.fillRect(9, 7, 6, 8);
      ctx.fillStyle = "#64748b"; ctx.fillRect(9, 7, 6, 1); ctx.fillRect(9, 7, 1, 8);
      ctx.fillStyle = "#1e293b"; ctx.fillRect(9, 14, 6, 1); ctx.fillRect(14, 7, 1, 8);

      // Moss accent in mortar
      ctx.fillStyle = "#059669";
      ctx.fillRect(7, 0, 1, 2);
      ctx.fillRect(0, 7, 2, 1);

    } else if (tileType === 2) {
      // 🏛️ TILE 2: ANCIENT DUNGEON STONE FLAGSTONE (Carved Rune Rim)
      ctx.fillStyle = "#090514"; // Dark abyss gap
      ctx.fillRect(0, 0, 16, 16);

      ctx.fillStyle = "#1e1b4b"; // Main flagstone body
      ctx.fillRect(1, 1, 14, 14);

      // Carved Bevel Edges
      ctx.fillStyle = "#4338ca"; // Top/Left highlight
      ctx.fillRect(1, 1, 14, 1);
      ctx.fillRect(1, 1, 1, 14);

      ctx.fillStyle = "#0f0d2e"; // Bottom/Right shadow
      ctx.fillRect(1, 14, 14, 1);
      ctx.fillRect(14, 1, 1, 14);

      // Inner Slab Lines & Cracks
      ctx.fillStyle = "#312e81";
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(4, 4, 8, 1);
      ctx.fillRect(4, 4, 1, 8);

      // Metallic corner studs
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(2, 2, 1, 1);
      ctx.fillRect(13, 2, 1, 1);
      ctx.fillRect(2, 13, 1, 1);
      ctx.fillRect(13, 13, 1, 1);

    } else if (tileType === 3) {
      // 🔮 TILE 3: ARCANE RUNE SANCTUM (Glowing Magic Circle Floor)
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, 16, 16);

      ctx.fillStyle = "#312e81";
      ctx.fillRect(1, 1, 14, 14);

      // Outer Magic Ring
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = "#312e81";
      ctx.fillRect(4, 4, 8, 8);

      // Inner Glowing Glyph / Star
      ctx.fillStyle = "#818cf8";
      ctx.fillRect(7, 3, 2, 10);
      ctx.fillRect(3, 7, 10, 2);

      // Core Power Crystal
      ctx.fillStyle = "#c084fc";
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(7, 7, 2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(7, 7, 1, 1);

    } else if (tileType === 4) {
      // 🪵 TILE 4: POLISHED HARDWOOD PLANKS (Rich Wood Grain & Rivets)
      ctx.fillStyle = "#291003"; // Gap between planks
      ctx.fillRect(0, 0, 16, 16);

      // Plank 1 (Top)
      ctx.fillStyle = "#78350f"; ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = "#b45309"; ctx.fillRect(0, 0, 16, 1); // Top highlight
      ctx.fillStyle = "#92400e"; ctx.fillRect(4, 1, 8, 1);  // Wood grain line
      ctx.fillStyle = "#451a03"; ctx.fillRect(0, 4, 16, 1); // Plank seam

      // Plank 2 (Middle)
      ctx.fillStyle = "#78350f"; ctx.fillRect(0, 5, 16, 4);
      ctx.fillStyle = "#b45309"; ctx.fillRect(0, 5, 16, 1);
      ctx.fillStyle = "#92400e"; ctx.fillRect(2, 6, 10, 1);
      ctx.fillStyle = "#451a03"; ctx.fillRect(0, 9, 16, 1);

      // Plank 3 (Bottom)
      ctx.fillStyle = "#78350f"; ctx.fillRect(0, 10, 16, 5);
      ctx.fillStyle = "#b45309"; ctx.fillRect(0, 10, 16, 1);
      ctx.fillStyle = "#92400e"; ctx.fillRect(6, 11, 7, 1);
      ctx.fillStyle = "#451a03"; ctx.fillRect(0, 15, 16, 1);

      // Iron Nails / Screws
      ctx.fillStyle = "#475569";
      ctx.fillRect(1, 2, 1, 1);
      ctx.fillRect(14, 2, 1, 1);
      ctx.fillRect(1, 7, 1, 1);
      ctx.fillRect(14, 7, 1, 1);
      ctx.fillRect(1, 12, 1, 1);
      ctx.fillRect(14, 12, 1, 1);

    } else if (tileType === 5) {
      // 🧱 TILE 5: SOLID CASTLE STONE WALL (3D Relief Wall with Beveled Bricks)
      ctx.fillStyle = "#020617"; // Abyss shadow base
      ctx.fillRect(0, 0, 16, 16);

      // Wall Face
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(1, 1, 14, 14);

      // Brick Row 1
      ctx.fillStyle = "#334155"; ctx.fillRect(2, 2, 5, 5);
      ctx.fillStyle = "#64748b"; ctx.fillRect(2, 2, 5, 1); ctx.fillRect(2, 2, 1, 5);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(2, 6, 5, 1); ctx.fillRect(6, 2, 1, 5);

      ctx.fillStyle = "#334155"; ctx.fillRect(8, 2, 6, 5);
      ctx.fillStyle = "#64748b"; ctx.fillRect(8, 2, 6, 1); ctx.fillRect(8, 2, 1, 5);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(8, 6, 6, 1); ctx.fillRect(13, 2, 1, 5);

      // Brick Row 2 (Staggered)
      ctx.fillStyle = "#475569"; ctx.fillRect(2, 8, 12, 5);
      ctx.fillStyle = "#94a3b8"; ctx.fillRect(2, 8, 12, 1); ctx.fillRect(2, 8, 1, 5);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(2, 12, 12, 1); ctx.fillRect(13, 8, 1, 5);

      // Top Wall Rim 3D Cap Highlight
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 0, 1, 16);

      // Bottom Wall 3D Drop Shadow
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(15, 0, 1, 16);

    } else if (tileType === 6) {
      // 🪵 TILE 6: SOLID LOG TIMBER WALL (Crafted Wooden Wall with Iron Straps)
      ctx.fillStyle = "#1a0800";
      ctx.fillRect(0, 0, 16, 16);

      // Vertical Logs
      ctx.fillStyle = "#78350f"; ctx.fillRect(1, 1, 6, 14);
      ctx.fillStyle = "#92400e"; ctx.fillRect(1, 1, 2, 14); // Log highlight
      ctx.fillStyle = "#451a03"; ctx.fillRect(6, 1, 1, 14); // Log shadow

      ctx.fillStyle = "#78350f"; ctx.fillRect(8, 1, 7, 14);
      ctx.fillStyle = "#92400e"; ctx.fillRect(8, 1, 2, 14);
      ctx.fillStyle = "#451a03"; ctx.fillRect(14, 1, 1, 14);

      // Horizontal Iron Reinforcement Straps
      ctx.fillStyle = "#334155"; ctx.fillRect(0, 3, 16, 3);
      ctx.fillStyle = "#64748b"; ctx.fillRect(0, 3, 16, 1);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 5, 16, 1);

      ctx.fillStyle = "#334155"; ctx.fillRect(0, 10, 16, 3);
      ctx.fillStyle = "#64748b"; ctx.fillRect(0, 10, 16, 1);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 12, 16, 1);

      // Golden Rivets / Studs
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(3, 4, 1, 1);
      ctx.fillRect(11, 4, 1, 1);
      ctx.fillRect(3, 11, 1, 1);
      ctx.fillRect(11, 11, 1, 1);

    } else if (tileType === 7) {
      // 🔮 TILE 7: SOLID OBSIDIAN CRYSTAL PILLAR (3D Glowing Rune Obelisk)
      ctx.fillStyle = "#030008"; // Void shadow
      ctx.fillRect(0, 0, 16, 16);

      // Obsidian Facet Body
      ctx.fillStyle = "#180b2b"; ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = "#2e1052"; ctx.fillRect(2, 2, 12, 12);

      // Crystal Bevel Facets
      ctx.fillStyle = "#581c87"; ctx.fillRect(2, 2, 12, 1); ctx.fillRect(2, 2, 1, 12);
      ctx.fillStyle = "#0d021c"; ctx.fillRect(2, 13, 12, 1); ctx.fillRect(13, 2, 1, 12);

      // Center Glowing Purple/Cyan Rune Emblem
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(7, 3, 2, 10);
      ctx.fillRect(3, 7, 10, 2);

      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(7, 7, 2, 2);
    }

    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getTileTexture failed:", err);
    return Texture.WHITE;
  }
}

/**
 * Converts PixelDoodle pixel matrix into a crisp PixiJS Texture
 */
export function getDoodleTexture(doodle: PixelDoodle): Texture {
  try {
    const cacheKey = `doodle_${doodle.id}_${doodle.updatedAt}`;
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = doodle.width;
    canvas.height = doodle.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    const imgData = ctx.createImageData(doodle.width, doodle.height);
    const data = imgData.data;

    for (let i = 0; i < doodle.pixels.length; i++) {
      const paletteIndex = doodle.pixels[i];
      const hexColor = doodle.palette[paletteIndex] || DEFAULT_PALETTE[paletteIndex] || "#00000000";

      let r = 0, g = 0, b = 0, a = 0;
      if (hexColor.length === 9 && hexColor.startsWith("#")) {
        r = parseInt(hexColor.slice(1, 3), 16);
        g = parseInt(hexColor.slice(3, 5), 16);
        b = parseInt(hexColor.slice(5, 7), 16);
        a = parseInt(hexColor.slice(7, 9), 16);
      } else if (hexColor.length === 7 && hexColor.startsWith("#")) {
        r = parseInt(hexColor.slice(1, 3), 16);
        g = parseInt(hexColor.slice(3, 5), 16);
        b = parseInt(hexColor.slice(5, 7), 16);
        a = 255;
      }

      const pixelIdx = i * 4;
      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = a;
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getDoodleTexture failed:", err);
    return Texture.WHITE;
  }
}

/**
 * Generate Player Character Sprite Texture (Proper 16x16 Retro 2D JRPG Hero)
 */
export function getPlayerTexture(): Texture {
  try {
    const cacheKey = "player_hero_sprite_v2";
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    // Drop Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(3, 14, 10, 2);

    // Golden Hair / Helmet
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(4, 1, 8, 4);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(5, 1, 6, 2);

    // Skin Head
    ctx.fillStyle = "#fed7aa";
    ctx.fillRect(4, 4, 8, 4);

    // Eyes (JRPG style with white highlights & dark iris)
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(9, 5, 2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(5, 5, 1, 1);
    ctx.fillRect(9, 5, 1, 1);

    // Red Adventurer Scarf / Cloak Collar
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(3, 7, 10, 2);
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(3, 8, 10, 1);

    // Tunic / Armor Body (Royal Indigo/Cyan)
    ctx.fillStyle = "#4f46e5";
    ctx.fillRect(4, 9, 8, 4);
    ctx.fillStyle = "#38bdf8"; // Breastplate emblem
    ctx.fillRect(7, 9, 2, 3);

    // Arms / Sleeves
    ctx.fillStyle = "#6366f1";
    ctx.fillRect(3, 9, 1, 3);
    ctx.fillRect(12, 9, 1, 3);

    // Golden Belt
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(4, 12, 8, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(7, 12, 2, 1);

    // Legs / Boots
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(4, 13, 3, 3);
    ctx.fillRect(9, 13, 3, 3);
    ctx.fillStyle = "#78350f"; // Leather boots
    ctx.fillRect(4, 14, 3, 2);
    ctx.fillRect(9, 14, 3, 2);

    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getPlayerTexture failed:", err);
    return Texture.WHITE;
  }
}

/**
 * Generate Memory Block Pillar Sprite Texture (3D Retro Pedestal Altar with Glowing Gem)
 */
export function getBlockPillarTexture(hasDoodle: boolean): Texture {
  try {
    const cacheKey = `block_pedestal_v2_${hasDoodle}`;
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    // Pedestal Base Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(1, 14, 14, 2);

    // Outer Beveled Stone Base
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(1, 1, 14, 14);

    ctx.fillStyle = "#475569";
    ctx.fillRect(1, 1, 14, 1); ctx.fillRect(1, 1, 1, 14); // Top/Left highlight

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(1, 14, 14, 1); ctx.fillRect(14, 1, 1, 14); // Bottom/Right shadow

    // Inner Metallic Rim (Gold for Doodle, Cyan for Normal)
    ctx.fillStyle = hasDoodle ? "#d97706" : "#0284c7";
    ctx.fillRect(3, 3, 10, 10);

    ctx.fillStyle = hasDoodle ? "#fbbf24" : "#38bdf8";
    ctx.fillRect(3, 3, 10, 1); ctx.fillRect(3, 3, 1, 10);

    // Glowing Power Gem Socket Core
    ctx.fillStyle = hasDoodle ? "#a855f7" : "#06b6d4";
    ctx.fillRect(5, 5, 6, 6);

    ctx.fillStyle = hasDoodle ? "#e879f9" : "#67e8f9";
    ctx.fillRect(6, 6, 4, 4);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(7, 7, 2, 2);

    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getBlockPillarTexture failed:", err);
    return Texture.WHITE;
  }
}

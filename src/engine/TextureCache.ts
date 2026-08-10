import { Texture, CanvasSource } from "pixi.js";
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

// Create a tile texture for base ground types
export function getTileTexture(tileType: number, themeColor: string = "#6366f1"): Texture {
  try {
    const cacheKey = `tile_${tileType}_${themeColor}`;
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    if (tileType === 0) {
      // Baseline Continuous Grass Surface (No grid seams)
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // Subtle pixel detail
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(3, 4, 2, 2);
      ctx.fillRect(10, 11, 2, 2);
    } else if (tileType === 1) {
      // Stone Path
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#475569";
      ctx.fillRect(2, 2, 6, 6);
      ctx.fillRect(9, 8, 5, 6);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, TILE_SIZE, 1);
      ctx.fillRect(0, 15, TILE_SIZE, 1);
    } else if (tileType === 2) {
      // Tile Floor
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    } else if (tileType === 3) {
      // Memory Portal / Red String Anchor
      ctx.fillStyle = "#450a0a";
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(4, 4, 8, 8);
    } else {
      // Wood Deck
      ctx.fillStyle = "#78350f";
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(0, 1, TILE_SIZE, 3);
      ctx.fillRect(0, 6, TILE_SIZE, 3);
      ctx.fillRect(0, 11, TILE_SIZE, 3);
    }

    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getTileTexture failed:", err);
    return Texture.WHITE;
  }
}

// Convert PixelDoodle data into a crisp PixiJS Texture
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

// Generate Player Character Sprite Texture (Retro 2D RPG Character)
export function getPlayerTexture(): Texture {
  try {
    const cacheKey = "player_sprite_v1";
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#818cf8";
    ctx.fillRect(4, 2, 8, 4);

    ctx.fillStyle = "#fed7aa";
    ctx.fillRect(4, 5, 8, 4);

    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(5, 6, 2, 2);
    ctx.fillRect(9, 6, 2, 2);

    ctx.fillStyle = "#4f46e5";
    ctx.fillRect(4, 9, 8, 4);

    ctx.fillStyle = "#312e81";
    ctx.fillRect(5, 13, 3, 3);
    ctx.fillRect(8, 13, 3, 3);

    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getPlayerTexture failed:", err);
    return Texture.WHITE;
  }
}

// Generate Memory Block Pillar Sprite Texture
export function getBlockPillarTexture(hasDoodle: boolean): Texture {
  try {
    const cacheKey = `block_pillar_${hasDoodle}`;
    const cached = getCachedTexture(cacheKey);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.WHITE;

    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#334155";
    ctx.fillRect(1, 1, 14, 14);

    ctx.fillStyle = hasDoodle ? "#4f46e5" : "#0284c7";
    ctx.fillRect(3, 3, 10, 10);

    ctx.fillStyle = hasDoodle ? "#a5b4fc" : "#38bdf8";
    ctx.fillRect(5, 5, 6, 6);

    const texture = Texture.from(canvas);
    return setCachedTexture(cacheKey, texture);
  } catch (err) {
    console.error("[TextureCache] getBlockPillarTexture failed:", err);
    return Texture.WHITE;
  }
}

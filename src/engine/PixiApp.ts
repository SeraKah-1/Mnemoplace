import { Application, Container, Sprite, Text, TextStyle, Texture, Assets } from "pixi.js";
import { TILE_SIZE, CHUNK_SIZE, worldPxToTile, tileToWorldPx, tileToChunkCoord } from "./constants";
import { getTileTexture, getDoodleTexture, getPlayerTexture, getBlockPillarTexture, clearTextureCache } from "./TextureCache";
import { chunkManager } from "./ChunkManager";
import { PlayerController, PlayerPosition } from "./PlayerController";
import { MemoryBlock, PixelDoodle } from "../domain/types";
import { getAllDoodles } from "../domain/db";

export class PixiApp {
  private app: Application | null = null;
  private worldContainer: Container = new Container();
  private tileLayer: Container = new Container();
  private blockLayer: Container = new Container();
  private playerLayer: Container = new Container();
  private playerSprite: Sprite | null = null;

  private playerController: PlayerController = new PlayerController(0, 0);
  private currentWorldId: string = "world_default";
  private currentThemeColor: string = "#6366f1";
  private currentMapImageUrl: string | null = null;
  private mapWidth: number = 1000;
  private mapHeight: number = 1000;

  private loadedDoodlesMap = new Map<string, PixelDoodle>();

  private onTileClick?: (tileX: number, tileY: number, existingBlock?: MemoryBlock, pinX?: number, pinY?: number) => void;
  private onPlayerMove?: (pos: PlayerPosition) => void;
  private isInitialized = false;
  private isDisposed = false;

  public async init(containerElement: HTMLDivElement): Promise<void> {
    if (this.isInitialized && this.app) return;
    this.isDisposed = false;

    const app = new Application();
    await app.init({
      resizeTo: window,
      backgroundColor: 0x090d16, // Dark slate background
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false, // Enforce crisp retro pixels
    });

    if (this.isDisposed || !containerElement) {
      try {
        app.destroy(true);
      } catch (_) {}
      return;
    }

    this.app = app;

    if (!this.app || !this.app.canvas) return;

    const canvas = this.app.canvas;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    containerElement.innerHTML = "";
    containerElement.appendChild(canvas);

    // Setup viewport hierarchy
    this.worldContainer = new Container();
    this.tileLayer = new Container();
    this.blockLayer = new Container();
    this.playerLayer = new Container();

    this.worldContainer.addChild(this.tileLayer);
    this.worldContainer.addChild(this.blockLayer);
    this.worldContainer.addChild(this.playerLayer);
    this.app.stage.addChild(this.worldContainer);

    // Create Player Sprite (Character 2D)
    const playerTex = getPlayerTexture();
    this.playerSprite = new Sprite(playerTex);
    this.playerSprite.anchor.set(0.5, 0.5);
    this.playerSprite.scale.set(1.5, 1.5);
    this.playerLayer.addChild(this.playerSprite);

    // Setup User Controls (WASD / Arrow Keys / Virtual D-Pad)
    this.setupInputs();

    // Load initial doodles cache
    await this.reloadDoodlesCache();

    // Add Ticker update loop
    if (this.app) {
      this.app.ticker.add((ticker) => {
        this.update(ticker.deltaTime);
      });
    }

    this.isInitialized = true;

    // Initial render
    await this.refreshWorld(true);
  }

  public setOnTileClick(cb: (tileX: number, tileY: number, existingBlock?: MemoryBlock, pinX?: number, pinY?: number) => void) {
    this.onTileClick = cb;
  }

  public setOnPlayerMove(cb: (pos: PlayerPosition) => void) {
    this.onPlayerMove = cb;
    this.playerController.setOnPositionChange(cb);
  }

  public getPlayerController(): PlayerController {
    return this.playerController;
  }

  public async reloadDoodlesCache(): Promise<void> {
    const doodles = await getAllDoodles();
    this.loadedDoodlesMap.clear();
    for (const d of doodles) {
      this.loadedDoodlesMap.set(d.id, d);
    }
  }

  private currentChunkCx: number = Infinity;
  private currentChunkCy: number = Infinity;
  private renderGen: number = 0;
  private currentMapScale: number = 2.0;

  public async setWorld(
    worldId: string,
    themeColor: string,
    spawnX = 0,
    spawnY = 0,
    mapImageUrl?: string,
    mapScale: number = 2.0
  ): Promise<void> {
    const isNewWorld = this.currentWorldId !== worldId;
    this.currentWorldId = worldId;
    this.currentThemeColor = themeColor;
    this.currentMapImageUrl = mapImageUrl || null;
    this.currentMapScale = mapScale || 2.0;

    if (this.currentMapImageUrl) {
      // Custom Image Map Mode: Set scaled dimensions
      this.mapWidth = Math.round(1000 * this.currentMapScale);
      this.mapHeight = Math.round(1000 * this.currentMapScale);
      this.playerController.setIsTileSolid(() => false);
      if (isNewWorld) {
        this.playerController.setPosition(this.mapWidth / 2, this.mapHeight / 2);
      }
    } else {
      // 2D Tile Grid Mode
      this.playerController.setIsTileSolid((tx, ty) => chunkManager.isTileSolid(this.currentWorldId, tx, ty));
      if (isNewWorld) {
        this.playerController.setPosition(tileToWorldPx(spawnX) + TILE_SIZE / 2, tileToWorldPx(spawnY) + TILE_SIZE / 2);
      }
    }

    await this.refreshWorld(true);
  }

  public async setMapScale(scale: number): Promise<void> {
    if (this.currentMapImageUrl) {
      const oldWidth = this.mapWidth || 1000;
      const oldHeight = this.mapHeight || 1000;
      const curPos = this.playerController.getPosition();
      const relX = curPos.x / oldWidth;
      const relY = curPos.y / oldHeight;

      this.currentMapScale = scale;
      this.mapWidth = Math.round(1000 * scale);
      this.mapHeight = Math.round(1000 * scale);

      const newPlayerX = relX * this.mapWidth;
      const newPlayerY = relY * this.mapHeight;
      this.playerController.setPosition(newPlayerX, newPlayerY);
    } else {
      this.currentMapScale = scale;
      this.mapWidth = Math.round(1000 * scale);
      this.mapHeight = Math.round(1000 * scale);
    }

    await this.refreshWorld(true);
  }

  public getMapDimensions(): { width: number; height: number; scale: number } {
    return { width: this.mapWidth, height: this.mapHeight, scale: this.currentMapScale };
  }

  public async refreshWorld(force: boolean = false): Promise<void> {
    const playerPos = this.playerController.getPosition();
    const playerCx = tileToChunkCoord(playerPos.tileX);
    const playerCy = tileToChunkCoord(playerPos.tileY);

    if (!force && !this.currentMapImageUrl && playerCx === this.currentChunkCx && playerCy === this.currentChunkCy) {
      return;
    }

    this.currentChunkCx = playerCx;
    this.currentChunkCy = playerCy;

    const currentGen = ++this.renderGen;

    const { blocks } = await chunkManager.loadActiveChunksAround(
      this.currentWorldId,
      playerPos.tileX,
      playerPos.tileY
    );

    if (currentGen !== this.renderGen) return;

    await this.renderChunks();
    this.renderBlocks(blocks);
  }

  public async teleportToTile(worldId: string, tileX: number, tileY: number): Promise<void> {
    if (this.currentWorldId !== worldId) {
      this.currentWorldId = worldId;
    }
    this.playerController.setPosition(tileToWorldPx(tileX) + TILE_SIZE / 2, tileToWorldPx(tileY) + TILE_SIZE / 2);
    await this.refreshWorld(true);
  }

  private async renderChunks() {
    if (!this.tileLayer) return;
    const tileChildren = this.tileLayer.removeChildren();
    for (const child of tileChildren) {
      child.destroy({ children: true, texture: false });
    }

    // Render Custom Image Background (Skeleton, House Plan, Biology Diagram)
    if (this.currentMapImageUrl) {
      try {
        const tex = await Assets.load(this.currentMapImageUrl);
        const mapSprite = new Sprite(tex);
        mapSprite.x = 0;
        mapSprite.y = 0;
        mapSprite.width = this.mapWidth;
        mapSprite.height = this.mapHeight;
        this.tileLayer.addChild(mapSprite);
        return;
      } catch (err) {
        console.warn("Failed to load mapImageUrl in Pixi, falling back to tile grid:", err);
      }
    }

    // Fallback: 2D Tile Grid Rendering
    const loadedChunks = chunkManager.getLoadedChunks();
    for (const chunk of loadedChunks) {
      const chunkBaseX = chunk.cx * CHUNK_SIZE * TILE_SIZE;
      const chunkBaseY = chunk.cy * CHUNK_SIZE * TILE_SIZE;

      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          const tileIdx = r * CHUNK_SIZE + c;
          const tileType = chunk.tiles[tileIdx] || 0;
          const tex = getTileTexture(tileType, this.currentThemeColor);

          const sprite = new Sprite(tex);
          sprite.x = chunkBaseX + c * TILE_SIZE;
          sprite.y = chunkBaseY + r * TILE_SIZE;
          sprite.width = TILE_SIZE;
          sprite.height = TILE_SIZE;

          this.tileLayer.addChild(sprite);
        }
      }
    }
  }

  private renderBlocks(blocks: MemoryBlock[]) {
    if (!this.blockLayer) return;
    const blockChildren = this.blockLayer.removeChildren();
    for (const child of blockChildren) {
      child.destroy({ children: true, texture: false });
    }

    for (const b of blocks) {
      let pxX: number;
      let pxY: number;

      if (b.pinX !== undefined && b.pinY !== undefined) {
        // Spatial pin percentage calculation on custom image map
        pxX = (b.pinX / 100) * this.mapWidth;
        pxY = (b.pinY / 100) * this.mapHeight;
      } else {
        pxX = tileToWorldPx(b.x);
        pxY = tileToWorldPx(b.y);
      }

      // Base Pillar / Pin Sprite
      const hasDoodle = Boolean(b.doodleId);
      const pillarTex = getBlockPillarTexture(hasDoodle);
      const pillarSprite = new Sprite(pillarTex);
      pillarSprite.x = pxX;
      pillarSprite.y = pxY;
      pillarSprite.width = TILE_SIZE;
      pillarSprite.height = TILE_SIZE;
      this.blockLayer.addChild(pillarSprite);

      // Render Pin Label Text if present
      if (b.pinLabel || b.title) {
        const labelText = new Text({
          text: b.pinLabel || b.title,
          style: new TextStyle({
            fontSize: 10,
            fill: "#fbbf24",
            stroke: { color: "#090d16", width: 3 },
            fontWeight: "bold",
            fontFamily: "sans-serif",
          }),
        });
        labelText.x = pxX + TILE_SIZE / 2 - labelText.width / 2;
        labelText.y = pxY + TILE_SIZE + 2;
        this.blockLayer.addChild(labelText);
      }

      // Custom Hand-Drawn Pixel Doodle Overlay
      if (b.doodleId && this.loadedDoodlesMap.has(b.doodleId)) {
        const doodleData = this.loadedDoodlesMap.get(b.doodleId)!;
        const doodleTex = getDoodleTexture(doodleData);
        const doodleSprite = new Sprite(doodleTex);

        doodleSprite.x = pxX - 4;
        doodleSprite.y = pxY - 18;
        doodleSprite.width = 24;
        doodleSprite.height = 24;
        this.blockLayer.addChild(doodleSprite);
      }
    }
  }

  private inputEnabled: boolean = true;

  public setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
  }

  private handleKeyDownBound = (e: KeyboardEvent) => {
    if (!this.inputEnabled) return;

    const target = e.target as HTMLElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    if (e.repeat) return;

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }

    this.playerController.handleKeyDown(e.code);
  };

  private handleKeyUpBound = (e: KeyboardEvent) => {
    if (!this.inputEnabled) return;
    this.playerController.handleKeyUp(e.code);
  };

  private handleCanvasClickBound = (e: MouseEvent) => {
    if (!this.inputEnabled || !this.app?.canvas) return;
    if (e.target !== this.app.canvas) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const scaleX = (this.app.screen?.width || rect.width) / (rect.width || 1);
    const scaleY = (this.app.screen?.height || rect.height) / (rect.height || 1);

    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;

    const playerPos = this.playerController.getPosition();
    const screenWidth = this.app.screen?.width || window.innerWidth;
    const screenHeight = this.app.screen?.height || window.innerHeight;
    const screenCenterX = screenWidth / 2;
    const screenCenterY = screenHeight / 2;

    const worldPxX = playerPos.x + (screenX - screenCenterX);
    const worldPxY = playerPos.y + (screenY - screenCenterY);

    const tileX = worldPxToTile(worldPxX);
    const tileY = worldPxToTile(worldPxY);

    let pinX: number | undefined = undefined;
    let pinY: number | undefined = undefined;

    if (this.currentMapImageUrl) {
      pinX = Number(((worldPxX / this.mapWidth) * 100).toFixed(2));
      pinY = Number(((worldPxY / this.mapHeight) * 100).toFixed(2));
    }

    const existingBlock = chunkManager.getBlockAt(this.currentWorldId, tileX, tileY);

    if (this.onTileClick) {
      this.onTileClick(tileX, tileY, existingBlock || undefined, pinX, pinY);
    }
  };

  private setupInputs() {
    window.addEventListener("keydown", this.handleKeyDownBound);
    window.addEventListener("keyup", this.handleKeyUpBound);

    if (this.app?.canvas) {
      this.app.canvas.addEventListener("click", this.handleCanvasClickBound);
    }
  }

  private update(delta: number) {
    const moved = this.playerController.update(delta);
    const playerPos = this.playerController.getPosition();

    // Update Player Sprite Position
    if (this.playerSprite) {
      this.playerSprite.x = playerPos.x;
      this.playerSprite.y = playerPos.y;
    }

    // Center Viewport Camera on Player Position
    const screenWidth = this.app?.screen?.width || window.innerWidth;
    const screenHeight = this.app?.screen?.height || window.innerHeight;
    const screenCenterX = screenWidth / 2;
    const screenCenterY = screenHeight / 2;

    this.worldContainer.x = Math.round(screenCenterX - playerPos.x);
    this.worldContainer.y = Math.round(screenCenterY - playerPos.y);

    if (moved) {
      this.refreshWorld();
    }
  }

  // Projection math helper: convert world tile or pin coordinate to screen pixel coordinates
  public worldToScreen(tileX: number, tileY: number, pinX?: number, pinY?: number): { x: number; y: number } | null {
    if (!this.app?.canvas) return null;
    const playerPos = this.playerController.getPosition();
    const screenWidth = this.app?.screen?.width || window.innerWidth;
    const screenHeight = this.app?.screen?.height || window.innerHeight;
    const screenCenterX = screenWidth / 2;
    const screenCenterY = screenHeight / 2;

    let blockPxX: number;
    let blockPxY: number;

    if (pinX !== undefined && pinY !== undefined && this.currentMapImageUrl) {
      blockPxX = (pinX / 100) * this.mapWidth;
      blockPxY = (pinY / 100) * this.mapHeight;
    } else {
      blockPxX = tileToWorldPx(tileX) + TILE_SIZE / 2;
      blockPxY = tileToWorldPx(tileY) + TILE_SIZE / 2;
    }

    const screenX = screenCenterX + (blockPxX - playerPos.x);
    const screenY = screenCenterY + (blockPxY - playerPos.y);

    return { x: screenX, y: screenY };
  }

  public destroy() {
    this.isDisposed = true;
    window.removeEventListener("keydown", this.handleKeyDownBound);
    window.removeEventListener("keyup", this.handleKeyUpBound);

    if (this.app?.canvas) {
      this.app.canvas.removeEventListener("click", this.handleCanvasClickBound);
    }

    if (this.app) {
      try {
        this.app.destroy(true, { children: true, texture: false });
      } catch (err) {
        console.warn("Pixi destroy notice:", err);
      }
      this.app = null;
      this.playerSprite = null;
      this.isInitialized = false;
      clearTextureCache();
    }
  }
}

export const pixiApp = new PixiApp();

import { TILE_SIZE, worldPxToTile } from "./constants";

export interface PlayerPosition {
  x: number; // Continuous pixel position X
  y: number; // Continuous pixel position Y
  tileX: number; // Discrete tile grid X
  tileY: number; // Discrete tile grid Y
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
}

export class PlayerController {
  private x: number = 0;
  private y: number = 0;
  private speed: number = 3.5; // Pixels per frame (~120px/s)
  private direction: "up" | "down" | "left" | "right" = "down";
  private keysPressed = new Set<string>();
  private virtualVector = { x: 0, y: 0 };
  private onPositionChange?: (pos: PlayerPosition) => void;

  private handleBlurBound = () => {
    this.keysPressed.clear();
  };

  private handleVisibilityBound = () => {
    if (document.hidden) this.keysPressed.clear();
  };

  constructor(initialTileX = 0, initialTileY = 0) {
    this.setPosition(initialTileX * TILE_SIZE + TILE_SIZE / 2, initialTileY * TILE_SIZE + TILE_SIZE / 2);

    // Clear stuck keys when window loses focus or tab hides
    if (typeof window !== "undefined") {
      window.addEventListener("blur", this.handleBlurBound);
      document.addEventListener("visibilitychange", this.handleVisibilityBound);
    }
  }

  public destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("blur", this.handleBlurBound);
      document.removeEventListener("visibilitychange", this.handleVisibilityBound);
    }
    this.keysPressed.clear();
  }

  public setPosition(pxX: number, pxY: number) {
    this.x = pxX;
    this.y = pxY;
    this.notify();
  }

  public setOnPositionChange(cb: (pos: PlayerPosition) => void) {
    this.onPositionChange = cb;
  }

  public handleKeyDown(code: string) {
    this.keysPressed.add(code);
  }

  public handleKeyUp(code: string) {
    this.keysPressed.delete(code);
  }

  public setVirtualDirection(vx: number, vy: number) {
    this.virtualVector = { x: vx, y: vy };
  }

  public update(delta: number): boolean {
    let dx = 0;
    let dy = 0;

    if (this.keysPressed.has("KeyW") || this.keysPressed.has("ArrowUp")) dy -= 1;
    if (this.keysPressed.has("KeyS") || this.keysPressed.has("ArrowDown")) dy += 1;
    if (this.keysPressed.has("KeyA") || this.keysPressed.has("ArrowLeft")) dx -= 1;
    if (this.keysPressed.has("KeyD") || this.keysPressed.has("ArrowRight")) dx += 1;

    // Add virtual joystick vector
    dx += this.virtualVector.x;
    dy += this.virtualVector.y;

    if (dx === 0 && dy === 0) {
      return false;
    }

    // Normalize diagonal movement
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }

    // Determine primary direction
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? "right" : "left";
    } else if (Math.abs(dy) > 0) {
      this.direction = dy > 0 ? "down" : "up";
    }

    const clampedDelta = Math.min(delta, 1.5);
    const moveDistX = dx * this.speed * clampedDelta;
    const moveDistY = dy * this.speed * clampedDelta;

    const nextX = this.x + moveDistX;
    const nextY = this.y + moveDistY;

    // 5px Bounding Box radius around player center
    const radius = 5;
    const currentTileX = worldPxToTile(this.x);
    const currentTileY = worldPxToTile(this.y);
    const isCurrentlyStuck = this.isTileSolidFunc ? this.isTileSolidFunc(currentTileX, currentTileY) : false;

    // Independent X-axis collision check (enables wall sliding)
    if (this.isTileSolidFunc) {
      const checkX = nextX + (moveDistX > 0 ? radius : -radius);
      const tileXAtNext = worldPxToTile(checkX);
      if (isCurrentlyStuck || !this.isTileSolidFunc(tileXAtNext, currentTileY)) {
        this.x = nextX;
      }
    } else {
      this.x = nextX;
    }

    // Independent Y-axis collision check (enables wall sliding)
    if (this.isTileSolidFunc) {
      const checkY = nextY + (moveDistY > 0 ? radius : -radius);
      const tileYAtNext = worldPxToTile(checkY);
      const tileXAtCurrent = worldPxToTile(this.x);
      if (isCurrentlyStuck || !this.isTileSolidFunc(tileXAtCurrent, tileYAtNext)) {
        this.y = nextY;
      }
    } else {
      this.y = nextY;
    }

    this.notify();
    return true;
  }

  private isTileSolidFunc?: (tileX: number, tileY: number) => boolean;

  public setIsTileSolid(func: (tileX: number, tileY: number) => boolean) {
    this.isTileSolidFunc = func;
  }

  public getPosition(): PlayerPosition {
    return {
      x: this.x,
      y: this.y,
      tileX: Math.floor(this.x / TILE_SIZE),
      tileY: Math.floor(this.y / TILE_SIZE),
      direction: this.direction,
      isMoving: this.keysPressed.size > 0 || this.virtualVector.x !== 0 || this.virtualVector.y !== 0,
    };
  }

  private notify() {
    if (this.onPositionChange) {
      this.onPositionChange(this.getPosition());
    }
  }
}

import React, { useEffect, useState, useRef, useCallback } from "react";
import { AppMeta, WorldFolder, MemoryBlock } from "./domain/types";
import { getAppMeta, updateActiveWorld, getAllWorlds, getAllBlocks, saveBlock, deleteBlock, saveWorld } from "./domain/db";
import { pixiApp } from "./engine/PixiApp";
import { chunkManager } from "./engine/ChunkManager";
import { PlayerPosition } from "./engine/PlayerController";
import { ProximityPopup } from "./components/ProximityPopup";
import { BlockModal } from "./components/BlockModal";
import { JournalModal } from "./components/JournalModal";
import { Minimap } from "./components/Minimap";
import { ReviewModal } from "./components/ReviewModal";
import { FolderModal } from "./components/FolderModal";
import { BackupModal } from "./components/BackupModal";
import { ControlsOverlay } from "./components/ControlsOverlay";
import { AuthModal } from "./components/AuthModal";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Domain State
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [worlds, setWorlds] = useState<WorldFolder[]>([]);
  const [activeWorld, setActiveWorld] = useState<WorldFolder | null>(null);
  const [blocks, setBlocks] = useState<MemoryBlock[]>([]);
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>({
    x: 0,
    y: 0,
    tileX: 0,
    tileY: 0,
    direction: "down",
    isMoving: false,
  });

  // UI State & Modals
  const [studyMode, setStudyMode] = useState<boolean>(false); // false = Explore (Cue), true = Study (Reveal)
  const [buildMode, setBuildMode] = useState<boolean>(false); // Minecraft-style Block Building Mode
  const [selectedTileType, setSelectedTileType] = useState<number>(1); // Default Cobblestone

  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [modalTargetTile, setModalTargetTile] = useState<{ x: number; y: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<MemoryBlock | null>(null);

  const [showJournal, setShowJournal] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [showFolders, setShowFolders] = useState<boolean>(false);
  const [showBackup, setShowBackup] = useState<boolean>(false);
  const [showSync, setShowSync] = useState<boolean>(false);

  // Refs for current state inside event callbacks
  const buildModeRef = useRef(buildMode);
  const selectedTileTypeRef = useRef(selectedTileType);
  const activeWorldRef = useRef(activeWorld);

  useEffect(() => {
    buildModeRef.current = buildMode;
    selectedTileTypeRef.current = selectedTileType;
    activeWorldRef.current = activeWorld;
  }, [buildMode, selectedTileType, activeWorld]);

  // Modal click isolation
  const isAnyModalOpen = showBlockModal || showJournal || showReview || showFolders || showBackup || showSync;
  useEffect(() => {
    pixiApp.setInputEnabled(!isAnyModalOpen);
  }, [isAnyModalOpen]);

  // Load Database Initialization
  const refreshDatabase = useCallback(async () => {
    try {
      const appMeta = await getAppMeta();
      setMeta(appMeta);

      const allWorlds = await getAllWorlds();
      setWorlds(allWorlds);

      const currentWorld = allWorlds.find((w) => w.id === appMeta.activeWorldId) || allWorlds[0];
      setActiveWorld(currentWorld);

      const allBlocks = await getAllBlocks();
      setBlocks(allBlocks);

      if (currentWorld) {
        const startX = currentWorld.lastTileX ?? currentWorld.spawnX;
        const startY = currentWorld.lastTileY ?? currentWorld.spawnY;
        await pixiApp.setWorld(currentWorld.id, currentWorld.themeColor, startX, startY);
      }
    } catch (err) {
      console.error("Failed to initialize database:", err);
    }
  }, []);

  // Initialize PixiJS Viewport once mounted
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    pixiApp.init(containerRef.current).then(() => {
      if (!isMounted) return;

      let lastMoveTime = 0;
      pixiApp.setOnPlayerMove((pos) => {
        const now = Date.now();
        if (now - lastMoveTime >= 100) {
          lastMoveTime = now;
          setPlayerPosition(pos);
        }
      });

      pixiApp.setOnTileClick(async (tileX, tileY, existingBlock) => {
        if (buildModeRef.current) {
          if (activeWorldRef.current) {
            await chunkManager.setTileAt(activeWorldRef.current.id, tileX, tileY, selectedTileTypeRef.current);
            await pixiApp.refreshWorld(true);
          }
        } else {
          setModalTargetTile({ x: tileX, y: tileY });
          setEditingBlock(existingBlock || null);
          setShowBlockModal(true);
        }
      });

      refreshDatabase();
    }).catch((err) => {
      console.error("Failed to initialize PixiApp:", err);
      // Fall back to refreshing database even if canvas fails
      refreshDatabase();
    });

    return () => {
      isMounted = false;
      pixiApp.destroy();
    };
  }, [refreshDatabase]);

  // Global Hotkey listeners (E/Space = Place, Delete/X = Delete, F = Elevator)
  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.code === "KeyE" || (e.code === "Space" && !e.repeat)) {
        e.preventDefault();
        if (buildModeRef.current) {
          // BUILD MODE ACTIVE: Paint selected block tile at player position
          if (activeWorld) {
            await chunkManager.setTileAt(activeWorld.id, playerPosition.tileX, playerPosition.tileY, selectedTileTypeRef.current);
            await pixiApp.refreshWorld(true);
          }
        } else {
          // NORMAL MODE ACTIVE: Open Memory Anchor Modal
          const existing = chunkManager.getBlockAt(activeWorld?.id || "", playerPosition.tileX, playerPosition.tileY);
          setModalTargetTile({ x: playerPosition.tileX, y: playerPosition.tileY });
          setEditingBlock(existing || null);
          setShowBlockModal(true);
        }
      } else if (
        e.code === "Delete" ||
        e.key === "Delete" ||
        e.code === "Backspace" ||
        e.key === "Backspace" ||
        e.code === "KeyX" ||
        (e.key && e.key.toLowerCase() === "x")
      ) {
        e.preventDefault();
        await handleDeleteSmart();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        setShowFolders(true);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setShowMinimap((prev) => !prev);
      } else if (e.code === "KeyJ") {
        e.preventDefault();
        setShowJournal(true);
      } else if (e.code === "KeyR") {
        e.preventDefault();
        setShowReview(true);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        setBuildMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isAnyModalOpen, activeWorld, playerPosition.tileX, playerPosition.tileY]);

  // Debounce autosave player last known tile position to active world
  useEffect(() => {
    if (!activeWorld) return;

    const timer = setTimeout(() => {
      if (activeWorld.lastTileX !== playerPosition.tileX || activeWorld.lastTileY !== playerPosition.tileY) {
        const updatedWorld = {
          ...activeWorld,
          lastTileX: playerPosition.tileX,
          lastTileY: playerPosition.tileY,
          updatedAt: Date.now(),
        };
        saveWorld(updatedWorld);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [playerPosition.tileX, playerPosition.tileY, activeWorld]);

  // World Switching
  const handleSelectWorld = async (worldId: string) => {
    await updateActiveWorld(worldId);
    const updatedMeta = await getAppMeta();
    setMeta(updatedMeta);

    const targetWorld = worlds.find((w) => w.id === worldId);
    if (targetWorld) {
      setActiveWorld(targetWorld);
      const startX = targetWorld.lastTileX ?? targetWorld.spawnX;
      const startY = targetWorld.lastTileY ?? targetWorld.spawnY;
      await pixiApp.setWorld(targetWorld.id, targetWorld.themeColor, startX, startY);
    }
  };

  // Block Modal Save / Delete
  const handleSaveBlock = async (block: MemoryBlock) => {
    await chunkManager.createOrUpdateBlock(block);
    await pixiApp.reloadDoodlesCache();
    await pixiApp.refreshWorld(true);

    const updatedBlocks = await getAllBlocks();
    setBlocks(updatedBlocks);
    setShowBlockModal(false);
  };

  // Smart delete handler (works for exact player tile or active proximity block)
  const handleDeleteSmart = async () => {
    const curWorld = activeWorldRef.current || activeWorld;
    if (!curWorld) return;

    // 1. Check exact player tile first
    let targetBlock = chunkManager.getBlockAt(curWorld.id, playerPosition.tileX, playerPosition.tileY);

    // 2. If no block directly under player, check for closest block within proximity (<= 2.5 tiles)
    if (!targetBlock) {
      let minDistance = Infinity;
      for (const b of blocks) {
        if (b.worldId !== curWorld.id) continue;
        const dx = b.x - playerPosition.tileX;
        const dy = b.y - playerPosition.tileY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 2.5 && dist < minDistance) {
          minDistance = dist;
          targetBlock = b;
        }
      }
    }

    if (targetBlock) {
      await chunkManager.removeBlockById(targetBlock.id);
      await pixiApp.reloadDoodlesCache();
      await pixiApp.refreshWorld(true);
      const updated = await getAllBlocks();
      setBlocks(updated);
    } else if (buildModeRef.current || buildMode) {
      // Build mode: reset tile at player position to baseline grass (0)
      await chunkManager.setTileAt(curWorld.id, playerPosition.tileX, playerPosition.tileY, 0);
      await pixiApp.refreshWorld(true);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    await chunkManager.removeBlockById(blockId);
    await pixiApp.reloadDoodlesCache();
    await pixiApp.refreshWorld(true);

    const updatedBlocks = await getAllBlocks();
    setBlocks(updatedBlocks);
    setShowBlockModal(false);
  };

  // Teleport Handler
  const handleTeleportToTile = async (worldId: string, tileX: number, tileY: number) => {
    if (worldId !== activeWorld?.id) {
      await handleSelectWorld(worldId);
    }
    await pixiApp.teleportToTile(worldId, tileX, tileY);
    setShowJournal(false);
    setShowReview(false);
    setShowMinimap(false);
  };

  const dueBlocksCount = blocks.filter((b) => b.srs.due <= Date.now()).length;

  return (
    <div className="w-full h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative select-none">
      {/* PixiJS 2D Canvas Mount */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 block" />

      {/* Loading Overlay */}
      {!activeWorld && (
        <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing Spatial Memory System...</span>
        </div>
      )}

      {activeWorld && (
        <>
          {/* Decorative CRT scanline overlay over canvas */}
          <div className="fixed inset-0 z-20 pointer-events-none crt-scanlines" />

      {/* Proximity Cue Overlay (Explore vs Study Mode) */}
      <ProximityPopup
        worldId={activeWorld.id}
        playerPosition={playerPosition}
        allBlocks={blocks}
        studyMode={studyMode}
        onOpenBlock={(block) => {
          setModalTargetTile({ x: block.x, y: block.y });
          setEditingBlock(block);
          setShowBlockModal(true);
        }}
      />

      {/* Minimap Popup Overlay */}
      {showMinimap && (
        <div className="fixed top-20 right-4 z-40">
          <Minimap
            worldId={activeWorld.id}
            playerPosition={playerPosition}
            blocks={blocks.filter((b) => b.worldId === activeWorld.id)}
            themeColor={activeWorld.themeColor}
            onTeleportToTile={(x, y) => handleTeleportToTile(activeWorld.id, x, y)}
            onClose={() => setShowMinimap(false)}
          />
        </div>
      )}

      {/* HUD & Control Bars Overlay */}
      <ControlsOverlay
        activeWorld={activeWorld}
        dueCount={dueBlocksCount}
        studyMode={studyMode}
        buildMode={buildMode}
        selectedTileType={selectedTileType}
        onToggleBuildMode={() => setBuildMode((prev) => !prev)}
        onSelectTileType={(t) => setSelectedTileType(t)}
        onToggleStudyMode={() => setStudyMode((prev) => !prev)}
        onOpenFolders={() => setShowFolders(true)}
        onOpenJournal={() => setShowJournal(true)}
        onOpenReview={() => setShowReview(true)}
        onToggleMinimap={() => setShowMinimap((prev) => !prev)}
        onOpenBackup={() => setShowBackup(true)}
        onOpenSync={() => setShowSync(true)}
        onPlaceAnchorClick={() => {
          setModalTargetTile({ x: playerPosition.tileX, y: playerPosition.tileY });
          setEditingBlock(null);
          setShowBlockModal(true);
        }}
        onDeleteAtPlayer={handleDeleteSmart}
        onVirtualDirection={(vx, vy) => {
          pixiApp.getPlayerController().setVirtualDirection(vx, vy);
        }}
      />

      {/* Modals */}
      {showBlockModal && modalTargetTile && (
        <BlockModal
          worldId={activeWorld.id}
          tileX={modalTargetTile.x}
          tileY={modalTargetTile.y}
          existingBlock={editingBlock}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
          onCancel={() => setShowBlockModal(false)}
        />
      )}

      {showJournal && (
        <JournalModal
          blocks={blocks}
          worlds={worlds}
          activeWorldId={activeWorld.id}
          onTeleportToBlock={handleTeleportToTile}
          onClose={() => setShowJournal(false)}
        />
      )}

      {showReview && (
        <ReviewModal
          blocks={blocks}
          onUpdateBlock={async () => {
            const updated = await getAllBlocks();
            setBlocks(updated);
          }}
          onTeleportToBlock={handleTeleportToTile}
          onClose={() => setShowReview(false)}
        />
      )}

      {showFolders && (
        <FolderModal
          worlds={worlds}
          activeWorldId={activeWorld.id}
          onSelectWorld={handleSelectWorld}
          onRefreshWorlds={refreshDatabase}
          onClose={() => setShowFolders(false)}
        />
      )}

      {showBackup && (
        <BackupModal
          onDatabaseImported={refreshDatabase}
          onClose={() => setShowBackup(false)}
        />
      )}

      {showSync && (
        <AuthModal
          onClose={() => setShowSync(false)}
          onSyncComplete={refreshDatabase}
        />
      )}
        </>
      )}
    </div>
  );
}

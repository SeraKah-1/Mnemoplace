import React, { useEffect, useState, useRef, useCallback } from "react";
import { AppMeta, WorldFolder, MemoryBlock } from "./domain/types";
import { getAppMeta, updateActiveWorld, getAllWorlds, getAllBlocks, saveBlock, deleteBlock } from "./domain/db";
import { pixiApp } from "./engine/PixiApp";
import { PlayerPosition } from "./engine/PlayerController";
import { ProximityPopup } from "./components/ProximityPopup";
import { BlockModal } from "./components/BlockModal";
import { JournalModal } from "./components/JournalModal";
import { Minimap } from "./components/Minimap";
import { ReviewModal } from "./components/ReviewModal";
import { FolderModal } from "./components/FolderModal";
import { BackupModal } from "./components/BackupModal";
import { ControlsOverlay } from "./components/ControlsOverlay";

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
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [modalTargetTile, setModalTargetTile] = useState<{ x: number; y: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<MemoryBlock | null>(null);

  const [showJournal, setShowJournal] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [showFolders, setShowFolders] = useState<boolean>(false);
  const [showBackup, setShowBackup] = useState<boolean>(false);

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
        await pixiApp.setWorld(currentWorld.id, currentWorld.themeColor, currentWorld.spawnX, currentWorld.spawnY);
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

      pixiApp.setOnPlayerMove((pos) => {
        setPlayerPosition(pos);
      });

      pixiApp.setOnTileClick((tileX, tileY, existingBlock) => {
        setModalTargetTile({ x: tileX, y: tileY });
        setEditingBlock(existingBlock || null);
        setShowBlockModal(true);
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

  // World Switching
  const handleSelectWorld = async (worldId: string) => {
    await updateActiveWorld(worldId);
    const updatedMeta = await getAppMeta();
    setMeta(updatedMeta);

    const targetWorld = worlds.find((w) => w.id === worldId);
    if (targetWorld) {
      setActiveWorld(targetWorld);
      await pixiApp.setWorld(targetWorld.id, targetWorld.themeColor, targetWorld.spawnX, targetWorld.spawnY);
    }
  };

  // Block Modal Save / Delete
  const handleSaveBlock = async (block: MemoryBlock) => {
    await saveBlock(block);
    await pixiApp.reloadDoodlesCache();
    await pixiApp.refreshWorld();

    const updatedBlocks = await getAllBlocks();
    setBlocks(updatedBlocks);
    setShowBlockModal(false);
  };

  const handleDeleteBlock = async (blockId: string) => {
    await deleteBlock(blockId);
    await pixiApp.refreshWorld();

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
        onToggleStudyMode={() => setStudyMode((prev) => !prev)}
        onOpenFolders={() => setShowFolders(true)}
        onOpenJournal={() => setShowJournal(true)}
        onOpenReview={() => setShowReview(true)}
        onToggleMinimap={() => setShowMinimap((prev) => !prev)}
        onOpenBackup={() => setShowBackup(true)}
        onPlaceAnchorClick={() => {
          setModalTargetTile({ x: playerPosition.tileX, y: playerPosition.tileY });
          setEditingBlock(null);
          setShowBlockModal(true);
        }}
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
        </>
      )}
    </div>
  );
}

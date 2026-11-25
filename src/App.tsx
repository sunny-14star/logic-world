import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AchievementsModal from './components/AchievementsModal';
import CharacterModal from './components/CharacterModal';
import GameCanvas, { type TouchInputState } from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import InventoryShopModal from './components/InventoryShopModal';
import MissionsLogModal from './components/MissionsLogModal';
import NpcDialogModal from './components/NpcDialogModal';
import PauseSettingsModal from './components/PauseSettingsModal';
import PuzzleModal from './components/PuzzleModal';
import TitleScreen from './components/TitleScreen';
import WorldMapModal from './components/WorldMapModal';
import { ACHIEVEMENTS, BLOCK_MATERIALS, createInitialSaveState } from './data/catalog';
import { MISSIONS } from './data/missions';
import { WORLD_MAP } from './data/worlds';
import { soundEngine } from './game/audio';
import {
  completeMissionInState,
  evaluateAchievements,
  evaluateBuildMission,
  evaluateCollectMission,
  getEffectiveBlockCost,
  loadFromStorage,
  saveToStorage,
} from './game/rules';
import type {
  AbilityId,
  ActiveModal,
  BlockMaterialId,
  CharacterCustomization,
  GameScreenState,
  GameSettings,
  MissionDefinition,
  NearbyInteractable,
  PlacedBlock,
  SaveGameState,
  Vec3,
  WorldId,
} from './types/game';

export default function App() {
  const initialStored = useMemo(() => loadFromStorage(), []);
  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [saveState, setSaveState] = useState<SaveGameState>(
    () => initialStored || createInitialSaveState()
  );
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() => Boolean(initialStored));
  const [gameState, setGameState] = useState<GameScreenState>(() =>
    autostart ? 'playing' : 'title'
  );
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionDefinition | null>(null);

  const [buildMode, setBuildMode] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<BlockMaterialId>('madera');
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [playerPos, setPlayerPos] = useState<Vec3>(
    () =>
      (initialStored || createInitialSaveState()).playerPositionsByWorld[
        (initialStored || createInitialSaveState()).currentWorldId
      ]
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const touchInputRef = useRef<TouchInputState>({
    moveX: 0,
    moveY: 0,
    jumpQueued: false,
    sprint: false,
    crouch: false,
  });

  const actionTriggerRef = useRef<{
    interact: () => void;
    placeAtPlayer: () => void;
    respawn: () => void;
  } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  // Sync body dataset state for automation & clean state machine
  useEffect(() => {
    document.body.dataset.state = activeModal === 'pause' ? 'paused' : gameState;
    document.body.dataset.world = saveState.currentWorldId;
  }, [gameState, activeModal, saveState.currentWorldId]);

  // Sync sound engine settings
  useEffect(() => {
    soundEngine.configure(saveState.settings.soundEnabled, saveState.settings.volume);
  }, [saveState.settings.soundEnabled, saveState.settings.volume]);

  // Auto-save whenever saveState changes while playing or customized
  useEffect(() => {
    saveToStorage(saveState);
  }, [saveState]);

  const startPlay = useCallback((fresh: boolean) => {
    soundEngine.click();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (fresh) {
      const freshState = createInitialSaveState();
      setSaveState(freshState);
      setPlayerPos(freshState.playerPositionsByWorld[freshState.currentWorldId]);
      setHasSavedGame(true);
    }
    setActiveModal(null);
    setGameState('playing');
    document.body.dataset.state = 'playing';
  }, []);

  // Global keyboard shortcuts (Title Enter/Space, Playing Esc/P/M/I/1-8)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (gameState === 'title' && activeModal === null) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startPlay(!hasSavedGame);
        }
        return;
      }

      if (gameState === 'playing' && !inInput) {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          if (activeModal !== null) {
            setActiveModal(null);
          } else {
            setActiveModal('pause');
          }
          return;
        }
        if (activeModal === null) {
          if (e.code === 'KeyM') {
            setActiveModal('map');
          } else if (e.code === 'KeyI') {
            setActiveModal('inventory');
          } else if (e.key >= '1' && e.key <= '8') {
            const idx = Number(e.key) - 1;
            if (BLOCK_MATERIALS[idx]) {
              setSelectedMaterial(BLOCK_MATERIALS[idx].id);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, activeModal, hasSavedGame, startPlay]);

  const handleCompleteMission = useCallback(
    (mission: MissionDefinition) => {
      setSaveState((prev) => {
        const { nextState, leveledUp, newAchievements } = completeMissionInState(prev, mission);
        if (leveledUp) {
          soundEngine.levelUp();
          showToast(`¡Subiste de nivel! (+${mission.xpReward} XP)`);
        } else if (newAchievements.length > 0) {
          const ach = ACHIEVEMENTS.find((a) => a.id === newAchievements[0]);
          showToast(`Logro desbloqueado: ${ach?.title || newAchievements[0]}`);
        } else {
          showToast(`Misión completada: +${mission.xpReward} XP · +${mission.coinReward} monedas`);
        }
        return nextState;
      });
    },
    [showToast]
  );

  const handleCollect = useCallback(
    (collectibleId: string) => {
      setSaveState((prev) => {
        if (prev.collectedIds.includes(collectibleId)) return prev;
        const world = WORLD_MAP[prev.currentWorldId];
        const col = world.collectibles.find((c) => c.id === collectibleId);
        if (!col) return prev;

        const nextCollected = [...prev.collectedIds, collectibleId];
        let nextState: SaveGameState = {
          ...prev,
          xp: prev.xp + col.xp,
          coins: prev.coins + col.coins,
          collectedIds: nextCollected,
          lastSavedAt: new Date().toISOString(),
        };

        // Check if any world-collect mission in current world just completed
        const collectMissions = MISSIONS.filter(
          (m) =>
            m.worldId === prev.currentWorldId &&
            m.mechanic === 'world-collect' &&
            !nextState.completedMissionIds.includes(m.id)
        );
        for (const cm of collectMissions) {
          if (evaluateCollectMission(cm, nextCollected).solved) {
            soundEngine.success();
            nextState = completeMissionInState(nextState, cm).nextState;
            showToast(`¡Misión completada: ${cm.title}! (+${cm.xpReward} XP)`);
          } else {
            showToast(`Recogido: ${col.name} (+${col.xp} XP, +${col.coins} monedas)`);
          }
        }
        if (collectMissions.length === 0) {
          showToast(`Recogido: ${col.name} (+${col.xp} XP, +${col.coins} monedas)`);
        }

        const { newlyUnlocked, bonusXp } = evaluateAchievements(nextState);
        if (newlyUnlocked.length > 0) {
          nextState = {
            ...nextState,
            xp: nextState.xp + bonusXp,
            unlockedAchievements: [...nextState.unlockedAchievements, ...newlyUnlocked],
          };
        }
        return nextState;
      });
    },
    [showToast]
  );

  const handlePlaceBlock = useCallback(
    (x: number, y: number, z: number) => {
      setSaveState((prev) => {
        const count = prev.inventory[selectedMaterial] || 0;
        if (count <= 0) return prev;

        const duplicate = prev.placedBlocks.some(
          (b) =>
            b.worldId === prev.currentWorldId &&
            Math.abs(b.x - x) < 0.25 &&
            Math.abs(b.y - y) < 0.25 &&
            Math.abs(b.z - z) < 0.25
        );
        if (duplicate) return prev;

        const newBlock: PlacedBlock = {
          id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          worldId: prev.currentWorldId,
          x,
          y,
          z,
          materialId: selectedMaterial,
        };
        const nextBlocks = [...prev.placedBlocks, newBlock];
        let nextState: SaveGameState = {
          ...prev,
          inventory: { ...prev.inventory, [selectedMaterial]: count - 1 },
          placedBlocks: nextBlocks,
          lastSavedAt: new Date().toISOString(),
        };

        // Check world-build missions in this world
        const buildMissions = MISSIONS.filter(
          (m) =>
            m.worldId === prev.currentWorldId &&
            m.mechanic === 'world-build' &&
            !nextState.completedMissionIds.includes(m.id)
        );
        for (const bm of buildMissions) {
          if (evaluateBuildMission(bm, nextBlocks).solved) {
            soundEngine.success();
            nextState = completeMissionInState(nextState, bm).nextState;
            showToast(`¡Construcción completada: ${bm.title}! (+${bm.xpReward} XP)`);
          }
        }

        const { newlyUnlocked, bonusXp } = evaluateAchievements(nextState);
        if (newlyUnlocked.length > 0) {
          nextState = {
            ...nextState,
            xp: nextState.xp + bonusXp,
            unlockedAchievements: [...nextState.unlockedAchievements, ...newlyUnlocked],
          };
        }
        return nextState;
      });
    },
    [selectedMaterial, showToast]
  );

  const handleRemoveBlock = useCallback((blockId: string) => {
    setSaveState((prev) => {
      const target = prev.placedBlocks.find((b) => b.id === blockId);
      if (!target) return prev;
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [target.materialId]: (prev.inventory[target.materialId] || 0) + 1,
        },
        placedBlocks: prev.placedBlocks.filter((b) => b.id !== blockId),
        lastSavedAt: new Date().toISOString(),
      };
    });
  }, []);

  const handleInteract = useCallback((item: NearbyInteractable) => {
    soundEngine.click();
    if (item.kind === 'npc') {
      setSelectedNpcId(item.id);
      setActiveModal('npc');
    } else if (item.kind === 'mission') {
      const mission = MISSIONS.find((m) => m.id === item.id) || null;
      if (mission) {
        setSelectedMission(mission);
        setActiveModal('puzzle');
      }
    }
  }, []);

  const handlePositionSample = useCallback((pos: Vec3) => {
    setPlayerPos(pos);
    setSaveState((prev) => ({
      ...prev,
      playerPositionsByWorld: {
        ...prev.playerPositionsByWorld,
        [prev.currentWorldId]: pos,
      },
    }));
  }, []);

  const handleSelectWorld = useCallback(
    (worldId: WorldId) => {
      soundEngine.click();
      setBuildMode(false);
      setNearby(null);
      setSaveState((prev) => {
        const firstPending = MISSIONS.find(
          (m) => m.worldId === worldId && !prev.completedMissionIds.includes(m.id)
        );
        return {
          ...prev,
          currentWorldId: worldId,
          trackedMissionId: firstPending ? firstPending.id : null,
          lastSavedAt: new Date().toISOString(),
        };
      });
      setActiveModal(null);
      showToast(`Viajaste a ${WORLD_MAP[worldId].name}`);
    },
    [showToast]
  );

  const handleBuyBlock = useCallback(
    (matId: BlockMaterialId, qty: number) => {
      setSaveState((prev) => {
        const unitCost = getEffectiveBlockCost(matId, prev.unlockedAbilities);
        const packCost = unitCost * 4;
        if (prev.coins < packCost) return prev;
        soundEngine.collect();
        return {
          ...prev,
          coins: prev.coins - packCost,
          inventory: {
            ...prev.inventory,
            [matId]: (prev.inventory[matId] || 0) + qty,
          },
        };
      });
    },
    []
  );

  const handleBuyAccessory = useCallback(
    (acc: CharacterCustomization['accessory'], cost: number) => {
      setSaveState((prev) => {
        if (prev.coins < cost || prev.unlockedAccessories.includes(acc)) return prev;
        soundEngine.success();
        return {
          ...prev,
          coins: prev.coins - cost,
          unlockedAccessories: [...prev.unlockedAccessories, acc],
          customization: { ...prev.customization, accessory: acc },
        };
      });
    },
    []
  );

  const handleUnlockAbility = useCallback((abilityId: AbilityId, cost: number) => {
    setSaveState((prev) => {
      if (prev.coins < cost || prev.unlockedAbilities.includes(abilityId)) return prev;
      soundEngine.levelUp();
      return {
        ...prev,
        coins: prev.coins - cost,
        unlockedAbilities: [...prev.unlockedAbilities, abilityId],
      };
    });
  }, []);

  const activeNpc = useMemo(() => {
    if (!selectedNpcId) return null;
    const world = WORLD_MAP[saveState.currentWorldId];
    return world.npcs.find((n) => n.id === selectedNpcId) || null;
  }, [selectedNpcId, saveState.currentWorldId]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b131e]">
      <GameCanvas
        gameState={gameState}
        activeModal={activeModal}
        saveState={saveState}
        buildMode={buildMode}
        selectedMaterial={selectedMaterial}
        touchInputRef={touchInputRef}
        actionTriggerRef={actionTriggerRef}
        onNearbyChange={setNearby}
        onCollect={handleCollect}
        onInteract={handleInteract}
        onPlaceBlock={handlePlaceBlock}
        onRemoveBlock={handleRemoveBlock}
        onPositionSample={handlePositionSample}
        onToggleBuildMode={() => {
          soundEngine.click();
          setBuildMode((b) => !b);
        }}
      />

      {gameState === 'title' && activeModal === null && (
        <TitleScreen
          hasSavedGame={hasSavedGame}
          savedState={initialStored || (hasSavedGame ? saveState : null)}
          onNewGame={() => startPlay(true)}
          onContinue={() => startPlay(false)}
          onOpenCustomize={() => {
            soundEngine.click();
            setActiveModal('character');
          }}
        />
      )}

      {gameState === 'playing' && (
        <GameHUD
          saveState={saveState}
          playerPos={playerPos}
          nearby={nearby}
          buildMode={buildMode}
          selectedMaterial={selectedMaterial}
          touchInputRef={touchInputRef}
          onSelectMaterial={(mat) => {
            soundEngine.click();
            setSelectedMaterial(mat);
          }}
          onToggleBuildMode={() => {
            soundEngine.click();
            setBuildMode((b) => !b);
          }}
          onOpenModal={(m) => {
            soundEngine.click();
            setActiveModal(m);
          }}
          onToggleSound={() => {
            setSaveState((prev) => ({
              ...prev,
              settings: { ...prev.settings, soundEnabled: !prev.settings.soundEnabled },
            }));
          }}
          onInteractClick={() => actionTriggerRef.current?.interact()}
          onQuickPlaceBlock={() => actionTriggerRef.current?.placeAtPlayer()}
        />
      )}

      {/* Non-intrusive Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-[#0f172a]/95 border border-emerald-400/70 text-emerald-200 text-xs sm:text-sm font-semibold shadow-2xl pointer-events-none"
        >
          {toastMsg}
        </div>
      )}

      {/* Active Modals */}
      {activeModal === 'character' && (
        <CharacterModal
          saveState={saveState}
          onSaveCustomization={(custom) => {
            soundEngine.success();
            setSaveState((prev) => ({
              ...prev,
              playerName: custom.name,
              customization: custom,
            }));
            setHasSavedGame(true);
            showToast('Personaje actualizado');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'npc' && activeNpc && (
        <NpcDialogModal
          npc={activeNpc}
          saveState={saveState}
          onStartMission={(mission) => {
            setSelectedMission(mission);
            setActiveModal('puzzle');
          }}
          onTrackMission={(mId) => {
            setSaveState((prev) => ({ ...prev, trackedMissionId: mId }));
            showToast('Objetivo fijado en tu brújula');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'puzzle' && selectedMission && (
        <PuzzleModal
          mission={selectedMission}
          saveState={saveState}
          onComplete={handleCompleteMission}
          onSwitchToBuildHere={() => {
            setBuildMode(true);
            setActiveModal(null);
            showToast('Modo Construir activado. Coloca bloques en la zona marcada.');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'map' && (
        <WorldMapModal
          saveState={saveState}
          playerPos={playerPos}
          onSelectWorld={handleSelectWorld}
          onTrackMission={(mId) => {
            setSaveState((prev) => ({ ...prev, trackedMissionId: mId }));
            showToast('Misión marcada en el radar');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'inventory' && (
        <InventoryShopModal
          saveState={saveState}
          onBuyBlock={handleBuyBlock}
          onBuyAccessory={handleBuyAccessory}
          onUnlockAbility={handleUnlockAbility}
          onSelectMaterial={(mat) => {
            setSelectedMaterial(mat);
            setBuildMode(true);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'missions' && (
        <MissionsLogModal
          saveState={saveState}
          onStartMission={(mission) => {
            setSelectedMission(mission);
            setActiveModal('puzzle');
          }}
          onTrackMission={(mId) => {
            setSaveState((prev) => ({ ...prev, trackedMissionId: mId }));
            showToast('Objetivo actualizado en tu brújula');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'achievements' && (
        <AchievementsModal saveState={saveState} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'pause' && (
        <PauseSettingsModal
          settings={saveState.settings}
          onUpdateSettings={(nextSettings: GameSettings) =>
            setSaveState((prev) => ({ ...prev, settings: nextSettings }))
          }
          onSaveNow={() => {
            saveToStorage(saveState);
            soundEngine.success();
            showToast('Progreso guardado en este dispositivo');
          }}
          onResetPosition={() => {
            const worldSpawn = WORLD_MAP[saveState.currentWorldId].spawnPosition;
            actionTriggerRef.current?.respawn();
            setPlayerPos(worldSpawn);
            setSaveState((prev) => ({
              ...prev,
              playerPositionsByWorld: {
                ...prev.playerPositionsByWorld,
                [prev.currentWorldId]: worldSpawn,
              },
            }));
            setActiveModal(null);
            showToast('Posición de inicio restaurada');
          }}
          onReturnTitle={() => {
            setActiveModal(null);
            setBuildMode(false);
            setGameState('title');
          }}
          onResume={() => setActiveModal(null)}
        />
      )}
    </main>
  );
}

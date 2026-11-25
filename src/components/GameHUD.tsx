import { useState } from 'react';
import {
  Award,
  Backpack,
  ChevronDown,
  ChevronUp,
  Compass,
  Hammer,
  ListChecks,
  Map as MapIcon,
  Pause,
  UserCog,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BLOCK_MATERIALS } from '../data/catalog';
import { MISSIONS } from '../data/missions';
import { WORLD_MAP } from '../data/worlds';
import { getLevelProgress } from '../game/rules';
import type {
  ActiveModal,
  BlockMaterialId,
  NearbyInteractable,
  SaveGameState,
  Vec3,
} from '../types/game';
import type { TouchInputState } from './GameCanvas';

interface GameHUDProps {
  saveState: SaveGameState;
  playerPos: Vec3;
  nearby: NearbyInteractable | null;
  buildMode: boolean;
  selectedMaterial: BlockMaterialId;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  onSelectMaterial: (mat: BlockMaterialId) => void;
  onToggleBuildMode: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  onToggleSound: () => void;
  onInteractClick: () => void;
  onQuickPlaceBlock: () => void;
}

export default function GameHUD({
  saveState,
  playerPos,
  nearby,
  buildMode,
  selectedMaterial,
  touchInputRef,
  onSelectMaterial,
  onToggleBuildMode,
  onOpenModal,
  onToggleSound,
  onInteractClick,
  onQuickPlaceBlock,
}: GameHUDProps) {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const world = WORLD_MAP[saveState.currentWorldId];
  const levelInfo = getLevelProgress(saveState.xp);
  const trackedMission = saveState.trackedMissionId
    ? MISSIONS.find((m) => m.id === saveState.trackedMissionId) || null
    : null;
  const worldMissions = MISSIONS.filter((m) => m.worldId === saveState.currentWorldId);
  const worldCompletedCount = worldMissions.filter((m) =>
    saveState.completedMissionIds.includes(m.id)
  ).length;

  let trackedDist: number | null = null;
  let trackedDir = '';
  if (trackedMission) {
    const dx = trackedMission.location.x - playerPos.x;
    const dz = trackedMission.location.z - playerPos.z;
    trackedDist = Math.round(Math.hypot(dx, dz));
    const ns = dz < -3 ? 'N' : dz > 3 ? 'S' : '';
    const ew = dx > 3 ? 'E' : dx < -3 ? 'O' : '';
    trackedDir = `${ns}${ew}` || 'Aquí';
  }

  const showTouchControls =
    saveState.settings.touchControlsMode === 'always' ||
    (saveState.settings.touchControlsMode === 'auto' &&
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || window.innerWidth < 860));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left: Hero Level / XP / World / Tracked Objective */}
        <div className="pointer-events-auto flex flex-col gap-2 max-w-[56vw] sm:max-w-sm">
          <div className="rounded-xl bg-[#0b131e]/88 border border-slate-700/80 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-lg">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                  {world.name}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 mt-0.5 tabular-nums">
                  <span className="font-display text-base sm:text-xl font-bold text-white">
                    Nivel {levelInfo.level}
                  </span>
                  <span className="text-[11px] sm:text-xs text-amber-300 font-semibold">
                    {saveState.coins} monedas
                  </span>
                  <span className="text-[11px] sm:text-xs text-emerald-300">
                    {worldCompletedCount}/{worldMissions.length} misiones
                  </span>
                </div>
              </div>
            </div>
            {/* XP Bar */}
            <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-200"
                  style={{ width: `${levelInfo.percent}%` }}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono-tabular text-slate-300 whitespace-nowrap">
                {levelInfo.currentLevelXp}/{levelInfo.nextLevelXp} XP
              </span>
            </div>
          </div>

          {trackedMission && (
            <button
              type="button"
              onClick={() => onOpenModal('missions')}
              className="text-left rounded-xl bg-[#0b131e]/85 hover:bg-[#111c2d] border border-slate-700/80 px-3.5 py-2 shadow-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Objetivo Activo</span>
                </span>
                {trackedDist !== null && (
                  <span className="text-[11px] font-mono-tabular text-slate-300">
                    {trackedDist} m · {trackedDir}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white truncate mt-0.5">
                {trackedMission.title}
              </div>
            </button>
          )}
        </div>

        {/* Top-Right: Compact Interactive Menu Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenModal('map')}
            aria-label="Abrir mapa de mundos"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            <MapIcon className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">Mapa [M]</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('missions')}
            aria-label="Abrir lista de misiones"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            <ListChecks className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Misiones</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('inventory')}
            aria-label="Abrir inventario y tienda"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            <Backpack className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Inventario [I]</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('character')}
            aria-label="Personalizar personaje"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserCog className="w-4 h-4 text-purple-400" />
            <span className="hidden lg:inline">Personaje</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('achievements')}
            aria-label="Ver logros y progreso"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="hidden lg:inline">Logros</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={saveState.settings.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
            className="p-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 cursor-pointer shrink-0"
          >
            {saveState.settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-slate-200" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenModal('pause');
            }}
            aria-label="Pausar juego"
            className="p-2 rounded-lg bg-[#0b131e]/88 hover:bg-slate-800 border border-slate-700/80 text-slate-100 cursor-pointer shrink-0"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* Bottom Area: Nearby Interactable Prompt + Touch Controls + Collapsible Build Dock */}
      <div className="flex flex-col items-center gap-2.5">
        {nearby && (
          <button
            type="button"
            onClick={onInteractClick}
            className="pointer-events-auto inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0b131e]/92 hover:bg-slate-800 border border-sky-400/70 text-white shadow-xl transition-colors cursor-pointer"
          >
            <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-mono-tabular text-xs font-bold">
              E
            </span>
            <span className="text-sm font-semibold">{nearby.label}</span>
            <span className="text-xs text-slate-300 hidden sm:inline">· {nearby.sublabel}</span>
          </button>
        )}

        {/* Mobile / Touch Virtual Controls */}
        {showTouchControls && (
          <div className="w-full flex items-end justify-between px-1 pb-1">
            <div className="pointer-events-auto grid grid-cols-3 gap-1 w-32 h-32">
              <div />
              <button
                type="button"
                aria-label="Mover adelante"
                onPointerDown={() => { touchInputRef.current.moveY = -1; }}
                onPointerUp={() => { touchInputRef.current.moveY = 0; }}
                onPointerLeave={() => { touchInputRef.current.moveY = 0; }}
                className="rounded-lg bg-[#0b131e]/85 border border-slate-600 text-white text-xs font-bold active:bg-sky-600"
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                aria-label="Mover izquierda"
                onPointerDown={() => { touchInputRef.current.moveX = -1; }}
                onPointerUp={() => { touchInputRef.current.moveX = 0; }}
                onPointerLeave={() => { touchInputRef.current.moveX = 0; }}
                className="rounded-lg bg-[#0b131e]/85 border border-slate-600 text-white text-xs font-bold active:bg-sky-600"
              >
                ◀
              </button>
              <button
                type="button"
                aria-label="Agacharse"
                onPointerDown={() => { touchInputRef.current.crouch = !touchInputRef.current.crouch; }}
                className="rounded-lg bg-[#0b131e]/85 border border-slate-600 text-slate-200 text-[11px] font-semibold"
              >
                Ag
              </button>
              <button
                type="button"
                aria-label="Mover derecha"
                onPointerDown={() => { touchInputRef.current.moveX = 1; }}
                onPointerUp={() => { touchInputRef.current.moveX = 0; }}
                onPointerLeave={() => { touchInputRef.current.moveX = 0; }}
                className="rounded-lg bg-[#0b131e]/85 border border-slate-600 text-white text-xs font-bold active:bg-sky-600"
              >
                ▶
              </button>
              <div />
              <button
                type="button"
                aria-label="Mover atrás"
                onPointerDown={() => { touchInputRef.current.moveY = 1; }}
                onPointerUp={() => { touchInputRef.current.moveY = 0; }}
                onPointerLeave={() => { touchInputRef.current.moveY = 0; }}
                className="rounded-lg bg-[#0b131e]/85 border border-slate-600 text-white text-xs font-bold active:bg-sky-600"
              >
                ▼
              </button>
              <div />
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              {buildMode && (
                <button
                  type="button"
                  onClick={onQuickPlaceBlock}
                  className="px-4 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg"
                >
                  Colocar
                </button>
              )}
              <button
                type="button"
                onPointerDown={() => { touchInputRef.current.jumpQueued = true; }}
                className="px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg"
              >
                Saltar
              </button>
            </div>
          </div>
        )}

        {/* Unified Collapsible Bottom Dock */}
        <div className="pointer-events-auto flex flex-col items-center max-w-[95vw]">
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            aria-label={dockCollapsed ? 'Mostrar barra de construcción' : 'Ocultar barra de construcción'}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#0b131e]/90 border border-b-0 border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Mostrar herramientas' : 'Ocultar barra'}</span>
          </button>

          {!dockCollapsed && (
            <div className="rounded-2xl bg-[#0b131e]/90 border border-slate-700/80 px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onToggleBuildMode}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  buildMode
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/70'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>{buildMode ? 'Construyendo [B]' : 'Modo Construir [B]'}</span>
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[70vw] py-0.5">
                {BLOCK_MATERIALS.map((mat, idx) => {
                  const count = saveState.inventory[mat.id] || 0;
                  const active = selectedMaterial === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => onSelectMaterial(mat.id)}
                      title={`${mat.name} — ${mat.role}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-slate-700 text-white ring-2 ring-sky-400'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/70'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-white/25"
                        style={{ backgroundColor: mat.color }}
                      />
                      <span className="hidden sm:inline font-medium">{mat.name.split(' ')[0]}</span>
                      <span className="font-mono-tabular text-[11px] text-slate-400">
                        [{idx + 1}] {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {buildMode && (
                <button
                  type="button"
                  onClick={onQuickPlaceBlock}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Colocar Frente</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

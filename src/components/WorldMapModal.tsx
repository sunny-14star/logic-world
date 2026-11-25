import { Compass, Globe, Lock, Navigation, X } from 'lucide-react';
import { MISSIONS } from '../data/missions';
import { WORLD_MAP, WORLDS } from '../data/worlds';
import { calculateLevelFromXp } from '../game/rules';
import type { SaveGameState, Vec3, WorldId } from '../types/game';

interface WorldMapModalProps {
  saveState: SaveGameState;
  playerPos: Vec3;
  onSelectWorld: (worldId: WorldId) => void;
  onTrackMission: (missionId: string) => void;
  onClose: () => void;
}

export default function WorldMapModal({
  saveState,
  playerPos,
  onSelectWorld,
  onTrackMission,
  onClose,
}: WorldMapModalProps) {
  const playerLevel = calculateLevelFromXp(saveState.xp);
  const currentWorld = WORLD_MAP[saveState.currentWorldId];
  const worldMissions = MISSIONS.filter((m) => m.worldId === currentWorld.id);
  const worldBlocks = saveState.placedBlocks.filter((b) => b.worldId === currentWorld.id);

  // Map [-56..56] world coordinates into [0..100]% SVG space
  const toPercent = (v: number) => Math.max(4, Math.min(96, ((v + 56) / 112) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-map-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-sky-400" />
            <h2 id="world-map-title" className="font-display text-xl font-bold text-white">
              Mapa de Navegación y Selección de Mundos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar mapa"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto logic-scroll grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Interactive 2D Radar Map of Current World */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Radar de {currentWorld.name}
              </h3>
              <span className="text-xs font-mono-tabular text-slate-400">
                Pos: ({Math.round(playerPos.x)}, {Math.round(playerPos.z)})
              </span>
            </div>

            <div className="relative w-full aspect-square rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden">
              {/* Grid lines */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(148,163,184,0.16)" strokeWidth="0.4" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(148,163,184,0.16)" strokeWidth="0.4" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.4" strokeDasharray="2 2" />

                {/* Placed blocks */}
                {worldBlocks.map((b) => (
                  <rect
                    key={b.id}
                    x={toPercent(b.x) - 0.8}
                    y={toPercent(b.z) - 0.8}
                    width="1.6"
                    height="1.6"
                    fill="#f59e0b"
                    opacity="0.7"
                  />
                ))}

                {/* Uncollected Crystals */}
                {currentWorld.collectibles
                  .filter((c) => !saveState.collectedIds.includes(c.id))
                  .map((c) => (
                    <polygon
                      key={c.id}
                      points={`${toPercent(c.position.x)},${toPercent(c.position.z) - 1.8} ${toPercent(c.position.x) + 1.5},${toPercent(c.position.z)} ${toPercent(c.position.x)},${toPercent(c.position.z) + 1.8} ${toPercent(c.position.x) - 1.5},${toPercent(c.position.z)}`}
                      fill="#22d3ee"
                    />
                  ))}

                {/* NPCs */}
                {currentWorld.npcs.map((npc) => (
                  <circle
                    key={npc.id}
                    cx={toPercent(npc.position.x)}
                    cy={toPercent(npc.position.z)}
                    r="2"
                    fill="#a855f7"
                    stroke="#ffffff"
                    strokeWidth="0.5"
                  />
                ))}

                {/* Mission nodes */}
                {worldMissions.map((m) => {
                  const done = saveState.completedMissionIds.includes(m.id);
                  const tracked = saveState.trackedMissionId === m.id;
                  return (
                    <g
                      key={m.id}
                      onClick={() => onTrackMission(m.id)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={toPercent(m.location.x)}
                        cy={toPercent(m.location.z)}
                        r={tracked ? '2.6' : '1.7'}
                        fill={done ? '#10b981' : tracked ? '#facc15' : '#38bdf8'}
                        stroke="#0f172a"
                        strokeWidth="0.5"
                      />
                    </g>
                  );
                })}

                {/* Player marker */}
                <circle
                  cx={toPercent(playerPos.x)}
                  cy={toPercent(playerPos.z)}
                  r="2.8"
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth="1.2"
                />
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-emerald-400" /> Tú
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Misión pendiente
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completada
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> NPC
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-cyan-400" /> Cristal
              </span>
            </div>
          </div>

          {/* Right: 5 Worlds Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">5 Mundos Explorables</h3>
              <span className="text-xs text-slate-400 tabular-nums">Tu Nivel: {playerLevel}</span>
            </div>

            <div className="space-y-2.5">
              {WORLDS.map((w) => {
                const missionsInW = MISSIONS.filter((m) => m.worldId === w.id);
                const doneInW = missionsInW.filter((m) =>
                  saveState.completedMissionIds.includes(m.id)
                ).length;
                const isCurrent = w.id === saveState.currentWorldId;
                const unlocked = playerLevel >= w.unlockLevel || doneInW > 0;

                return (
                  <div
                    key={w.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'bg-slate-800/90 border-sky-400'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: w.accentColor }}
                          />
                          <h4 className="font-display font-bold text-sm text-white">{w.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{w.subtitle}</p>
                        <div className="text-xs font-mono-tabular text-slate-300 mt-2">
                          {doneInW} / {missionsInW.length} misiones
                          {!unlocked && ` · Requiere Nivel ${w.unlockLevel}`}
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-900/60 text-sky-300 text-xs font-semibold shrink-0">
                          <Compass className="w-3.5 h-3.5" />
                          <span>Actual</span>
                        </span>
                      ) : unlocked ? (
                        <button
                          type="button"
                          onClick={() => onSelectWorld(w.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold cursor-pointer shrink-0"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Viajar</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Nivel {w.unlockLevel}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

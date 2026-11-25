import { useState } from 'react';
import { CheckCircle2, Compass, Play, X } from 'lucide-react';
import { getMissionsByWorld } from '../data/missions';
import { WORLD_MAP } from '../data/worlds';
import type { MissionDefinition, SaveGameState } from '../types/game';

interface MissionsLogModalProps {
  saveState: SaveGameState;
  onStartMission: (mission: MissionDefinition) => void;
  onTrackMission: (missionId: string) => void;
  onClose: () => void;
}

export default function MissionsLogModal({
  saveState,
  onStartMission,
  onTrackMission,
  onClose,
}: MissionsLogModalProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const world = WORLD_MAP[saveState.currentWorldId];
  const worldMissions = getMissionsByWorld(saveState.currentWorldId);
  const completedSet = new Set(saveState.completedMissionIds);

  const filtered = worldMissions.filter((m) => {
    const done = completedSet.has(m.id);
    if (statusFilter === 'pending') return !done;
    if (statusFilter === 'completed') return done;
    return true;
  });

  const doneCount = worldMissions.filter((m) => completedSet.has(m.id)).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="missions-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="missions-modal-title" className="font-display text-xl font-bold text-white">
              Misiones de {world.name}
            </h2>
            <p className="text-xs text-slate-400 font-mono-tabular mt-0.5">
              {doneCount} de {worldMissions.length} completadas en este mundo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú de misiones"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todas ({worldMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Pendientes ({worldMissions.length - doneCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Completadas ({doneCount})
          </button>
        </div>

        <div className="p-6 overflow-y-auto logic-scroll space-y-2.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No hay misiones en esta categoría.
            </p>
          ) : (
            filtered.map((m) => {
              const done = completedSet.has(m.id);
              const tracked = saveState.trackedMissionId === m.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
                    done
                      ? 'bg-emerald-950/25 border-emerald-800/50'
                      : tracked
                        ? 'bg-slate-800/80 border-sky-500/60'
                        : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {done && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      <span className="font-display font-bold text-sm text-white truncate">
                        {m.order}. {m.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {m.category} · Dificultad {m.difficulty}/3 · +{m.xpReward} XP · +{m.coinReward} monedas
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!done && (
                      <button
                        type="button"
                        onClick={() => onTrackMission(m.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                          tracked
                            ? 'bg-sky-900/70 border-sky-400 text-sky-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{tracked ? 'Rastreando' : 'Rastrear'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onStartMission(m)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        done
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{done ? 'Repasar' : 'Resolver'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

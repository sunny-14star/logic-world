import { Award, Brain, Medal, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/catalog';
import { MISSIONS } from '../data/missions';
import { computeCognitiveStats, getLevelProgress } from '../game/rules';
import type { SaveGameState } from '../types/game';

interface AchievementsModalProps {
  saveState: SaveGameState;
  onClose: () => void;
}

export default function AchievementsModal({ saveState, onClose }: AchievementsModalProps) {
  const levelInfo = getLevelProgress(saveState.xp);
  const cognitive = computeCognitiveStats(saveState.completedMissionIds);
  const unlockedSet = new Set(saveState.unlockedAchievements);

  const medalStyles: Record<'bronce' | 'plata' | 'oro' | 'platino', string> = {
    bronce: 'text-amber-500',
    plata: 'text-slate-300',
    oro: 'text-yellow-400',
    platino: 'text-cyan-300',
  };

  const skillCards = [
    { key: 'logico' as const, label: 'Pensamiento Lógico', bar: 'bg-sky-400' },
    { key: 'critico' as const, label: 'Pensamiento Crítico', bar: 'bg-purple-400' },
    { key: 'creativo' as const, label: 'Pensamiento Creativo', bar: 'bg-amber-400' },
    { key: 'resolucion' as const, label: 'Resolución de Problemas', bar: 'bg-emerald-400' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ach-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-yellow-400" />
            <h2 id="ach-modal-title" className="font-display text-xl font-bold text-white">
              Progreso, Experiencia y Logros
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar logros"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto logic-scroll space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Nivel</div>
              <div className="font-display text-2xl font-bold text-white tabular-nums mt-0.5">
                {levelInfo.level}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Experiencia Total</div>
              <div className="font-display text-2xl font-bold text-sky-300 tabular-nums mt-0.5">
                {saveState.xp}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Misiones</div>
              <div className="font-display text-2xl font-bold text-emerald-300 tabular-nums mt-0.5">
                {saveState.completedMissionIds.length}/{MISSIONS.length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Bloques Colocados</div>
              <div className="font-display text-2xl font-bold text-amber-300 tabular-nums mt-0.5">
                {saveState.placedBlocks.length}
              </div>
            </div>
          </div>

          {/* Cognitive Skills */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Brain className="w-4 h-4 text-sky-400" />
              <span>Desarrollo Cognitivo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skillCards.map((sc) => {
                const stat = cognitive[sc.key];
                const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                return (
                  <div
                    key={sc.key}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{sc.label}</span>
                      <span className="font-mono-tabular text-slate-300">
                        {stat.completed}/{stat.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${sc.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements & Medals */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Medallas y Logros ({saveState.unlockedAchievements.length}/{ACHIEVEMENTS.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = unlockedSet.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                      unlocked
                        ? 'bg-slate-800/70 border-amber-500/50'
                        : 'bg-slate-900/60 border-slate-800 opacity-65'
                    }`}
                  >
                    <Medal
                      className={`w-6 h-6 shrink-0 mt-0.5 ${
                        unlocked ? medalStyles[ach.medal] : 'text-slate-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">{ach.title}</div>
                      <div className="text-xs text-slate-300 mt-0.5">{ach.description}</div>
                      <div className="text-[11px] font-mono-tabular text-amber-300 mt-1 capitalize">
                        Medalla {ach.medal} · +{ach.xpBonus} XP · {unlocked ? 'Desbloqueado' : 'Pendiente'}
                      </div>
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

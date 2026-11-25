import { useState } from 'react';
import { Compass, MessageSquare, Sparkles, X } from 'lucide-react';
import { MISSIONS } from '../data/missions';
import { WORLD_MAP } from '../data/worlds';
import type { MissionDefinition, NpcDefinition, SaveGameState } from '../types/game';

interface NpcDialogModalProps {
  npc: NpcDefinition;
  saveState: SaveGameState;
  onStartMission: (mission: MissionDefinition) => void;
  onTrackMission: (missionId: string) => void;
  onClose: () => void;
}

export default function NpcDialogModal({
  npc,
  saveState,
  onStartMission,
  onTrackMission,
  onClose,
}: NpcDialogModalProps) {
  const world = WORLD_MAP[npc.worldId];
  const npcMissions = MISSIONS.filter(
    (m) => m.worldId === npc.worldId && m.npcId === npc.id
  );
  const activeMission =
    npcMissions.find((m) => !saveState.completedMissionIds.includes(m.id)) ||
    npcMissions[0] ||
    null;

  const [question, setQuestion] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askNpc = async () => {
    setLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/npc-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: npc.name,
          npcRole: npc.role,
          worldName: world.name,
          missionTitle: activeMission?.title || 'Exploración del mundo',
          missionPrompt: activeMission?.description || world.description,
          playerQuestion:
            question.trim() || '¿Qué consejo me das para aprender y avanzar aquí?',
          hintLevel: 1,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setAiError(data.error || 'El Guía IA no está disponible en este momento.');
      } else {
        setAiReply(data.reply);
      }
    } catch {
      setAiError('No se pudo contactar con el servidor de IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="npc-dialog-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
              style={{ backgroundColor: npc.color }}
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="npc-dialog-title" className="font-display text-xl font-bold text-white">
                {npc.name}
              </h2>
              <p className="text-xs text-slate-400">
                {npc.role} · {world.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto logic-scroll">
          <p className="text-sm sm:text-base text-slate-100 leading-relaxed bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            “{npc.greeting}”
          </p>

          {npcMissions.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Misiones asignadas por {npc.name}
              </div>
              {npcMissions.map((m) => {
                const done = saveState.completedMissionIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {m.title}
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums">
                        {done ? 'Completada' : 'Disponible'} · +{m.xpReward} XP · +{m.coinReward} monedas
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!done && (
                        <button
                          type="button"
                          onClick={() => onTrackMission(m.id)}
                          title="Rastrear en brújula"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer"
                        >
                          <Compass className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onStartMission(m)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                          done
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        {done ? 'Repasar' : 'Aceptar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Conversation */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <label htmlFor="npc-ai-question" className="block text-xs font-semibold text-slate-300">
              Conversa con {npc.name} (Asistente Inteligente):
            </label>
            <div className="flex gap-2">
              <input
                id="npc-ai-question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') askNpc();
                }}
                placeholder="Pide una pista, explicación o consejo..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                disabled={loading}
                onClick={askNpc}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Pensando...' : 'Preguntar'}</span>
              </button>
            </div>
            {aiReply && (
              <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-700/60 text-sm text-sky-100">
                {aiReply}
              </div>
            )}
            {aiError && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
                {aiError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Play, RotateCcw, UserCog } from 'lucide-react';
import type { SaveGameState } from '../types/game';
import { calculateLevelFromXp } from '../game/rules';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedState: SaveGameState | null;
  onNewGame: () => void;
  onContinue: () => void;
  onOpenCustomize: () => void;
}

export default function TitleScreen({
  hasSavedGame,
  savedState,
  onNewGame,
  onContinue,
  onOpenCustomize,
}: TitleScreenProps) {
  const savedLevel = savedState ? calculateLevelFromXp(savedState.xp) : 1;
  const completedCount = savedState ? savedState.completedMissionIds.length : 0;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none p-6 sm:p-10">
      {/* Subtle top-left scrim for high text contrast over live 3D flyover */}
      <div className="max-w-xl pointer-events-auto rounded-2xl p-6 sm:p-8 bg-[#0b131e]/85 border border-slate-700/70 shadow-2xl">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="flex items-center gap-4 mb-4">
          <svg
            viewBox="0 0 64 64"
            className="w-14 h-14 shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="32,4 58,19 58,45 32,60 6,45 6,19"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <polygon
              points="32,12 50,22 32,32 14,22"
              fill="#38bdf8"
              opacity="0.9"
            />
            <polygon
              points="14,24 31,34 31,52 14,42"
              fill="#10b981"
              opacity="0.88"
            />
            <polygon
              points="50,24 33,34 33,52 50,42"
              fill="#f59e0b"
              opacity="0.88"
            />
          </svg>
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
              LOGIC WORLD
            </h1>
            <p className="text-sm text-slate-300 mt-1.5">
              Exploración 3D · Construcción · Acertijos · 5 Mundos
            </p>
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
          Explora cinco mundos abiertos, construye estructuras reales con física 3D, conversa con guías inteligentes y resuelve 120 desafíos de pensamiento lógico, crítico y creativo.
        </p>

        {/* Primary CTA Cluster (<= 3 actions) */}
        <div className="flex flex-wrap items-center gap-3">
          {hasSavedGame && savedState ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onContinue}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Continuar Partida</span>
              </button>
              <button
                type="button"
                onClick={onNewGame}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-600/70 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nueva Partida</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onNewGame}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Nueva Partida</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCustomize}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-600/70 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserCog className="w-4 h-4" />
            <span>Personalizar Personaje</span>
          </button>
        </div>

        {hasSavedGame && savedState && (
          <div className="mt-4 pt-3 border-t border-slate-700/70 flex flex-wrap items-center gap-3 text-xs text-slate-300 tabular-nums">
            <span>Progreso guardado: {savedState.customization.name}</span>
            <span aria-hidden="true">·</span>
            <span>Nivel {savedLevel}</span>
            <span aria-hidden="true">·</span>
            <span>{completedCount} / 120 misiones</span>
          </div>
        )}
      </div>

      {/* Readable control hint bar in bottom safe margin */}
      <div className="pointer-events-auto self-start rounded-xl bg-[#0b131e]/85 border border-slate-700/70 px-4 py-2 text-xs sm:text-sm text-slate-200 shadow-lg">
        WASD Mover · Espacio Saltar · Shift Correr · C Agacharse · E Interactuar · B Construir · Esc Pausa
      </div>
    </div>
  );
}

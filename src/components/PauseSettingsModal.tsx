import { Home, Play, RotateCcw, Save, Volume2, X } from 'lucide-react';
import type { GameSettings } from '../types/game';

interface PauseSettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onSaveNow: () => void;
  onResetPosition: () => void;
  onReturnTitle: () => void;
  onResume: () => void;
}

export default function PauseSettingsModal({
  settings,
  onUpdateSettings,
  onSaveNow,
  onResetPosition,
  onReturnTitle,
  onResume,
}: PauseSettingsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 id="pause-modal-title" className="font-display text-xl font-bold text-white">
            Pausa y Configuración
          </h2>
          <button
            type="button"
            onClick={onResume}
            aria-label="Reanudar partida"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Audio & Controls Config */}
          <div className="space-y-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <Volume2 className="w-4 h-4 text-sky-400" />
                <span>Efectos de Sonido</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {settings.soundEnabled ? 'Activado' : 'Silenciado'}
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <label htmlFor="vol-slider">Volumen</label>
                <span className="font-mono-tabular">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                id="vol-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, volume: Number(e.target.value) / 100 })
                }
                className="w-full accent-sky-400"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="touch-mode-select" className="text-xs font-medium text-slate-300">
                Controles Táctiles
              </label>
              <select
                id="touch-mode-select"
                value={settings.touchControlsMode}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    touchControlsMode: e.target.value as GameSettings['touchControlsMode'],
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="auto">Automático</option>
                <option value="always">Siempre visibles</option>
                <option value="off">Ocultos</option>
              </select>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Continuar Partida</span>
            </button>
            <button
              type="button"
              onClick={onSaveNow}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 cursor-pointer"
            >
              <Save className="w-4 h-4 text-sky-400" />
              <span>Guardar Progreso</span>
            </button>
            <button
              type="button"
              onClick={onResetPosition}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Volver al Punto de Inicio</span>
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Pantalla Principal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

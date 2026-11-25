import { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import { SHOP_ACCESSORIES } from '../data/catalog';
import type { CharacterCustomization, SaveGameState } from '../types/game';

interface CharacterModalProps {
  saveState: SaveGameState;
  onSaveCustomization: (custom: CharacterCustomization) => void;
  onClose: () => void;
}

const COLOR_SWATCHES = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#334155',
  '#f59e0b',
  '#10b981',
  '#f8fafc',
  '#0f172a',
];

const SKIN_SWATCHES = ['#fde2c8', '#f1c29b', '#d99b6c', '#a86b43', '#6b4226', '#94a3b8'];
const HAIR_SWATCHES = ['#1e1b18', '#3b2618', '#92400e', '#eab308', '#dc2626', '#38bdf8', '#a855f7', '#f8fafc'];

const BODY_OPTIONS: { id: CharacterCustomization['bodyStyle']; label: string }[] = [
  { id: 'explorador', label: 'Explorador' },
  { id: 'ingeniera', label: 'Ingeniera' },
  { id: 'arquitecto', label: 'Arquitecto' },
  { id: 'robot', label: 'Robot' },
  { id: 'titan', label: 'Titán' },
];

const FACE_OPTIONS: { id: CharacterCustomization['faceStyle']; label: string }[] = [
  { id: 'sonriente', label: 'Sonriente' },
  { id: 'concentrado', label: 'Concentrado' },
  { id: 'gafas', label: 'Gafas' },
  { id: 'asombrado', label: 'Asombrado' },
  { id: 'cibernetico', label: 'Cibernético' },
  { id: 'guino', label: 'Guiño' },
];

const HAIR_OPTIONS: { id: CharacterCustomization['hairStyle']; label: string }[] = [
  { id: 'corto', label: 'Corto' },
  { id: 'largo', label: 'Largo' },
  { id: 'cresta', label: 'Cresta' },
  { id: 'casco', label: 'Casco' },
  { id: 'coletas', label: 'Coletas' },
  { id: 'rizado', label: 'Rizado' },
  { id: 'capucha', label: 'Capucha' },
  { id: 'antena', label: 'Antena' },
];

const OUTFIT_OPTIONS: { id: CharacterCustomization['outfitStyle']; label: string }[] = [
  { id: 'aventurero', label: 'Aventurero' },
  { id: 'cientifico', label: 'Científico' },
  { id: 'constructor', label: 'Constructor' },
  { id: 'guardian', label: 'Guardián' },
  { id: 'espacial', label: 'Espacial' },
  { id: 'mago', label: 'Mago' },
  { id: 'ciberpunk', label: 'Ciberpunk' },
];

export default function CharacterModal({
  saveState,
  onSaveCustomization,
  onClose,
}: CharacterModalProps) {
  const [draft, setDraft] = useState<CharacterCustomization>({
    ...saveState.customization,
  });

  const handleApply = () => {
    onSaveCustomization({
      ...draft,
      name: draft.name.trim() || 'Alex',
    });
    onClose();
  };

  const headFill = draft.bodyStyle === 'robot' ? '#94a3b8' : draft.skinColor;
  const torsoX = draft.bodyStyle === 'titan' ? 24 : draft.bodyStyle === 'ingeniera' ? 31 : 28;
  const torsoW = draft.bodyStyle === 'titan' ? 52 : draft.bodyStyle === 'ingeniera' ? 38 : 44;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="char-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="char-modal-title" className="font-display text-xl font-bold text-white">
              Personalizar Personaje
            </h2>
            <p className="text-xs text-slate-400">
              Los cambios se reflejan inmediatamente en tu avatar 3D
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar personalización"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto logic-scroll space-y-5">
          {/* Preview Avatar SVG + Name */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <svg viewBox="0 0 100 120" className="w-24 h-28 shrink-0" aria-hidden="true">
              {/* Hair / hood back */}
              {(draft.hairStyle === 'largo' || draft.hairStyle === 'capucha') && (
                <rect
                  x="26"
                  y="16"
                  width="48"
                  height="46"
                  rx="6"
                  fill={draft.hairStyle === 'capucha' ? draft.primaryColor : draft.hairColor}
                />
              )}
              {draft.hairStyle === 'coletas' && (
                <>
                  <rect x="20" y="24" width="10" height="24" rx="4" fill={draft.hairColor} />
                  <rect x="70" y="24" width="10" height="24" rx="4" fill={draft.hairColor} />
                </>
              )}
              {draft.hairStyle === 'rizado' && (
                <rect x="24" y="8" width="52" height="26" rx="10" fill={draft.hairColor} />
              )}
              {/* Legs */}
              <rect x="33" y="84" width="14" height="28" rx="3" fill="#1e293b" />
              <rect x="53" y="84" width="14" height="28" rx="3" fill="#1e293b" />
              {/* Torso & Outfit */}
              <rect
                x={torsoX}
                y="48"
                width={torsoW}
                height="38"
                rx="6"
                fill={draft.outfitStyle === 'cientifico' ? '#f8fafc' : draft.primaryColor}
              />
              <rect x={torsoX - 1} y="74" width={torsoW + 2} height="8" rx="2" fill={draft.secondaryColor} />
              {draft.outfitStyle === 'constructor' && (
                <>
                  <rect x={torsoX + 7} y="48" width="7" height="32" fill={draft.secondaryColor} />
                  <rect x={torsoX + torsoW - 14} y="48" width="7" height="32" fill={draft.secondaryColor} />
                </>
              )}
              {draft.outfitStyle === 'guardian' && (
                <rect x={torsoX + 6} y="52" width={torsoW - 12} height="18" rx="3" fill={draft.secondaryColor} />
              )}
              {draft.outfitStyle === 'espacial' && (
                <rect x="34" y="45" width="32" height="7" rx="3" fill="#e2e8f0" />
              )}
              {draft.outfitStyle === 'mago' && (
                <polygon points="50,55 56,63 50,71 44,63" fill={draft.secondaryColor} />
              )}
              {draft.outfitStyle === 'ciberpunk' && (
                <>
                  <rect x={torsoX + 8} y="52" width="5" height="22" fill={draft.secondaryColor} />
                  <rect x={torsoX + torsoW - 13} y="52" width="5" height="22" fill={draft.secondaryColor} />
                </>
              )}
              {draft.bodyStyle === 'robot' && (
                <circle cx="50" cy="64" r="6" fill="#38bdf8" />
              )}
              {/* Arms */}
              <rect x={torsoX - 14} y="50" width="12" height="30" rx="4" fill={draft.primaryColor} />
              <rect x={torsoX + torsoW + 2} y="50" width="12" height="30" rx="4" fill={draft.primaryColor} />
              {/* Head */}
              <rect x="30" y="14" width="40" height="34" rx="8" fill={headFill} />
              {/* Hair top */}
              {draft.hairStyle === 'casco' ? (
                <path d="M28 24 Q50 2 72 24 Z" fill={draft.secondaryColor} />
              ) : draft.hairStyle === 'cresta' ? (
                <rect x="44" y="4" width="12" height="16" rx="3" fill={draft.hairColor} />
              ) : draft.hairStyle === 'antena' ? (
                <>
                  <rect x="36" y="10" width="28" height="6" rx="3" fill={draft.secondaryColor} />
                  <line x1="50" y1="10" x2="50" y2="2" stroke="#94a3b8" strokeWidth="2.5" />
                  <circle cx="50" cy="2" r="3" fill="#38bdf8" />
                </>
              ) : draft.hairStyle === 'capucha' ? (
                <rect x="27" y="12" width="46" height="9" rx="4" fill={draft.primaryColor} />
              ) : (
                <rect x="29" y="12" width="42" height="11" rx="4" fill={draft.hairColor} />
              )}
              {/* Eyes / Glasses / Expressions */}
              {draft.faceStyle === 'gafas' || draft.accessory === 'visor' ? (
                <rect x="34" y="25" width="32" height="9" rx="3" fill="#38bdf8" />
              ) : draft.faceStyle === 'cibernetico' ? (
                <>
                  <circle cx="42" cy="29" r="3" fill="#0f172a" />
                  <rect x="52" y="25" width="12" height="8" rx="2" fill="#22d3ee" />
                </>
              ) : draft.faceStyle === 'guino' ? (
                <>
                  <circle cx="42" cy="29" r="3" fill="#0f172a" />
                  <line x1="54" y1="29" x2="62" y2="29" stroke="#0f172a" strokeWidth="2.5" />
                </>
              ) : draft.faceStyle === 'asombrado' ? (
                <>
                  <circle cx="42" cy="28" r="4.2" fill="#0f172a" />
                  <circle cx="58" cy="28" r="4.2" fill="#0f172a" />
                  <circle cx="50" cy="40" r="3.5" fill="#0f172a" />
                </>
              ) : (
                <>
                  <circle cx="42" cy="29" r="3" fill="#0f172a" />
                  <circle cx="58" cy="29" r="3" fill="#0f172a" />
                </>
              )}
              {(draft.faceStyle === 'sonriente' || draft.faceStyle === 'guino') && (
                <path d="M42 38 Q50 43 58 38" stroke="#0f172a" strokeWidth="2.2" fill="none" />
              )}
              {draft.accessory === 'corona' && (
                <polygon points="36,13 42,4 50,11 58,4 64,13" fill="#facc15" />
              )}
            </svg>

            <div className="flex-1 w-full space-y-2">
              <label htmlFor="hero-name-input" className="block text-xs font-semibold text-slate-300">
                Nombre del Explorador
              </label>
              <input
                id="hero-name-input"
                type="text"
                maxLength={20}
                value={draft.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, name: val }));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Body & Outfit & Face & Hair */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Apariencia / Complexión</div>
              <div className="flex flex-wrap gap-1.5">
                {BODY_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, bodyStyle: b.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                      draft.bodyStyle === b.id
                        ? 'bg-sky-500 text-slate-950 border-sky-300 font-semibold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Rostro</div>
              <div className="flex flex-wrap gap-1.5">
                {FACE_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, faceStyle: f.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                      draft.faceStyle === f.id
                        ? 'bg-sky-500 text-slate-950 border-sky-300 font-semibold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Peinado</div>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_OPTIONS.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, hairStyle: h.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                      draft.hairStyle === h.id
                        ? 'bg-sky-500 text-slate-950 border-sky-300 font-semibold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Vestimenta</div>
              <div className="flex flex-wrap gap-1.5">
                {OUTFIT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, outfitStyle: o.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                      draft.outfitStyle === o.id
                        ? 'bg-sky-500 text-slate-950 border-sky-300 font-semibold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Color Principal de Traje</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color traje ${c}`}
                    onClick={() => setDraft((prev) => ({ ...prev, primaryColor: c }))}
                    className={`w-7 h-7 rounded-lg cursor-pointer border-2 ${
                      draft.primaryColor === c ? 'border-white scale-110' : 'border-slate-600/80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Color Secundario</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color secundario ${c}`}
                    onClick={() => setDraft((prev) => ({ ...prev, secondaryColor: c }))}
                    className={`w-7 h-7 rounded-lg cursor-pointer border-2 ${
                      draft.secondaryColor === c ? 'border-white scale-110' : 'border-slate-600/80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Tono de Piel</div>
              <div className="flex flex-wrap gap-2">
                {SKIN_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Piel ${c}`}
                    onClick={() => setDraft((prev) => ({ ...prev, skinColor: c }))}
                    className={`w-7 h-7 rounded-lg cursor-pointer border-2 ${
                      draft.skinColor === c ? 'border-white scale-110' : 'border-slate-600/80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Color de Cabello</div>
              <div className="flex flex-wrap gap-2">
                {HAIR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cabello ${c}`}
                    onClick={() => setDraft((prev) => ({ ...prev, hairColor: c }))}
                    className={`w-7 h-7 rounded-lg cursor-pointer border-2 ${
                      draft.hairColor === c ? 'border-white scale-110' : 'border-slate-600/80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Unlockable Accessories */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              Accesorios (Desbloquea más en la Tienda dentro de Inventario)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, accessory: 'ninguno' }))}
                className={`px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                  draft.accessory === 'ninguno'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-semibold'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Sin accesorio
              </button>
              {SHOP_ACCESSORIES.map((acc) => {
                const unlocked = saveState.unlockedAccessories.includes(acc.id);
                const selected = draft.accessory === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setDraft((prev) => ({ ...prev, accessory: acc.id }))}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      selected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-semibold'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {!unlocked && <Lock className="w-3.5 h-3.5" />}
                    <span>{acc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Aspecto</span>
          </button>
        </div>
      </div>
    </div>
  );
}

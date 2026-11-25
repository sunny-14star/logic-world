import { useState } from 'react';
import { Backpack, Check, Lock, ShoppingBag, Sparkles, X } from 'lucide-react';
import { ABILITIES, BLOCK_MATERIALS, SHOP_ACCESSORIES } from '../data/catalog';
import { calculateLevelFromXp, getEffectiveBlockCost } from '../game/rules';
import type { AbilityId, BlockMaterialId, CharacterCustomization, SaveGameState } from '../types/game';

interface InventoryShopModalProps {
  saveState: SaveGameState;
  onBuyBlock: (matId: BlockMaterialId, qty: number) => void;
  onBuyAccessory: (acc: CharacterCustomization['accessory'], cost: number) => void;
  onUnlockAbility: (abilityId: AbilityId, cost: number) => void;
  onSelectMaterial: (matId: BlockMaterialId) => void;
  onClose: () => void;
}

export default function InventoryShopModal({
  saveState,
  onBuyBlock,
  onBuyAccessory,
  onUnlockAbility,
  onSelectMaterial,
  onClose,
}: InventoryShopModalProps) {
  const [tab, setTab] = useState<'inventario' | 'tienda' | 'habilidades'>('inventario');
  const level = calculateLevelFromXp(saveState.xp);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inv-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="inv-modal-title" className="font-display text-xl font-bold text-white">
              Inventario, Tienda y Habilidades
            </h2>
            <p className="text-xs text-amber-300 font-mono-tabular mt-0.5">
              Monedas disponibles: {saveState.coins} · Nivel {level}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar inventario"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setTab('inventario')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'inventario'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Backpack className="w-4 h-4" />
            <span>Materiales</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('tienda')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'tienda'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Tienda</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('habilidades')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === 'habilidades'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Habilidades</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto logic-scroll space-y-4">
          {tab === 'inventario' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BLOCK_MATERIALS.map((mat) => {
                const count = saveState.inventory[mat.id] || 0;
                return (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-lg border border-white/20 shrink-0"
                        style={{ backgroundColor: mat.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{mat.name}</div>
                        <div className="text-xs text-slate-400 truncate">{mat.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-tabular text-sm font-bold text-sky-300">
                        ×{count}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMaterial(mat.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer"
                      >
                        Equipar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'tienda' && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Paquetes de Materiales (x5 unidades)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BLOCK_MATERIALS.map((mat) => {
                    const unitCost = getEffectiveBlockCost(mat.id, saveState.unlockedAbilities);
                    const packCost = unitCost * 4; // 20% bundle discount
                    const canAfford = saveState.coins >= packCost;
                    return (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-lg border border-white/20 shrink-0"
                            style={{ backgroundColor: mat.color }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-white">{mat.name} ×5</div>
                            <div className="text-xs text-slate-400 font-mono-tabular">
                              En inventario: {saveState.inventory[mat.id] || 0}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onBuyBlock(mat.id, 5)}
                          className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold font-mono-tabular cursor-pointer shrink-0"
                        >
                          {packCost} monedas
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Accesorios de Personaje
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SHOP_ACCESSORIES.map((acc) => {
                    const owned = saveState.unlockedAccessories.includes(acc.id);
                    const canAfford = saveState.coins >= acc.costCoins;
                    return (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">{acc.name}</div>
                          <div className="text-xs text-slate-400">{acc.description}</div>
                        </div>
                        {owned ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-semibold shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            <span>Adquirido</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onBuyAccessory(acc.id, acc.costCoins)}
                            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold font-mono-tabular cursor-pointer shrink-0"
                          >
                            {acc.costCoins} monedas
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'habilidades' && (
            <div className="space-y-3">
              {ABILITIES.map((ab) => {
                const owned = saveState.unlockedAbilities.includes(ab.id);
                const levelOk = level >= ab.unlockLevel;
                const coinsOk = saveState.coins >= ab.costCoins;
                return (
                  <div
                    key={ab.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{ab.name}</div>
                      <div className="text-xs text-slate-300 mt-0.5">{ab.description}</div>
                      <div className="text-[11px] font-mono-tabular text-slate-400 mt-1">
                        Requiere Nivel {ab.unlockLevel} · Costo: {ab.costCoins} monedas
                      </div>
                    </div>
                    {owned ? (
                      <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-semibold shrink-0">
                        <Check className="w-4 h-4" />
                        <span>Activa</span>
                      </span>
                    ) : !levelOk ? (
                      <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Nivel {ab.unlockLevel}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!coinsOk}
                        onClick={() => onUnlockAbility(ab.id, ab.costCoins)}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
                      >
                        Desbloquear ({ab.costCoins})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

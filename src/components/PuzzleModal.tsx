import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { WORLD_MAP } from '../data/worlds';
import { soundEngine } from '../game/audio';
import {
  evaluateBuildMission,
  evaluateCollectMission,
  evaluateLogicCircuit,
  evaluatePhysicsLever,
  simulateAlgorithmSteps,
  validateMathOrTextAnswer,
} from '../game/rules';
import type { MissionDefinition, SaveGameState } from '../types/game';

interface PuzzleModalProps {
  mission: MissionDefinition;
  saveState: SaveGameState;
  onComplete: (mission: MissionDefinition) => void;
  onClose: () => void;
  onSwitchToBuildHere: () => void;
}

export default function PuzzleModal({
  mission,
  saveState,
  onComplete,
  onClose,
  onSwitchToBuildHere,
}: PuzzleModalProps) {
  const alreadyCompleted = saveState.completedMissionIds.includes(mission.id);
  const hasAnalyticalVision = saveState.unlockedAbilities.includes('vision_logica');

  const [revealedHints, setRevealedHints] = useState(hasAnalyticalVision ? 1 : 0);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    alreadyCompleted
      ? { type: 'success', text: 'Desafío ya completado. Puedes repasar la lógica utilizada.' }
      : null
  );
  const [justSolved, setJustSolved] = useState(alreadyCompleted);

  // Mechanic states
  const [mathInput, setMathInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [circuitInputs, setCircuitInputs] = useState<Record<string, boolean>>(
    mission.circuit?.initialInputs || {}
  );
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [sortAssignments, setSortAssignments] = useState<Record<string, string>>({});
  const [algoCommands, setAlgoCommands] = useState<('AVANZAR' | 'GIRAR_IZQ' | 'GIRAR_DER')[]>([]);
  const [algoResult, setAlgoResult] = useState<ReturnType<typeof simulateAlgorithmSteps> | null>(null);

  // Optional live AI Mentor state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setRevealedHints(hasAnalyticalVision ? 1 : 0);
    setFeedback(
      alreadyCompleted
        ? { type: 'success', text: 'Desafío ya completado. Puedes repasar la lógica utilizada.' }
        : null
    );
    setJustSolved(alreadyCompleted);
    setMathInput('');
    setSelectedChoice(null);
    setCircuitInputs(mission.circuit?.initialInputs || {});
    setSelectedDistance(null);
    setSelectedPattern(null);
    setSortAssignments({});
    setAlgoCommands([]);
    setAlgoResult(null);
    setAiReply(null);
    setAiError(null);
  }, [mission.id, alreadyCompleted, hasAnalyticalVision, mission.circuit]);

  const handleSuccess = (msg = '¡Excelente razonamiento! Misión completada.') => {
    soundEngine.success();
    setJustSolved(true);
    setFeedback({ type: 'success', text: msg });
    if (!alreadyCompleted) {
      onComplete(mission);
    }
  };

  const handleFail = (msg: string) => {
    soundEngine.error();
    setFeedback({ type: 'error', text: msg });
  };

  const circuitEval = mission.circuit
    ? evaluateLogicCircuit(mission.circuit, circuitInputs)
    : null;

  const buildEval =
    mission.mechanic === 'world-build'
      ? evaluateBuildMission(mission, saveState.placedBlocks)
      : null;

  const collectEval =
    mission.mechanic === 'world-collect'
      ? evaluateCollectMission(mission, saveState.collectedIds)
      : null;

  const verifyAnswer = () => {
    if (mission.mechanic === 'math-input') {
      if (validateMathOrTextAnswer(mission, mathInput)) {
        handleSuccess();
      } else {
        handleFail('Ese resultado aún no coincide. Revisa las relaciones numéricas o pide una pista.');
      }
    } else if (mission.mechanic === 'multiple-choice') {
      if (!selectedChoice) {
        handleFail('Selecciona una opción antes de comprobar.');
        return;
      }
      if (mission.correctChoiceIds?.includes(selectedChoice)) {
        handleSuccess();
      } else {
        handleFail('Esa opción presenta una inconsistencia lógica. Analiza las otras alternativas.');
      }
    } else if (mission.mechanic === 'logic-circuit' && circuitEval) {
      if (circuitEval.solved) {
        handleSuccess('¡Circuito lógico estabilizado con éxito!');
      } else {
        handleFail('La salida del circuito aún no alcanza el estado requerido.');
      }
    } else if (mission.mechanic === 'physics-balance' && mission.physics) {
      if (selectedDistance === null) {
        handleFail('Selecciona una distancia en metros para colocar el contrapeso.');
        return;
      }
      const res = evaluatePhysicsLever(mission.physics, selectedDistance);
      if (res.solved) {
        handleSuccess(`¡Equilibrio perfecto! Torque izquierdo (${res.leftTorque}) = Torque derecho (${res.rightTorque}).`);
      } else {
        handleFail(
          `Desbalanceado: izquierda = ${res.leftTorque}, derecha = ${res.rightTorque}. Ajusta la distancia.`
        );
      }
    } else if (mission.mechanic === 'pattern-matrix' && mission.pattern) {
      if (!selectedPattern) {
        handleFail('Elige un símbolo para completar la matriz.');
        return;
      }
      if (selectedPattern === mission.pattern.correctOption) {
        handleSuccess('¡Patrón completado con precisión!');
      } else {
        handleFail('Ese símbolo rompe la regla de fila o columna.');
      }
    } else if (mission.mechanic === 'sort-buckets' && mission.sort) {
      const allAssigned = mission.sort.items.every((it) => Boolean(sortAssignments[it.id]));
      if (!allAssigned) {
        handleFail('Clasifica todos los elementos antes de comprobar.');
        return;
      }
      const allCorrect = mission.sort.items.every(
        (it) => sortAssignments[it.id] === it.correctBucket
      );
      if (allCorrect) {
        handleSuccess('¡Clasificación impecable!');
      } else {
        handleFail('Al menos un elemento está en la categoría equivocada. Revisa sus propiedades.');
      }
    } else if (mission.mechanic === 'algorithm-steps' && mission.algorithm) {
      const sim = simulateAlgorithmSteps(mission.algorithm, algoCommands);
      setAlgoResult(sim);
      if (sim.reachedGoal) {
        handleSuccess('¡El robot alcanzó la meta sin colisiones!');
      } else if (sim.hitObstacle) {
        handleFail('El robot chocó contra un obstáculo o salió del tablero. Ajusta la secuencia.');
      } else {
        handleFail('La secuencia terminó antes de llegar a la casilla objetivo.');
      }
    } else if (mission.mechanic === 'world-build' && buildEval) {
      if (buildEval.solved) {
        handleSuccess('¡Estructura validada en el mundo 3D!');
      } else {
        handleFail(
          `Llevas ${buildEval.count} de ${buildEval.required} bloques requeridos en la zona.`
        );
      }
    } else if (mission.mechanic === 'world-collect' && collectEval) {
      if (collectEval.solved) {
        handleSuccess('¡Todos los cristales de la misión han sido recolectados!');
      } else {
        handleFail(
          `Llevas ${collectEval.found} de ${collectEval.total} cristales. Explora el mundo 3D para recogerlos.`
        );
      }
    }
  };

  const askAiMentor = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const world = WORLD_MAP[mission.worldId];
      const res = await fetch('/api/npc-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: 'Mentor Lógico',
          npcRole: 'Guía educativo de Logic World',
          worldName: world.name,
          missionTitle: mission.title,
          missionPrompt: mission.description,
          playerQuestion: aiQuestion.trim() || '¿Cómo puedo abordar este problema paso a paso?',
          hintLevel: Math.max(1, revealedHints),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setAiError(data.error || 'No se pudo obtener respuesta del Guía IA.');
      } else {
        setAiReply(data.reply);
      }
    } catch {
      setAiError('Error de red al consultar al Guía IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const skillLabels: Record<MissionDefinition['skill'], string> = {
    logico: 'Pensamiento Lógico',
    critico: 'Pensamiento Crítico',
    creativo: 'Pensamiento Creativo',
    resolucion: 'Resolución de Problemas',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="puzzle-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-sky-300 font-medium">
              Misión #{mission.order} · {skillLabels[mission.skill]} · +{mission.xpReward} XP · +{mission.coinReward} monedas
            </div>
            <h2 id="puzzle-modal-title" className="font-display text-xl sm:text-2xl font-bold text-white mt-1">
              {mission.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar desafío"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto logic-scroll space-y-5">
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {mission.description}
          </p>

          {mission.multiSolutionNote && (
            <div className="text-xs text-amber-200 bg-amber-950/50 border border-amber-700/50 rounded-lg px-3.5 py-2">
              Enfoque abierto: {mission.multiSolutionNote}
            </div>
          )}

          {/* Mechanic-specific Interactive Area */}
          {mission.mechanic === 'math-input' && (
            <div className="space-y-2">
              <label htmlFor="puzzle-math-input" className="block text-xs font-semibold text-slate-300">
                Tu respuesta (acepta número o expresión matemática):
              </label>
              <input
                id="puzzle-math-input"
                type="text"
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifyAnswer();
                }}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono-tabular focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          {mission.mechanic === 'multiple-choice' && mission.choices && (
            <div className="space-y-2.5">
              {mission.choices.map((ch) => {
                const active = selectedChoice === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChoice(ch.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-900/60 border-sky-400 text-white font-semibold'
                        : 'bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {ch.label}
                  </button>
                );
              })}
            </div>
          )}

          {mission.mechanic === 'logic-circuit' && mission.circuit && circuitEval && (
            <div className="space-y-4 rounded-xl bg-slate-900/90 border border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Interruptores de Entrada (Objetivo: Salida = {mission.circuit.targetOutput ? '1 (ON)' : '0 (OFF)'})
                </span>
                <span
                  className={`text-xs font-mono-tabular font-bold px-2.5 py-1 rounded ${
                    circuitEval.solved
                      ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-600'
                  }`}
                >
                  Salida Actual: {circuitEval.finalOutput ? '1 (ON)' : '0 (OFF)'}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {mission.circuit.inputNames.map((name) => {
                  const val = Boolean(circuitInputs[name]);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        setCircuitInputs((prev) => ({ ...prev, [name]: !prev[name] }))
                      }
                      className={`px-4 py-2.5 rounded-xl font-mono-tabular text-sm font-bold border transition-colors cursor-pointer ${
                        val
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-800 border-slate-600 text-slate-300'
                      }`}
                    >
                      {name}: {val ? '1 (ON)' : '0 (OFF)'}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                {mission.circuit.gates.map((gate) => {
                  const outVal = Boolean(circuitEval.values[gate.id]);
                  return (
                    <div
                      key={gate.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{gate.label}</div>
                        <div className="text-slate-400 font-mono-tabular">
                          {gate.type}({gate.inputs.join(', ')})
                        </div>
                      </div>
                      <span
                        className={`font-mono-tabular font-bold ${
                          outVal ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {outVal ? '1' : '0'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mission.mechanic === 'physics-balance' && mission.physics && (
            <div className="space-y-4 rounded-xl bg-slate-900/90 border border-slate-700 p-4">
              <p className="text-xs text-slate-300">{mission.physics.promptDetail}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 font-semibold mb-1">Brazo Izquierdo</div>
                  {mission.physics.leftWeights.map((lw, i) => (
                    <div key={i} className="font-mono-tabular text-slate-200">
                      {lw.weight} kg × {lw.distance} m = {lw.weight * lw.distance}
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 font-semibold mb-1">Brazo Derecho</div>
                  <div className="font-mono-tabular text-amber-300">
                    Peso fijo: {mission.physics.targetWeight} kg
                  </div>
                  <div className="font-mono-tabular text-slate-300 mt-1">
                    Distancia elegida: {selectedDistance !== null ? `${selectedDistance} m` : 'Sin elegir'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {mission.physics.rightDistanceOptions.map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => setSelectedDistance(dist)}
                    className={`px-4 py-2 rounded-lg font-mono-tabular text-sm font-semibold border cursor-pointer ${
                      selectedDistance === dist
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {dist} metros
                  </button>
                ))}
              </div>
            </div>
          )}

          {mission.mechanic === 'pattern-matrix' && mission.pattern && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {mission.pattern.grid.map((cell, idx) => (
                  <div
                    key={idx}
                    className={`h-16 flex items-center justify-center rounded-xl border text-2xl font-bold ${
                      cell === null
                        ? 'bg-sky-950/60 border-sky-400 text-sky-300'
                        : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    {cell === null ? selectedPattern || '?' : cell}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-2.5">
                {mission.pattern.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedPattern(opt)}
                    className={`w-14 h-12 rounded-xl border text-xl font-bold cursor-pointer ${
                      selectedPattern === opt
                        ? 'bg-sky-500 text-slate-950 border-sky-300'
                        : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mission.mechanic === 'sort-buckets' && mission.sort && (
            <div className="space-y-3">
              {mission.sort.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-700"
                >
                  <span className="text-sm font-medium text-white">{item.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mission.sort!.buckets.map((b) => {
                      const active = sortAssignments[item.id] === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setSortAssignments((prev) => ({ ...prev, [item.id]: b.id }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                            active
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                              : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mission.mechanic === 'algorithm-steps' && mission.algorithm && (
            <div className="space-y-4 rounded-xl bg-slate-900/90 border border-slate-700 p-4">
              {/* Grid preview */}
              <div
                className="grid gap-1.5 max-w-[260px] mx-auto"
                style={{ gridTemplateColumns: `repeat(${mission.algorithm.gridSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: mission.algorithm.gridSize * mission.algorithm.gridSize }).map(
                  (_, i) => {
                    const x = i % mission.algorithm!.gridSize;
                    const z = Math.floor(i / mission.algorithm!.gridSize);
                    const isStart = x === mission.algorithm!.start.x && z === mission.algorithm!.start.z;
                    const isGoal = x === mission.algorithm!.goal.x && z === mission.algorithm!.goal.z;
                    const isObs = mission.algorithm!.obstacles.some((o) => o.x === x && o.z === z);
                    const onPath = algoResult?.path.some((p) => p.x === x && p.z === z);
                    const isRobotEnd =
                      algoResult && algoResult.finalPos.x === x && algoResult.finalPos.z === z;

                    return (
                      <div
                        key={i}
                        className={`h-12 rounded-lg border flex items-center justify-center text-xs font-bold ${
                          isObs
                            ? 'bg-rose-950 border-rose-700 text-rose-300'
                            : isGoal
                              ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                              : isRobotEnd
                                ? 'bg-sky-500 border-sky-300 text-slate-950'
                                : onPath
                                  ? 'bg-sky-900/60 border-sky-500/60 text-sky-200'
                                  : isStart
                                    ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {isObs ? '✖' : isGoal ? '★' : isRobotEnd ? 'R' : isStart ? 'S' : ''}
                      </div>
                    );
                  }
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {mission.algorithm.availableCommands.map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    disabled={algoCommands.length >= mission.algorithm!.maxSteps}
                    onClick={() => setAlgoCommands((prev) => [...prev, cmd])}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600 text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                  >
                    + {cmd}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setAlgoCommands([]);
                    setAlgoResult(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-300 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 min-h-[44px] flex flex-wrap gap-1.5 items-center text-xs font-mono-tabular">
                {algoCommands.length === 0 ? (
                  <span className="text-slate-500">
                    Añade instrucciones (máx. {mission.algorithm.maxSteps} pasos)...
                  </span>
                ) : (
                  algoCommands.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setAlgoCommands((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="px-2 py-1 rounded bg-sky-900/70 text-sky-200 border border-sky-700/60 hover:bg-rose-900/60 cursor-pointer"
                    >
                      {idx + 1}. {c}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {mission.mechanic === 'world-build' && buildEval && (
            <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Bloques construidos en la zona:</span>
                <span className="font-mono-tabular font-bold text-amber-300">
                  {buildEval.count} / {buildEval.required}
                </span>
              </div>
              {mission.buildTarget?.minHeightOffset && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Altura mínima requerida:</span>
                  <span className="font-mono-tabular">
                    {buildEval.maxHeightOffset.toFixed(1)} m / {mission.buildTarget.minHeightOffset} m
                  </span>
                </div>
              )}
              {!buildEval.solved && (
                <button
                  type="button"
                  onClick={onSwitchToBuildHere}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  Activar Modo Construir en el Mundo 3D
                </button>
              )}
            </div>
          )}

          {mission.mechanic === 'world-collect' && collectEval && (
            <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 flex items-center justify-between text-sm">
              <span className="text-slate-300">Cristales de la misión recolectados:</span>
              <span className="font-mono-tabular font-bold text-sky-300">
                {collectEval.found} / {collectEval.total}
              </span>
            </div>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 border text-sm flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Post-solve Educational Explanation */}
          {justSolved && (
            <div className="rounded-xl bg-sky-950/50 border border-sky-500/50 p-4 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Explicación Educativa de la Lógica
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">{mission.explanation}</p>
            </div>
          )}

          {/* Progressive Hint System */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Lightbulb className="w-4 h-4" />
                <span>
                  Pistas Progresivas ({Math.min(revealedHints, mission.hints.length)}/{mission.hints.length})
                </span>
              </span>
              {revealedHints < mission.hints.length && (
                <button
                  type="button"
                  onClick={() => setRevealedHints((h) => Math.min(mission.hints.length, h + 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-200 border border-slate-700 cursor-pointer"
                >
                  Mostrar Pista {revealedHints + 1}
                </button>
              )}
            </div>

            {revealedHints > 0 && (
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                {mission.hints.slice(0, revealedHints).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}

            {/* Optional Live AI Mentor */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Pregunta una duda al Guía IA..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={askAiMentor}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiLoading ? 'Consultando...' : 'Preguntar al Guía IA'}</span>
                </button>
              </div>
              {aiReply && (
                <p className="text-xs text-sky-200 bg-sky-950/50 border border-sky-800 rounded-lg p-2.5">
                  {aiReply}
                </p>
              )}
              {aiError && (
                <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg p-2.5">
                  {aiError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
          >
            Cerrar
          </button>

          {!justSolved ? (
            <button
              type="button"
              onClick={verifyAnswer}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              {mission.mechanic === 'algorithm-steps' ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Ejecutar Algoritmo</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4" />
                  <span>Comprobar Solución</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              Continuar Explorando
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

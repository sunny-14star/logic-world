import { ACHIEVEMENTS, BLOCK_MATERIAL_MAP, createInitialSaveState } from '../data/catalog';
import { MISSIONS } from '../data/missions';
import { WORLDS } from '../data/worlds';
import type {
  AABBCollider,
  AlgorithmStepData,
  CircuitPuzzleData,
  CognitiveSkill,
  MissionDefinition,
  PhysicsBalanceData,
  PlacedBlock,
  SaveGameState,
  Vec3,
  WorldId,
} from '../types/game';

export const PLAYABLE_RADIUS = 56;
export const STORAGE_KEY = 'logic_world_save_v1';

/**
 * Deterministic terrain height for each biome.
 * Keeps the central spawn plaza (r < 12) flat at y = 0 for clean spawn & landmark framing.
 */
export function groundHeightAt(worldId: WorldId, x: number, z: number): number {
  const distSq = x * x + z * z;
  const dist = Math.sqrt(distSq);

  // Outer natural mountain/cliff rim beyond playable boundary
  const rimBoost = dist > 52 ? Math.min(12, (dist - 52) * 0.45) : 0;

  if (worldId === 'naturaleza') {
    // Gentle river channel running east-west near z = -6..4 on the east side (x > 8)
    const riverWave = Math.sin(z * 0.12) * 3;
    const riverDist = Math.abs(x - (14 + riverWave));
    const riverDip = riverDist < 3.2 && dist > 9 ? -0.9 * (1 - riverDist / 3.2) : 0;

    if (dist < 11) return rimBoost;
    const hill =
      Math.sin(x * 0.08) * Math.cos(z * 0.08) * 1.15 +
      Math.max(0, (dist - 24) * 0.06);
    return Math.max(-0.9, hill * Math.min(1, (dist - 11) / 8) + riverDip + rimBoost);
  }

  if (worldId === 'tecnologico') {
    if (dist < 14) return rimBoost;
    const pad = Math.sin(x * 0.1) * Math.sin(z * 0.1) * 0.35;
    return Math.max(0, pad) + rimBoost;
  }

  if (worldId === 'construccion') {
    if (dist < 14) return rimBoost;
    const terrace = Math.floor((Math.sin(x * 0.07) + Math.cos(z * 0.07) + 2) * 0.6) * 0.35;
    return terrace + rimBoost;
  }

  if (worldId === 'misterio') {
    // Central temple stepped platform near (0, -18)
    const dTempleX = Math.abs(x);
    const dTempleZ = Math.abs(z + 18);
    if (dTempleX < 5 && dTempleZ < 5) return 0.9;
    if (dTempleX < 7.5 && dTempleZ < 7.5) return 0.45;
    if (dist < 12) return rimBoost;
    const dune = Math.sin(x * 0.09 + 1) * Math.cos(z * 0.09) * 0.7;
    return Math.max(0, dune) + rimBoost;
  }

  // futurista
  if (dist < 14) return rimBoost;
  const terrace = Math.sin(x * 0.09) * Math.cos(z * 0.09) * 0.5;
  return Math.max(0, terrace) + rimBoost;
}

/**
 * Static world colliders aligned 1:1 with the 3D scene landmarks & labyrinth walls.
 */
export function getStaticWorldColliders(worldId: WorldId): AABBCollider[] {
  const colliders: AABBCollider[] = [];

  if (worldId === 'naturaleza') {
    // Central monolith base at (0, -18)
    colliders.push({
      id: 'nat_monolith',
      minX: -1.6,
      maxX: 1.6,
      minY: -1,
      maxY: 6.5,
      minZ: -19.6,
      maxZ: -16.4,
      kind: 'solid',
    });
    // Cave rocks on west side (-26, 12) - archway keeps open path inside
    colliders.push({
      id: 'nat_cave_l',
      minX: -29.5,
      maxX: -27.2,
      minY: -1,
      maxY: 4.5,
      minZ: 10,
      maxZ: 14,
      kind: 'solid',
    });
    colliders.push({
      id: 'nat_cave_r',
      minX: -24.8,
      maxX: -22.5,
      minY: -1,
      maxY: 4.5,
      minZ: 10,
      maxZ: 14,
      kind: 'solid',
    });
  } else if (worldId === 'tecnologico') {
    // Central energy tower base at (0, -18)
    colliders.push({
      id: 'tec_tower',
      minX: -2.0,
      maxX: 2.0,
      minY: -1,
      maxY: 7,
      minZ: -20.0,
      maxZ: -16.0,
      kind: 'solid',
    });
    // Lab dome east (22, -14)
    colliders.push({
      id: 'tec_lab_e',
      minX: 19,
      maxX: 25,
      minY: -1,
      maxY: 4,
      minZ: -24,
      maxZ: -20,
      kind: 'solid',
    });
  } else if (worldId === 'construccion') {
    // Central crane tower base (0, -18)
    colliders.push({
      id: 'con_crane',
      minX: -1.8,
      maxX: 1.8,
      minY: -1,
      maxY: 8,
      minZ: -19.8,
      maxZ: -16.2,
      kind: 'solid',
    });
  } else if (worldId === 'misterio') {
    // Labyrinth walls on west side around (-24, 4), corridors >= 3m wide
    colliders.push(
      { id: 'mis_wall_1', minX: -29, maxX: -19, minY: -1, maxY: 3.2, minZ: -2, maxZ: -0.8, kind: 'wall' },
      { id: 'mis_wall_2', minX: -29, maxX: -27.8, minY: -1, maxY: 3.2, minZ: -2, maxZ: 9, kind: 'wall' },
      { id: 'mis_wall_3', minX: -20.2, maxX: -19, minY: -1, maxY: 3.2, minZ: 2.5, maxZ: 9, kind: 'wall' },
      { id: 'mis_wall_4', minX: -26, maxX: -20, minY: -1, maxY: 3.2, minZ: 7.8, maxZ: 9, kind: 'wall' }
    );
  } else if (worldId === 'futurista') {
    // Central spire base (0, -18)
    colliders.push({
      id: 'fut_spire',
      minX: -2.0,
      maxX: 2.0,
      minY: -1,
      maxY: 9,
      minZ: -20.0,
      maxZ: -16.0,
      kind: 'solid',
    });
  }

  return colliders;
}

export function blockToAABB(block: PlacedBlock): AABBCollider {
  return {
    id: block.id,
    minX: block.x - 0.5,
    maxX: block.x + 0.5,
    minY: block.y - 0.5,
    maxY: block.y + 0.5,
    minZ: block.z - 0.5,
    maxZ: block.z + 0.5,
    kind: 'solid',
  };
}

export interface PlayerPhysicsState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  coyoteTimer: number;
  crouching: boolean;
}

export interface MovementInput {
  moveX: number; // world-space normalized wish dir X
  moveZ: number; // world-space normalized wish dir Z
  sprint: boolean;
  crouch: boolean;
  jumpBuffered: boolean;
  speedMultiplier: number;
  jumpMultiplier: number;
}

export interface MovementStepResult {
  state: PlayerPhysicsState;
  jumped: boolean;
  landed: boolean;
}

/**
 * Pure 3D kinematic movement + AABB collision + ground/block support resolution.
 */
export function resolvePlayerMovement(
  prev: PlayerPhysicsState,
  input: MovementInput,
  worldId: WorldId,
  placedBlocks: PlacedBlock[],
  dt: number
): MovementStepResult {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const playerRadius = 0.42;
  const playerHeight = input.crouch ? 1.15 : 1.75;

  const baseSpeed = input.crouch ? 3.8 : input.sprint ? 10.2 : 6.8;
  const moveSpeed = baseSpeed * input.speedMultiplier;

  let vx = input.moveX * moveSpeed;
  let vz = input.moveZ * moveSpeed;
  let vy = prev.velocity.y;

  let coyoteTimer = prev.grounded ? 0.11 : Math.max(0, prev.coyoteTimer - clampedDt);
  let jumped = false;

  if (input.jumpBuffered && (prev.grounded || coyoteTimer > 0)) {
    vy = 9.2 * input.jumpMultiplier;
    coyoteTimer = 0;
    jumped = true;
  }

  // Gravity
  vy -= 23.0 * clampedDt;
  if (vy < -24) vy = -24;

  const colliders: AABBCollider[] = [
    ...getStaticWorldColliders(worldId),
    ...placedBlocks.filter((b) => b.worldId === worldId).map(blockToAABB),
  ];

  let nextX = prev.position.x + vx * clampedDt;
  let nextY = prev.position.y;
  let nextZ = prev.position.z + vz * clampedDt;

  // Clamp to playable world boundary
  nextX = Math.max(-PLAYABLE_RADIUS, Math.min(PLAYABLE_RADIUS, nextX));
  nextZ = Math.max(-PLAYABLE_RADIUS, Math.min(PLAYABLE_RADIUS, nextZ));

  // Horizontal X collision
  for (const box of colliders) {
    const overlapsY = nextY + playerHeight > box.minY + 0.08 && nextY < box.maxY - 0.15;
    const overlapsZ = nextZ + playerRadius > box.minZ && nextZ - playerRadius < box.maxZ;
    if (overlapsY && overlapsZ) {
      if (nextX + playerRadius > box.minX && prev.position.x + playerRadius <= box.minX + 0.25) {
        nextX = box.minX - playerRadius - 0.001;
        vx = 0;
      } else if (nextX - playerRadius < box.maxX && prev.position.x - playerRadius >= box.maxX - 0.25) {
        nextX = box.maxX + playerRadius + 0.001;
        vx = 0;
      }
    }
  }

  // Horizontal Z collision
  for (const box of colliders) {
    const overlapsY = nextY + playerHeight > box.minY + 0.08 && nextY < box.maxY - 0.15;
    const overlapsX = nextX + playerRadius > box.minX && nextX - playerRadius < box.maxX;
    if (overlapsY && overlapsX) {
      if (nextZ + playerRadius > box.minZ && prev.position.z + playerRadius <= box.minZ + 0.25) {
        nextZ = box.minZ - playerRadius - 0.001;
        vz = 0;
      } else if (nextZ - playerRadius < box.maxZ && prev.position.z - playerRadius >= box.maxZ - 0.25) {
        nextZ = box.maxZ + playerRadius + 0.001;
        vz = 0;
      }
    }
  }

  // Vertical Y collision & terrain floor
  const prevY = prev.position.y;
  nextY = prevY + vy * clampedDt;
  let supportY = groundHeightAt(worldId, nextX, nextZ);

  for (const box of colliders) {
    const overlapsX = nextX + playerRadius > box.minX + 0.03 && nextX - playerRadius < box.maxX - 0.03;
    const overlapsZ = nextZ + playerRadius > box.minZ + 0.03 && nextZ - playerRadius < box.maxZ - 0.03;
    if (overlapsX && overlapsZ) {
      // Landing on top of block / platform
      if (vy <= 0 && prevY >= box.maxY - 0.25 && nextY <= box.maxY) {
        supportY = Math.max(supportY, box.maxY);
      }
      // Head bump under block
      if (vy > 0 && prevY + playerHeight <= box.minY + 0.15 && nextY + playerHeight >= box.minY) {
        nextY = box.minY - playerHeight - 0.001;
        vy = 0;
      }
    }
  }

  let grounded = false;
  if (nextY <= supportY) {
    nextY = supportY;
    vy = 0;
    grounded = true;
  }

  const landed = !prev.grounded && grounded && prev.velocity.y < -3.5;

  return {
    state: {
      position: { x: nextX, y: nextY, z: nextZ },
      velocity: { x: vx, y: vy, z: vz },
      grounded,
      coyoteTimer: grounded ? 0.11 : coyoteTimer,
      crouching: input.crouch,
    },
    jumped,
    landed,
  };
}

/**
 * Evaluates a boolean logic circuit puzzle.
 */
export function evaluateLogicCircuit(
  circuit: CircuitPuzzleData,
  inputs: Record<string, boolean>
): { values: Record<string, boolean>; finalOutput: boolean; solved: boolean } {
  const values: Record<string, boolean> = { ...inputs };

  for (const gate of circuit.gates) {
    const ins = gate.inputs.map((id) => Boolean(values[id]));
    let out = false;
    switch (gate.type) {
      case 'AND':
        out = ins.every(Boolean);
        break;
      case 'OR':
        out = ins.some(Boolean);
        break;
      case 'NOT':
        out = !ins[0];
        break;
      case 'XOR':
        out = ins.reduce((acc, v) => acc !== v, false);
        break;
      case 'NAND':
        out = !ins.every(Boolean);
        break;
    }
    values[gate.id] = out;
  }

  const finalOutput = Boolean(values[circuit.outputGateId]);
  return {
    values,
    finalOutput,
    solved: finalOutput === circuit.targetOutput,
  };
}

/**
 * Evaluates torque equilibrium in lever physics challenges.
 */
export function evaluatePhysicsLever(
  physics: PhysicsBalanceData,
  selectedDistance: number
): { leftTorque: number; rightTorque: number; solved: boolean } {
  const leftTorque = physics.leftWeights.reduce(
    (sum, item) => sum + item.weight * item.distance,
    0
  );
  const rightTorque = physics.targetWeight * selectedDistance;
  const solved =
    leftTorque === rightTorque ||
    Boolean(physics.correctDistances?.includes(selectedDistance));
  return { leftTorque, rightTorque, solved };
}

/**
 * Simulates grid robot step algorithm commands.
 */
export function simulateAlgorithmSteps(
  data: AlgorithmStepData,
  commands: ('AVANZAR' | 'GIRAR_IZQ' | 'GIRAR_DER')[]
): {
  path: { x: number; z: number }[];
  finalPos: { x: number; z: number; dir: 'N' | 'E' | 'S' | 'W' };
  hitObstacle: boolean;
  reachedGoal: boolean;
} {
  const dirs: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W'];
  let x = data.start.x;
  let z = data.start.z;
  let dir = data.start.dir;
  const path: { x: number; z: number }[] = [{ x, z }];
  let hitObstacle = false;

  for (const cmd of commands.slice(0, data.maxSteps)) {
    if (cmd === 'GIRAR_IZQ') {
      const idx = (dirs.indexOf(dir) + 3) % 4;
      dir = dirs[idx];
    } else if (cmd === 'GIRAR_DER') {
      const idx = (dirs.indexOf(dir) + 1) % 4;
      dir = dirs[idx];
    } else if (cmd === 'AVANZAR') {
      let nx = x;
      let nz = z;
      if (dir === 'N') nz -= 1;
      if (dir === 'S') nz += 1;
      if (dir === 'E') nx += 1;
      if (dir === 'W') nx -= 1;

      const outOfBounds = nx < 0 || nz < 0 || nx >= data.gridSize || nz >= data.gridSize;
      const blocked = data.obstacles.some((o) => o.x === nx && o.z === nz);
      if (outOfBounds || blocked) {
        hitObstacle = true;
        break;
      }
      x = nx;
      z = nz;
      path.push({ x, z });
    }
  }

  const reachedGoal = !hitObstacle && x === data.goal.x && z === data.goal.z;
  return {
    path,
    finalPos: { x, z, dir },
    hitObstacle,
    reachedGoal,
  };
}

/**
 * Checks whether a 3D build mission objective is satisfied by player-placed blocks.
 */
export function evaluateBuildMission(
  mission: MissionDefinition,
  placedBlocks: PlacedBlock[]
): { count: number; required: number; maxHeightOffset: number; solved: boolean } {
  const target = mission.buildTarget;
  if (!target) {
    return { count: 0, required: 0, maxHeightOffset: 0, solved: false };
  }

  const matching = placedBlocks.filter((b) => {
    if (b.worldId !== mission.worldId) return false;
    if (target.requiredMaterial && b.materialId !== target.requiredMaterial) return false;
    const dx = b.x - target.center.x;
    const dz = b.z - target.center.z;
    return Math.sqrt(dx * dx + dz * dz) <= target.radius;
  });

  const baseGround = groundHeightAt(mission.worldId, target.center.x, target.center.z);
  let maxHeightOffset = 0;
  for (const b of matching) {
    maxHeightOffset = Math.max(maxHeightOffset, b.y - baseGround);
  }

  const meetsCount = matching.length >= target.minBlocks;
  const meetsHeight = !target.minHeightOffset || maxHeightOffset >= target.minHeightOffset;
  return {
    count: matching.length,
    required: target.minBlocks,
    maxHeightOffset,
    solved: meetsCount && meetsHeight,
  };
}

export function evaluateCollectMission(
  mission: MissionDefinition,
  collectedIds: string[]
): { found: number; total: number; solved: boolean } {
  const ids = mission.collectTarget?.collectibleIds || [];
  const found = ids.filter((id) => collectedIds.includes(id)).length;
  return {
    found,
    total: ids.length,
    solved: ids.length > 0 && found === ids.length,
  };
}

/**
 * Evaluates simple safe arithmetic expressions like "16*2" or "6^2+2" or plain text answers.
 */
export function validateMathOrTextAnswer(mission: MissionDefinition, rawInput: string): boolean {
  const cleaned = rawInput.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return false;
  const accepted = mission.acceptedAnswers || [];

  for (const ans of accepted) {
    const normAns = ans.trim().toLowerCase().replace(/\s+/g, '');
    if (cleaned === normAns) return true;
  }

  // Safe numeric arithmetic check (only digits, +, -, *, /, ^, parentheses, dot)
  if (/^[0-9+\-*/^().]+$/.test(cleaned)) {
    try {
      const expr = cleaned.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const val = Number(new Function(`return (${expr});`)());
      if (Number.isFinite(val)) {
        for (const ans of accepted) {
          const num = Number(ans.trim());
          if (Number.isFinite(num) && Math.abs(val - num) < 1e-6) {
            return true;
          }
        }
      }
    } catch {
      return false;
    }
  }
  return false;
}

export function calculateLevelFromXp(xp: number): number {
  let level = 1;
  let threshold = 100;
  let remaining = Math.max(0, xp);
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(100 * Math.pow(1.25, level - 1));
  }
  return level;
}

export function getLevelProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  percent: number;
} {
  let level = 1;
  let threshold = 100;
  let remaining = Math.max(0, xp);
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(100 * Math.pow(1.25, level - 1));
  }
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: threshold,
    percent: Math.min(100, Math.round((remaining / threshold) * 100)),
  };
}

export function computeCognitiveStats(
  completedMissionIds: string[]
): Record<CognitiveSkill, { completed: number; total: number }> {
  const stats: Record<CognitiveSkill, { completed: number; total: number }> = {
    logico: { completed: 0, total: 0 },
    critico: { completed: 0, total: 0 },
    creativo: { completed: 0, total: 0 },
    resolucion: { completed: 0, total: 0 },
  };
  const completedSet = new Set(completedMissionIds);
  for (const m of MISSIONS) {
    stats[m.skill].total += 1;
    if (completedSet.has(m.id)) {
      stats[m.skill].completed += 1;
    }
  }
  return stats;
}

export function evaluateAchievements(state: SaveGameState): {
  newlyUnlocked: string[];
  bonusXp: number;
} {
  const completedSet = new Set(state.completedMissionIds);
  const existing = new Set(state.unlockedAchievements);
  const newlyUnlocked: string[] = [];
  let bonusXp = 0;

  const level = calculateLevelFromXp(state.xp);
  const natCompleted = MISSIONS.filter(
    (m) => m.worldId === 'naturaleza' && completedSet.has(m.id)
  ).length;
  const circuitOrAlgoCompleted = MISSIONS.filter(
    (m) => (m.category === 'circuito' || m.category === 'algoritmo') && completedSet.has(m.id)
  ).length;
  const worldsWithCompletion = new Set(
    MISSIONS.filter((m) => completedSet.has(m.id)).map((m) => m.worldId)
  ).size;

  const checks: Record<string, boolean> = {
    primera_chispa: state.completedMissionIds.length >= 1,
    aprendiz_logico: state.completedMissionIds.length >= 10,
    arquitecto_novato: state.placedBlocks.length >= 15,
    coleccionista: state.collectedIds.length >= 10,
    maestro_naturaleza: natCompleted >= 12,
    ingeniero_circuitos: circuitOrAlgoCompleted >= 8,
    constructor_experto: state.placedBlocks.length >= 40,
    explorador_mundos: worldsWithCompletion >= WORLDS.length,
    gran_sabio: level >= 8 && state.completedMissionIds.length >= 50,
  };

  for (const ach of ACHIEVEMENTS) {
    if (!existing.has(ach.id) && checks[ach.id]) {
      newlyUnlocked.push(ach.id);
      bonusXp += ach.xpBonus;
    }
  }

  return { newlyUnlocked, bonusXp };
}

export function completeMissionInState(
  prev: SaveGameState,
  mission: MissionDefinition
): { nextState: SaveGameState; leveledUp: boolean; newAchievements: string[] } {
  if (prev.completedMissionIds.includes(mission.id)) {
    return { nextState: prev, leveledUp: false, newAchievements: [] };
  }

  const prevLevel = calculateLevelFromXp(prev.xp);
  const nextCompleted = [...prev.completedMissionIds, mission.id];
  const nextInventory = { ...prev.inventory };
  if (mission.rewardBlockId && mission.rewardAmount) {
    nextInventory[mission.rewardBlockId] =
      (nextInventory[mission.rewardBlockId] || 0) + mission.rewardAmount;
  }

  // Pick next uncompleted mission in same world if tracked mission just finished
  let nextTracked = prev.trackedMissionId;
  if (prev.trackedMissionId === mission.id) {
    const nextInWorld = MISSIONS.find(
      (m) => m.worldId === mission.worldId && !nextCompleted.includes(m.id)
    );
    nextTracked = nextInWorld ? nextInWorld.id : null;
  }

  const draft: SaveGameState = {
    ...prev,
    xp: prev.xp + mission.xpReward,
    coins: prev.coins + mission.coinReward,
    completedMissionIds: nextCompleted,
    inventory: nextInventory,
    trackedMissionId: nextTracked,
    lastSavedAt: new Date().toISOString(),
  };

  const { newlyUnlocked, bonusXp } = evaluateAchievements(draft);
  const finalState: SaveGameState = {
    ...draft,
    xp: draft.xp + bonusXp,
    unlockedAchievements: [...draft.unlockedAchievements, ...newlyUnlocked],
  };

  const newLevel = calculateLevelFromXp(finalState.xp);
  return {
    nextState: finalState,
    leveledUp: newLevel > prevLevel,
    newAchievements: newlyUnlocked,
  };
}

export function getEffectiveBlockCost(
  materialId: keyof typeof BLOCK_MATERIAL_MAP,
  unlockedAbilities: SaveGameState['unlockedAbilities']
): number {
  const base = BLOCK_MATERIAL_MAP[materialId].costCoins;
  if (unlockedAbilities.includes('constructor_maestro')) {
    return Math.max(1, Math.round(base * 0.75));
  }
  return base;
}

export function saveToStorage(state: SaveGameState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadFromStorage(): SaveGameState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveGameState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.currentWorldId) return null;
    const base = createInitialSaveState();
    return {
      ...base,
      ...parsed,
      inventory: { ...base.inventory, ...(parsed.inventory || {}) },
      customization: { ...base.customization, ...(parsed.customization || {}) },
      settings: { ...base.settings, ...(parsed.settings || {}) },
      playerPositionsByWorld: {
        ...base.playerPositionsByWorld,
        ...(parsed.playerPositionsByWorld || {}),
      },
    };
  } catch {
    return null;
  }
}

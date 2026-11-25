import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveState } from '../data/catalog';
import { MISSIONS, getMissionsByWorld } from '../data/missions';
import { WORLDS } from '../data/worlds';
import {
  calculateLevelFromXp,
  completeMissionInState,
  evaluateBuildMission,
  evaluateCollectMission,
  evaluateLogicCircuit,
  evaluatePhysicsLever,
  groundHeightAt,
  resolvePlayerMovement,
  simulateAlgorithmSteps,
  validateMathOrTextAnswer,
} from './rules';

test('all 5 worlds have between 20 and 30 missions each (24 each = 120 total)', () => {
  assert.equal(WORLDS.length, 5);
  for (const world of WORLDS) {
    const list = getMissionsByWorld(world.id);
    assert.ok(list.length >= 20 && list.length <= 30, `${world.id} has ${list.length} missions`);
  }
  assert.equal(MISSIONS.length, 120);
});

test('all world-collect missions reference real collectibles in their world', () => {
  for (const m of MISSIONS) {
    if (m.mechanic === 'world-collect' && m.collectTarget) {
      const world = WORLDS.find((w) => w.id === m.worldId)!;
      const ids = new Set(world.collectibles.map((c) => c.id));
      for (const cid of m.collectTarget.collectibleIds) {
        assert.ok(ids.has(cid), `Missing collectible ${cid} in ${m.worldId}`);
      }
    }
  }
});

test('spawn plaza terrain is flat and walkable at center', () => {
  for (const world of WORLDS) {
    const h = groundHeightAt(world.id, world.spawnPosition.x, world.spawnPosition.z);
    assert.ok(Math.abs(h) < 0.01, `Spawn height for ${world.id} should be ~0, got ${h}`);
  }
});

test('player physics lands cleanly on player-placed 3D blocks and collides laterally', () => {
  const placed = [
    { id: 'b1', worldId: 'naturaleza' as const, x: 5, y: 0.5, z: 5, materialId: 'madera' as const },
  ];
  // Falling from y=2 onto block top (y=1.0)
  const falling = resolvePlayerMovement(
    {
      position: { x: 5, y: 1.1, z: 5 },
      velocity: { x: 0, y: -5, z: 0 },
      grounded: false,
      coyoteTimer: 0,
      crouching: false,
    },
    {
      moveX: 0,
      moveZ: 0,
      sprint: false,
      crouch: false,
      jumpBuffered: false,
      speedMultiplier: 1,
      jumpMultiplier: 1,
    },
    'naturaleza',
    placed,
    0.04
  );
  assert.equal(falling.state.grounded, true);
  assert.equal(falling.state.position.y, 1.0);
});

test('boolean logic circuit evaluation supports multiple valid solutions', () => {
  const nat20 = MISSIONS.find((m) => m.id === 'nat_20')!;
  assert.ok(nat20.circuit);
  // Both (1,0) and (0,1) should solve XOR
  assert.equal(evaluateLogicCircuit(nat20.circuit, { A: true, B: false }).solved, true);
  assert.equal(evaluateLogicCircuit(nat20.circuit, { A: false, B: true }).solved, true);
  assert.equal(evaluateLogicCircuit(nat20.circuit, { A: true, B: true }).solved, false);
});

test('physics lever torque balance calculates composite weights accurately', () => {
  const nat23 = MISSIONS.find((m) => m.id === 'nat_23')!;
  assert.ok(nat23.physics);
  assert.equal(evaluatePhysicsLever(nat23.physics, 3).solved, true);
  assert.equal(evaluatePhysicsLever(nat23.physics, 2).solved, false);
});

test('algorithm step simulator navigates around obstacles to reach goal', () => {
  const nat07 = MISSIONS.find((m) => m.id === 'nat_07')!;
  assert.ok(nat07.algorithm);
  const res = simulateAlgorithmSteps(nat07.algorithm, [
    'AVANZAR',
    'AVANZAR',
    'AVANZAR',
    'GIRAR_DER',
    'AVANZAR',
    'AVANZAR',
    'AVANZAR',
  ]);
  assert.equal(res.hitObstacle, false);
  assert.equal(res.reachedGoal, true);
});

test('math validator accepts equivalent numeric answers and expressions', () => {
  const nat01 = MISSIONS.find((m) => m.id === 'nat_01')!;
  assert.equal(validateMathOrTextAnswer(nat01, '32'), true);
  assert.equal(validateMathOrTextAnswer(nat01, '16 * 2'), true);
  assert.equal(validateMathOrTextAnswer(nat01, '30'), false);
});

test('world-build and world-collect mission progress evaluates accurately', () => {
  const nat04 = MISSIONS.find((m) => m.id === 'nat_04')!;
  const blocks = [
    { id: '1', worldId: 'naturaleza' as const, x: 14, y: 0.5, z: -4, materialId: 'puente' as const },
    { id: '2', worldId: 'naturaleza' as const, x: 15, y: 0.5, z: -4, materialId: 'puente' as const },
    { id: '3', worldId: 'naturaleza' as const, x: 16, y: 0.5, z: -4, materialId: 'puente' as const },
    { id: '4', worldId: 'naturaleza' as const, x: 17, y: 0.5, z: -4, materialId: 'puente' as const },
  ];
  assert.equal(evaluateBuildMission(nat04, blocks).solved, true);

  const nat02 = MISSIONS.find((m) => m.id === 'nat_02')!;
  assert.equal(evaluateCollectMission(nat02, ['col_nat_1']).solved, true);
  assert.equal(evaluateCollectMission(nat02, []).solved, false);
});

test('completing missions awards XP, coins, levels, and unlocks achievements', () => {
  const initial = createInitialSaveState();
  const nat01 = MISSIONS.find((m) => m.id === 'nat_01')!;
  const { nextState, newAchievements } = completeMissionInState(initial, nat01);
  assert.ok(nextState.completedMissionIds.includes('nat_01'));
  assert.ok(newAchievements.includes('primera_chispa'));
  assert.equal(nextState.coins, initial.coins + nat01.coinReward);
  assert.ok(calculateLevelFromXp(nextState.xp) >= 1);
});

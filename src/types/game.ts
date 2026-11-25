export type WorldId =
  | 'naturaleza'
  | 'tecnologico'
  | 'construccion'
  | 'misterio'
  | 'futurista';

export type CognitiveSkill =
  | 'logico'
  | 'critico'
  | 'creativo'
  | 'resolucion';

export type MissionCategory =
  | 'matematicas'
  | 'circuito'
  | 'patron'
  | 'fisica'
  | 'clasificacion'
  | 'algoritmo'
  | 'construccion'
  | 'exploracion'
  | 'creatividad';

export type PuzzleMechanic =
  | 'math-input'
  | 'multiple-choice'
  | 'logic-circuit'
  | 'physics-balance'
  | 'pattern-matrix'
  | 'sort-buckets'
  | 'algorithm-steps'
  | 'world-build'
  | 'world-collect';

export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type ActiveModal =
  | null
  | 'npc'
  | 'puzzle'
  | 'character'
  | 'map'
  | 'inventory'
  | 'missions'
  | 'achievements'
  | 'pause';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  kind: 'solid' | 'platform' | 'wall';
}

export interface CharacterCustomization {
  name: string;
  bodyStyle: 'explorador' | 'ingeniera' | 'arquitecto' | 'robot' | 'titan';
  faceStyle: 'sonriente' | 'concentrado' | 'gafas' | 'asombrado' | 'cibernetico' | 'guino';
  hairStyle: 'corto' | 'largo' | 'cresta' | 'casco' | 'coletas' | 'rizado' | 'capucha' | 'antena';
  outfitStyle: 'aventurero' | 'cientifico' | 'constructor' | 'guardian' | 'espacial' | 'mago' | 'ciberpunk';
  primaryColor: string;
  secondaryColor: string;
  skinColor: string;
  hairColor: string;
  accessory: 'ninguno' | 'mochila' | 'capa' | 'visor' | 'corona';
}

export interface LogicGateNode {
  id: string;
  type: 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND';
  inputs: string[]; // 'A', 'B', 'C', or another gate id
  label: string;
}

export interface CircuitPuzzleData {
  inputNames: string[];
  gates: LogicGateNode[];
  outputGateId: string;
  targetOutput: boolean;
  initialInputs: Record<string, boolean>;
}

export interface PhysicsBalanceData {
  mode: 'lever' | 'density' | 'trajectory';
  leftWeights: { weight: number; distance: number }[];
  rightDistanceOptions: number[];
  targetWeight: number;
  correctDistances?: number[];
  promptDetail: string;
}

export interface PatternMatrixData {
  grid: (string | null)[];
  options: string[];
  correctOption: string;
}

export interface SortBucketsData {
  buckets: { id: string; label: string }[];
  items: { id: string; label: string; correctBucket: string }[];
}

export interface AlgorithmStepData {
  gridSize: number;
  start: { x: number; z: number; dir: 'N' | 'E' | 'S' | 'W' };
  goal: { x: number; z: number };
  obstacles: { x: number; z: number }[];
  maxSteps: number;
  availableCommands: ('AVANZAR' | 'GIRAR_IZQ' | 'GIRAR_DER')[];
}

export interface WorldBuildTarget {
  center: Vec3;
  radius: number;
  minBlocks: number;
  minHeightOffset?: number;
  requiredMaterial?: BlockMaterialId;
  acceptAnyCreativeStructure?: boolean;
}

export interface WorldCollectTarget {
  collectibleIds: string[];
}

export interface MissionDefinition {
  id: string;
  worldId: WorldId;
  order: number;
  title: string;
  description: string;
  category: MissionCategory;
  skill: CognitiveSkill;
  difficulty: 1 | 2 | 3;
  xpReward: number;
  coinReward: number;
  mechanic: PuzzleMechanic;
  location: Vec3;
  npcId?: string;
  hints: string[];
  explanation: string;
  multiSolutionNote?: string;
  // Mechanic-specific payloads
  acceptedAnswers?: string[]; // math-input (supports multiple valid strategies/forms)
  choices?: { id: string; label: string }[];
  correctChoiceIds?: string[]; // supports 1 or multiple valid choices
  circuit?: CircuitPuzzleData;
  physics?: PhysicsBalanceData;
  pattern?: PatternMatrixData;
  sort?: SortBucketsData;
  algorithm?: AlgorithmStepData;
  buildTarget?: WorldBuildTarget;
  collectTarget?: WorldCollectTarget;
  rewardBlockId?: BlockMaterialId;
  rewardAmount?: number;
}

export type BlockMaterialId =
  | 'madera'
  | 'piedra'
  | 'circuito'
  | 'cristal'
  | 'puente'
  | 'engranaje'
  | 'acero'
  | 'energia';

export interface BlockMaterialDef {
  id: BlockMaterialId;
  name: string;
  role: string;
  color: string;
  emissive?: string;
  roughness: number;
  metalness: number;
  costCoins: number;
  initialCount: number;
}

export interface PlacedBlock {
  id: string;
  worldId: WorldId;
  x: number;
  y: number;
  z: number;
  materialId: BlockMaterialId;
}

export interface NpcDefinition {
  id: string;
  worldId: WorldId;
  name: string;
  role: string;
  greeting: string;
  color: string;
  accentColor: string;
  position: Vec3;
  isRobot?: boolean;
}

export interface CollectibleDefinition {
  id: string;
  worldId: WorldId;
  name: string;
  position: Vec3;
  color: string;
  xp: number;
  coins: number;
}

export interface WorldDefinition {
  id: WorldId;
  name: string;
  subtitle: string;
  description: string;
  unlockLevel: number;
  skyTopColor: string;
  skyHorizonColor: string;
  fogColor: string;
  groundColor: string;
  groundAccentColor: string;
  waterColor: string;
  keyLightColor: string;
  hemiSkyColor: string;
  hemiGroundColor: string;
  accentColor: string;
  spawnPosition: Vec3;
  npcs: NpcDefinition[];
  collectibles: CollectibleDefinition[];
}

export type AbilityId =
  | 'salto_impulsado'
  | 'carrera_veloz'
  | 'vision_logica'
  | 'iman_cristales'
  | 'constructor_maestro';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  description: string;
  unlockLevel: number;
  costCoins: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  medal: 'bronce' | 'plata' | 'oro' | 'platino';
  xpBonus: number;
}

export interface ShopAccessoryItem {
  id: CharacterCustomization['accessory'];
  name: string;
  description: string;
  costCoins: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  volume: number;
  touchControlsMode: 'auto' | 'always' | 'off';
  cameraSensitivity: number;
}

export interface SaveGameState {
  version: number;
  playerName: string;
  currentWorldId: WorldId;
  xp: number;
  coins: number;
  completedMissionIds: string[];
  collectedIds: string[];
  unlockedAbilities: AbilityId[];
  unlockedAccessories: CharacterCustomization['accessory'][];
  unlockedAchievements: string[];
  inventory: Record<BlockMaterialId, number>;
  placedBlocks: PlacedBlock[];
  customization: CharacterCustomization;
  settings: GameSettings;
  trackedMissionId: string | null;
  playerPositionsByWorld: Record<WorldId, Vec3>;
  lastSavedAt: string;
}

export interface NearbyInteractable {
  kind: 'npc' | 'mission' | 'collectible';
  id: string;
  label: string;
  sublabel: string;
  distance: number;
}

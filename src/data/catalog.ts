import type {
  AbilityDefinition,
  AchievementDefinition,
  BlockMaterialDef,
  BlockMaterialId,
  CharacterCustomization,
  SaveGameState,
  ShopAccessoryItem,
} from '../types/game';

export const BLOCK_MATERIALS: BlockMaterialDef[] = [
  {
    id: 'madera',
    name: 'Madera Roble',
    role: 'Estructura ligera y puentes',
    color: '#a47148',
    roughness: 0.78,
    metalness: 0.05,
    costCoins: 5,
    initialCount: 24,
  },
  {
    id: 'piedra',
    name: 'Piedra Tallada',
    role: 'Muros, bases y torres sólidas',
    color: '#7c8594',
    roughness: 0.85,
    metalness: 0.08,
    costCoins: 6,
    initialCount: 20,
  },
  {
    id: 'puente',
    name: 'Tablón de Puente',
    role: 'Pasarelas y rampas seguras',
    color: '#c28f5c',
    roughness: 0.68,
    metalness: 0.05,
    costCoins: 8,
    initialCount: 16,
  },
  {
    id: 'circuito',
    name: 'Placa Circuito',
    role: 'Módulos lógicos conductores',
    color: '#1f7a8c',
    emissive: '#0ea5e9',
    roughness: 0.35,
    metalness: 0.65,
    costCoins: 12,
    initialCount: 10,
  },
  {
    id: 'cristal',
    name: 'Cristal Lógico',
    role: 'Núcleos translúcidos luminosos',
    color: '#38bdf8',
    emissive: '#0284c7',
    roughness: 0.15,
    metalness: 0.2,
    costCoins: 15,
    initialCount: 8,
  },
  {
    id: 'engranaje',
    name: 'Bloque Mecánico',
    role: 'Mecanismos y contrapesos',
    color: '#d97706',
    roughness: 0.32,
    metalness: 0.78,
    costCoins: 14,
    initialCount: 8,
  },
  {
    id: 'acero',
    name: 'Acero Estructural',
    role: 'Vigas de alta resistencia',
    color: '#475569',
    roughness: 0.28,
    metalness: 0.85,
    costCoins: 16,
    initialCount: 8,
  },
  {
    id: 'energia',
    name: 'Cubo Cuántico',
    role: 'Nodos avanzados de energía',
    color: '#10b981',
    emissive: '#059669',
    roughness: 0.2,
    metalness: 0.45,
    costCoins: 20,
    initialCount: 6,
  },
];

export const BLOCK_MATERIAL_MAP: Record<BlockMaterialId, BlockMaterialDef> =
  BLOCK_MATERIALS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<BlockMaterialId, BlockMaterialDef>
  );

export const ABILITIES: AbilityDefinition[] = [
  {
    id: 'salto_impulsado',
    name: 'Salto Impulsado',
    description: 'Aumenta un 30% la potencia de salto para alcanzar plataformas altas.',
    unlockLevel: 2,
    costCoins: 40,
  },
  {
    id: 'carrera_veloz',
    name: 'Paso Cinético',
    description: 'Incrementa la velocidad base de desplazamiento y sprint en un 25%.',
    unlockLevel: 3,
    costCoins: 60,
  },
  {
    id: 'vision_logica',
    name: 'Visión Analítica',
    description: 'Desbloquea una pista adicional gratuita en cada desafío lógico.',
    unlockLevel: 4,
    costCoins: 80,
  },
  {
    id: 'iman_cristales',
    name: 'Imán de Cristales',
    description: 'Duplica el alcance de recolección automática de cristales cercanos.',
    unlockLevel: 5,
    costCoins: 95,
  },
  {
    id: 'constructor_maestro',
    name: 'Constructor Eficiente',
    description: 'Reduce en 25% el costo de materiales en la tienda del juego.',
    unlockLevel: 6,
    costCoins: 120,
  },
];

export const SHOP_ACCESSORIES: ShopAccessoryItem[] = [
  {
    id: 'mochila',
    name: 'Mochila de Explorador',
    description: 'Mochila táctica con brújula para tus expediciones.',
    costCoins: 25,
  },
  {
    id: 'visor',
    name: 'Visor Óptico',
    description: 'Lentes de análisis espacial de alta precisión.',
    costCoins: 45,
  },
  {
    id: 'capa',
    name: 'Capa del Arquitecto',
    description: 'Capa ceremonial para constructores destacados.',
    costCoins: 70,
  },
  {
    id: 'corona',
    name: 'Diadema Lógica',
    description: 'Corona geométrica de los maestros de Logic World.',
    costCoins: 110,
  },
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'primera_chispa',
    title: 'Primera Chispa',
    description: 'Completa tu primera misión en Logic World.',
    medal: 'bronce',
    xpBonus: 50,
  },
  {
    id: 'aprendiz_logico',
    title: 'Mente Analítica',
    description: 'Completa 10 misiones de cualquier tipo.',
    medal: 'bronce',
    xpBonus: 120,
  },
  {
    id: 'arquitecto_novato',
    title: 'Primeros Cimientos',
    description: 'Coloca al menos 15 bloques en el modo de construcción 3D.',
    medal: 'bronce',
    xpBonus: 80,
  },
  {
    id: 'coleccionista',
    title: 'Buscador de Cristales',
    description: 'Recoge 10 cristales de energía repartidos por los mundos.',
    medal: 'plata',
    xpBonus: 150,
  },
  {
    id: 'maestro_naturaleza',
    title: 'Guardián del Valle',
    description: 'Completa al menos 12 misiones en el Mundo de la Naturaleza.',
    medal: 'plata',
    xpBonus: 200,
  },
  {
    id: 'ingeniero_circuitos',
    title: 'Arquitecto Digital',
    description: 'Supera 8 misiones de circuitos o algoritmos.',
    medal: 'plata',
    xpBonus: 180,
  },
  {
    id: 'constructor_experto',
    title: 'Maestro Constructor',
    description: 'Coloca 40 o más bloques creando tus propias estructuras.',
    medal: 'oro',
    xpBonus: 250,
  },
  {
    id: 'explorador_mundos',
    title: 'Viajero Dimensional',
    description: 'Completa misiones en los 5 mundos de Logic World.',
    medal: 'oro',
    xpBonus: 350,
  },
  {
    id: 'gran_sabio',
    title: 'Mente Brillante',
    description: 'Alcanza el nivel 8 y supera 50 misiones en total.',
    medal: 'platino',
    xpBonus: 600,
  },
];

export const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  name: 'Alex',
  bodyStyle: 'explorador',
  faceStyle: 'sonriente',
  hairStyle: 'corto',
  outfitStyle: 'aventurero',
  primaryColor: '#2563eb',
  secondaryColor: '#f59e0b',
  skinColor: '#f1c29b',
  hairColor: '#3b2618',
  accessory: 'mochila',
};

export function createInitialSaveState(): SaveGameState {
  const inventory = BLOCK_MATERIALS.reduce(
    (acc, mat) => {
      acc[mat.id] = mat.initialCount;
      return acc;
    },
    {} as Record<BlockMaterialId, number>
  );

  return {
    version: 1,
    playerName: 'Alex',
    currentWorldId: 'naturaleza',
    xp: 0,
    coins: 60,
    completedMissionIds: [],
    collectedIds: [],
    unlockedAbilities: [],
    unlockedAccessories: ['ninguno', 'mochila'],
    unlockedAchievements: [],
    inventory,
    placedBlocks: [],
    customization: { ...DEFAULT_CUSTOMIZATION },
    settings: {
      soundEnabled: true,
      volume: 0.65,
      touchControlsMode: 'auto',
      cameraSensitivity: 1,
    },
    trackedMissionId: 'nat_01',
    playerPositionsByWorld: {
      naturaleza: { x: 0, y: 0.6, z: 10 },
      tecnologico: { x: 0, y: 0.6, z: 10 },
      construccion: { x: 0, y: 0.6, z: 10 },
      misterio: { x: 0, y: 0.6, z: 10 },
      futurista: { x: 0, y: 0.6, z: 10 },
    },
    lastSavedAt: new Date().toISOString(),
  };
}

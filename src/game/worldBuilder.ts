import * as THREE from 'three';
import { MISSIONS } from '../data/missions';
import { getStaticWorldColliders, groundHeightAt } from './rules';
import { createGroundTexture, createNoiseBumpTexture } from './textures';
import type {
  CharacterCustomization,
  NpcDefinition,
  WorldDefinition,
} from '../types/game';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

export interface WorldVisualRefs {
  group: THREE.Group;
  animatedParts: { mesh: THREE.Object3D; speed: number; axis: 'y' | 'x' | 'bob'; baseY: number }[];
  collectibleMeshes: Map<string, THREE.Group>;
  missionBeacons: Map<string, { group: THREE.Group; crystal: THREE.Mesh; ring: THREE.Mesh }>;
  npcGroups: Map<string, THREE.Group>;
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] };
}

export function buildCharacterGroup(
  custom: CharacterCustomization,
  shadowDiscTex: THREE.Texture
): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: custom.primaryColor,
    roughness: 0.55,
    metalness: 0.12,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: custom.secondaryColor,
    roughness: 0.35,
    metalness: 0.35,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: custom.skinColor,
    roughness: 0.68,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: custom.hairColor,
    roughness: 0.82,
    metalness: 0.05,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.72,
    metalness: 0.15,
  });

  // Ground contact shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.55, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowDiscTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const isRobotBody = custom.bodyStyle === 'robot';
  const torsoW =
    custom.bodyStyle === 'titan'
      ? 0.66
      : custom.bodyStyle === 'arquitecto'
        ? 0.58
        : custom.bodyStyle === 'ingeniera'
          ? 0.45
          : 0.52;
  const torsoH = custom.bodyStyle === 'titan' ? 0.68 : 0.62;
  const torsoD = custom.bodyStyle === 'titan' ? 0.38 : 0.32;
  const torsoCenterY = 0.55 + torsoH / 2;

  const torsoMat = isRobotBody
    ? new THREE.MeshStandardMaterial({ color: custom.primaryColor, roughness: 0.25, metalness: 0.78 })
    : primaryMat;

  // Torso + belt/collar trim
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, torsoD), torsoMat);
  torsoMesh.position.y = torsoCenterY;
  torsoMesh.castShadow = true;
  bodyPivot.add(torsoMesh);

  if (isRobotBody) {
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), coreMat);
    core.position.set(0, torsoCenterY + 0.04, torsoD / 2 + 0.03);
    bodyPivot.add(core);
  }

  const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(torsoW + 0.03, 0.1, torsoD + 0.03), secondaryMat);
  beltMesh.position.y = 0.6;
  bodyPivot.add(beltMesh);

  if (custom.outfitStyle === 'cientifico') {
    const labCoat = new THREE.Mesh(
      new THREE.BoxGeometry(torsoW + 0.04, torsoH * 0.85, torsoD + 0.02),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.65 })
    );
    labCoat.position.set(0, torsoCenterY - 0.03, -0.01);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.45, 0.2, torsoD + 0.05), secondaryMat);
    badge.position.set(0, torsoCenterY + 0.08, 0.01);
    bodyPivot.add(labCoat, badge);
  } else if (custom.outfitStyle === 'constructor') {
    const strapGeo = new THREE.BoxGeometry(0.09, torsoH + 0.02, torsoD + 0.04);
    const strapL = new THREE.Mesh(strapGeo, secondaryMat);
    strapL.position.set(-torsoW * 0.26, torsoCenterY, 0);
    const strapR = new THREE.Mesh(strapGeo, secondaryMat);
    strapR.position.set(torsoW * 0.26, torsoCenterY, 0);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.05), secondaryMat);
    pocket.position.set(0, torsoCenterY - 0.06, torsoD / 2 + 0.02);
    bodyPivot.add(strapL, strapR, pocket);
  } else if (custom.outfitStyle === 'guardian') {
    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(torsoW * 0.72, 0.3, torsoD + 0.06),
      secondaryMat
    );
    chestPlate.position.set(0, torsoCenterY + 0.08, 0.01);
    const pauldronGeo = new THREE.BoxGeometry(0.2, 0.16, torsoD + 0.04);
    const pauldronL = new THREE.Mesh(pauldronGeo, secondaryMat);
    pauldronL.position.set(-(torsoW / 2 + 0.06), torsoCenterY + torsoH * 0.38, 0);
    const pauldronR = new THREE.Mesh(pauldronGeo, secondaryMat);
    pauldronR.position.set(torsoW / 2 + 0.06, torsoCenterY + torsoH * 0.38, 0);
    bodyPivot.add(chestPlate, pauldronL, pauldronR);
  } else if (custom.outfitStyle === 'espacial') {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.27, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.3, metalness: 0.5 })
    );
    collar.position.set(0, torsoCenterY + torsoH / 2 + 0.03, 0);
    const lifePack = new THREE.Mesh(
      new THREE.BoxGeometry(torsoW * 0.7, 0.44, 0.14),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.35, metalness: 0.4 })
    );
    lifePack.position.set(0, torsoCenterY + 0.04, -(torsoD / 2 + 0.07));
    bodyPivot.add(collar, lifePack);
  } else if (custom.outfitStyle === 'mago') {
    const tunic = new THREE.Mesh(new THREE.CylinderGeometry(torsoW * 0.56, torsoW * 0.72, 0.32, 8), primaryMat);
    tunic.position.set(0, 0.46, 0);
    const runeMat = new THREE.MeshStandardMaterial({
      color: custom.secondaryColor,
      emissive: custom.secondaryColor,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    });
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), runeMat);
    rune.position.set(0, torsoCenterY + 0.08, torsoD / 2 + 0.03);
    bodyPivot.add(tunic, rune);
  } else if (custom.outfitStyle === 'ciberpunk') {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(torsoW + 0.06, 0.14, torsoD + 0.06), darkMat);
    collar.position.set(0, torsoCenterY + torsoH / 2 - 0.02, -0.02);
    const neonMat = new THREE.MeshStandardMaterial({
      color: custom.secondaryColor,
      emissive: custom.secondaryColor,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.06, torsoH * 0.8, 0.04), neonMat);
    stripL.position.set(-torsoW * 0.28, torsoCenterY, torsoD / 2 + 0.02);
    const stripR = stripL.clone();
    stripR.position.x = torsoW * 0.28;
    bodyPivot.add(collar, stripL, stripR);
  }

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, torsoCenterY + torsoH / 2 + 0.22, 0);
  bodyPivot.add(headGroup);

  const headMat = isRobotBody
    ? new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.25, metalness: 0.75 })
    : skinMat;
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), headMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Eyes & expression (character faces +Z in local space)
  const eyeGeo = new THREE.BoxGeometry(0.065, 0.065, 0.04);
  const eyeL = new THREE.Mesh(eyeGeo, darkMat);
  eyeL.position.set(-0.1, 0.03, 0.22);
  const eyeR = new THREE.Mesh(eyeGeo, darkMat);
  eyeR.position.set(0.1, 0.03, 0.22);

  if (custom.faceStyle === 'sonriente') {
    headGroup.add(eyeL, eyeR);
    const smile = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.03), darkMat);
    smile.position.set(0, -0.09, 0.22);
    headGroup.add(smile);
  } else if (custom.faceStyle === 'gafas') {
    headGroup.add(eyeL, eyeR);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.2, metalness: 0.7 });
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.05), frameMat);
    glasses.position.set(0, 0.03, 0.23);
    headGroup.add(glasses);
  } else if (custom.faceStyle === 'asombrado') {
    const bigEyeGeo = new THREE.BoxGeometry(0.085, 0.095, 0.04);
    const bigL = new THREE.Mesh(bigEyeGeo, darkMat);
    bigL.position.set(-0.1, 0.04, 0.22);
    const bigR = new THREE.Mesh(bigEyeGeo, darkMat);
    bigR.position.set(0.1, 0.04, 0.22);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), darkMat);
    mouth.position.set(0, -0.1, 0.22);
    headGroup.add(bigL, bigR, mouth);
  } else if (custom.faceStyle === 'cibernetico') {
    const cyberMat = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#06b6d4',
      emissiveIntensity: 0.8,
      roughness: 0.15,
    });
    const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.05), cyberMat);
    scanner.position.set(0.1, 0.03, 0.225);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), darkMat);
    plate.position.set(0, -0.09, 0.22);
    headGroup.add(eyeL, scanner, plate);
  } else if (custom.faceStyle === 'guino') {
    const winkR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.04), darkMat);
    winkR.position.set(0.1, 0.03, 0.22);
    const smirk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), darkMat);
    smirk.position.set(0.02, -0.09, 0.22);
    smirk.rotation.z = 0.14;
    headGroup.add(eyeL, winkR, smirk);
  } else {
    headGroup.add(eyeL, eyeR);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.04), darkMat);
    brow.position.set(0, 0.1, 0.225);
    headGroup.add(brow);
  }

  // Hair / Headwear styles
  if (custom.hairStyle === 'corto') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.15, 0.47), hairMat);
    cap.position.set(0, 0.2, -0.01);
    headGroup.add(cap);
  } else if (custom.hairStyle === 'largo') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), hairMat);
    top.position.set(0, 0.2, -0.01);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.14), hairMat);
    back.position.set(0, -0.02, -0.2);
    headGroup.add(top, back);
  } else if (custom.hairStyle === 'cresta') {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.44), hairMat);
    crest.position.set(0, 0.26, -0.02);
    headGroup.add(crest);
  } else if (custom.hairStyle === 'casco') {
    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.22, 12), secondaryMat);
    helmet.position.set(0, 0.18, 0);
    headGroup.add(helmet);
  } else if (custom.hairStyle === 'coletas') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.14, 0.47), hairMat);
    top.position.set(0, 0.2, -0.01);
    const bunGeo = new THREE.BoxGeometry(0.14, 0.28, 0.16);
    const bunL = new THREE.Mesh(bunGeo, hairMat);
    bunL.position.set(-0.27, 0.08, -0.05);
    const bunR = new THREE.Mesh(bunGeo, hairMat);
    bunR.position.set(0.27, 0.08, -0.05);
    headGroup.add(top, bunL, bunR);
  } else if (custom.hairStyle === 'rizado') {
    const puffTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.52), hairMat);
    puffTop.position.set(0, 0.22, -0.02);
    const puffSide = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.34), hairMat);
    puffSide.position.set(0, 0.1, -0.1);
    headGroup.add(puffTop, puffSide);
  } else if (custom.hairStyle === 'capucha') {
    const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.52), primaryMat);
    hoodTop.position.set(0, 0.22, -0.01);
    const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.18), primaryMat);
    hoodBack.position.set(0, 0.0, -0.19);
    const hoodL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.46), primaryMat);
    hoodL.position.set(-0.24, 0.02, -0.02);
    const hoodR = hoodL.clone();
    hoodR.position.x = 0.24;
    headGroup.add(hoodTop, hoodBack, hoodL, hoodR);
  } else if (custom.hairStyle === 'antena') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10), secondaryMat);
    cap.position.set(0, 0.24, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 6), darkMat);
    stem.position.set(0, 0.38, 0);
    const tip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.75 })
    );
    tip.position.set(0, 0.52, 0);
    headGroup.add(cap, stem, tip);
  }

  // Accessories
  if (custom.accessory === 'mochila') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.18), secondaryMat);
    pack.position.set(0, torsoCenterY + 0.02, -(torsoD / 2 + 0.09));
    pack.castShadow = true;
    bodyPivot.add(pack);
  } else if (custom.accessory === 'capa') {
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.05), secondaryMat);
    cape.position.set(0, torsoCenterY - 0.1, -(torsoD / 2 + 0.05));
    cape.rotation.x = 0.12;
    bodyPivot.add(cape);
  } else if (custom.accessory === 'visor') {
    const visorMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.4,
    });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.12), visorMat);
    visor.position.set(0, 0.03, 0.22);
    headGroup.add(visor);
  } else if (custom.accessory === 'corona') {
    const crownMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.2, metalness: 0.85 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 6), crownMat);
    crown.position.set(0, 0.32, 0);
    headGroup.add(crown);
  }

  // Arms
  const handMat = isRobotBody ? secondaryMat : skinMat;
  const armW = custom.bodyStyle === 'titan' ? 0.2 : 0.16;
  const leftArm = new THREE.Group();
  leftArm.position.set(-(torsoW / 2 + armW / 2 + 0.02), torsoCenterY + torsoH / 2 - 0.05, 0);
  const armGeo = new THREE.BoxGeometry(armW, 0.52, 0.18);
  const lArmMesh = new THREE.Mesh(armGeo, torsoMat);
  lArmMesh.position.y = -0.22;
  lArmMesh.castShadow = true;
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(armW * 0.88, 0.12, 0.15), handMat);
  lHand.position.y = -0.5;
  leftArm.add(lArmMesh, lHand);
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(torsoW / 2 + armW / 2 + 0.02, torsoCenterY + torsoH / 2 - 0.05, 0);
  const rArmMesh = new THREE.Mesh(armGeo, torsoMat);
  rArmMesh.position.y = -0.22;
  rArmMesh.castShadow = true;
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(armW * 0.88, 0.12, 0.15), handMat);
  rHand.position.y = -0.5;
  rightArm.add(rArmMesh, rHand);
  bodyPivot.add(rightArm);

  // Legs
  const legSpread = custom.bodyStyle === 'titan' ? 0.17 : 0.14;
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-legSpread, 0.54, 0);
  const legGeo = new THREE.BoxGeometry(0.19, 0.46, 0.21);
  const lLegMesh = new THREE.Mesh(legGeo, darkMat);
  lLegMesh.position.y = -0.23;
  lLegMesh.castShadow = true;
  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.26), secondaryMat);
  lBoot.position.set(0, -0.49, 0.02);
  leftLeg.add(lLegMesh, lBoot);
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(legSpread, 0.54, 0);
  const rLegMesh = new THREE.Mesh(legGeo, darkMat);
  rLegMesh.position.y = -0.23;
  rLegMesh.castShadow = true;
  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.26), secondaryMat);
  rBoot.position.set(0, -0.49, 0.02);
  rightLeg.add(rLegMesh, rBoot);
  bodyPivot.add(rightLeg);

  return { root, bodyPivot, headGroup, leftArm, rightArm, leftLeg, rightLeg };
}

export function buildNpcGroup(npc: NpcDefinition, shadowDiscTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const yGround = groundHeightAt(npc.worldId, npc.position.x, npc.position.z);
  group.position.set(npc.position.x, yGround, npc.position.z);

  const mainMat = new THREE.MeshStandardMaterial({ color: npc.color, roughness: 0.48, metalness: npc.isRobot ? 0.72 : 0.15 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: npc.accentColor,
    emissive: npc.isRobot ? npc.accentColor : '#000000',
    emissiveIntensity: npc.isRobot ? 0.35 : 0,
    roughness: 0.28,
    metalness: 0.5,
  });

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 20),
    new THREE.MeshBasicMaterial({ map: shadowDiscTex, transparent: true, opacity: 0.5, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Pedestal/legs + torso + head
  if (npc.isRobot) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.45, 12), mainMat);
    base.position.y = 0.24;
    base.castShadow = true;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.65, 0.42), mainMat);
    body.position.y = 0.82;
    body.castShadow = true;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), accentMat);
    core.position.set(0, 0.84, 0.22);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.38), mainMat);
    head.position.y = 1.38;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.05), accentMat);
    visor.position.set(0, 1.38, 0.19);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6), accentMat);
    antenna.position.y = 1.66;
    group.add(base, body, core, head, visor, antenna);
  } else {
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.26), new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.75 }));
    legs.position.y = 0.28;
    legs.castShadow = true;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.64, 0.32), mainMat);
    torso.position.y = 0.88;
    torso.castShadow = true;
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.34), accentMat);
    sash.position.y = 0.65;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ color: '#eab68d', roughness: 0.65 }));
    head.position.y = 1.42;
    head.castShadow = true;
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.16, 10), accentMat);
    hat.position.y = 1.68;
    group.add(legs, torso, sash, head, hat);
  }

  // Floating indicator above NPC
  const indicator = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.MeshStandardMaterial({
      color: npc.accentColor,
      emissive: npc.accentColor,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    })
  );
  indicator.position.y = 2.25;
  indicator.name = 'npc_indicator';
  group.add(indicator);

  return group;
}

export function buildWorldEnvironment(
  world: WorldDefinition,
  completedMissions: string[],
  collectedIds: string[],
  shadowDiscTex: THREE.Texture,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): WorldVisualRefs {
  const group = new THREE.Group();
  const animatedParts: WorldVisualRefs['animatedParts'] = [];
  const collectibleMeshes = new Map<string, THREE.Group>();
  const missionBeacons = new Map<string, { group: THREE.Group; crystal: THREE.Mesh; ring: THREE.Mesh }>();
  const npcGroups = new Map<string, THREE.Group>();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // 1. Displaced Terrain (150m x 150m extending past playable area)
  const groundTex = createGroundTexture(world.id, world.groundColor, world.groundAccentColor, maxAnisotropy);
  const bumpTex = createNoiseBumpTexture(maxAnisotropy);
  textures.push(groundTex, bumpTex);

  const terrainGeo = trackGeo(new THREE.PlaneGeometry(155, 155, 76, 76));
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(world.id, x, z));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: groundTex,
      bumpMap: bumpTex,
      bumpScale: 0.08,
      roughness: 0.88,
      metalness: world.id === 'futurista' || world.id === 'tecnologico' ? 0.14 : 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  group.add(terrainMesh);

  // Subtle Plaza Pad at spawn (offset >= 0.02m on Y to prevent Z-fighting)
  const plazaGeo = trackGeo(new THREE.CylinderGeometry(8.5, 9.0, 0.12, 32));
  const plazaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: world.groundAccentColor,
      roughness: 0.65,
      metalness: 0.15,
    })
  );
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(0, -0.02, 4);
  plaza.receiveShadow = !isSoftwareGl;
  group.add(plaza);

  // 2. Biome-specific Composite Landmarks (3–12 parts each) & Natural Perimeter
  const rockMat = trackMat(new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.9, metalness: 0.05 }));
  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: world.accentColor,
      emissive: world.accentColor,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.4,
    })
  );
  const steelMat = trackMat(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3, metalness: 0.82 }));
  const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: '#948878', roughness: 0.86, metalness: 0.06 }));

  // Outer perimeter rock formations (InstancedMesh) so outdoor world never ends in a void
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(2.6, 0));
  const rockCount = 44;
  const perimeterRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2;
    const rad = 58 + (i % 3) * 4;
    const rx = Math.cos(angle) * rad;
    const rz = Math.sin(angle) * rad;
    const ry = groundHeightAt(world.id, rx, rz);
    const s = 0.85 + (i % 4) * 0.25;
    dummy.position.set(rx, ry + s * 0.6, rz);
    dummy.rotation.set((i % 5) * 0.3, angle, 0);
    dummy.scale.set(s * 1.3, s * (1.2 + (i % 3) * 0.4), s * 1.1);
    dummy.updateMatrix();
    perimeterRocks.setMatrixAt(i, dummy.matrix);
    rockColor.set(world.groundAccentColor).lerp(new THREE.Color('#475569'), 0.45 + (i % 3) * 0.12);
    perimeterRocks.setColorAt(i, rockColor);
  }
  perimeterRocks.computeBoundingSphere();
  group.add(perimeterRocks);

  if (world.id === 'naturaleza') {
    // Tall Crystal Monolith Landmark at (0, -18)
    const monolith = new THREE.Group();
    monolith.position.set(0, groundHeightAt('naturaleza', 0, -18), -18);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.4, 2.9, 0.8, 8)), stoneMat);
    base.position.y = 0.4;
    const pillar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.1, 1.5, 5.2, 6)), rockMat);
    pillar.position.y = 3.2;
    pillar.castShadow = true;
    const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.4, 0.18, 8, 24)), accentMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 5.4;
    const topCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(1.15, 0)), accentMat);
    topCrystal.position.y = 7.2;
    monolith.add(base, pillar, collar, topCrystal);
    group.add(monolith);
    animatedParts.push({ mesh: topCrystal, speed: 0.9, axis: 'y', baseY: 7.2 });

    // Flowing River plane on east side
    const riverGeo = trackGeo(new THREE.PlaneGeometry(7.2, 110, 12, 32));
    riverGeo.rotateX(-Math.PI / 2);
    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const z = rPos.getZ(i);
      rPos.setX(i, rPos.getX(i) + 14 + Math.sin(z * 0.12) * 3);
    }
    const riverMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: world.waterColor,
        roughness: 0.12,
        metalness: 0.35,
        transparent: true,
        opacity: 0.84,
      })
    );
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.y = -0.32;
    group.add(river);

    // Wooden Bridge near (13.5, -4) grounded into riverbanks & riverbed
    const woodMat = trackMat(new THREE.MeshStandardMaterial({ color: '#9a653a', roughness: 0.78 }));
    const darkWoodMat = trackMat(new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.84 }));
    const bridge = new THREE.Group();
    bridge.position.set(13.5, 0.06, -4);
    const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.8, 0.3, 2.8)), woodMat);
    const railL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.8, 0.14, 0.14)), woodMat);
    railL.position.set(0, 0.72, -1.28);
    const railR = railL.clone();
    railR.position.z = 1.28;
    bridge.add(deck, railL, railR);
    const postGeo = trackGeo(new THREE.BoxGeometry(0.2, 1.55, 0.2));
    for (const px of [-3.3, 0, 3.3]) {
      for (const pz of [-1.28, 1.28]) {
        const post = new THREE.Mesh(postGeo, darkWoodMat);
        post.position.set(px, 0.02, pz);
        bridge.add(post);
      }
    }
    group.add(bridge);

    // Cave archway at (-26, 12)
    const cave = new THREE.Group();
    cave.position.set(-26, groundHeightAt('naturaleza', -26, 12), 12);
    const archL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 4.2, 3.6)), rockMat);
    archL.position.set(-2.3, 2.0, 0);
    const archR = archL.clone();
    archR.position.x = 2.3;
    const archTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 1.8, 3.8)), rockMat);
    archTop.position.set(0, 4.6, 0);
    cave.add(archL, archR, archTop);
    group.add(cave);

    // Instanced Multi-tier Pine Trees (trunk + 2 foliage cones)
    const treeCount = 52;
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.42, 2.4, 7));
    const foliageLowerGeo = trackGeo(new THREE.ConeGeometry(1.75, 2.8, 8));
    const foliageUpperGeo = trackGeo(new THREE.ConeGeometry(1.25, 2.4, 8));
    const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.85 }));
    const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72 }));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const leavesLower = new THREE.InstancedMesh(foliageLowerGeo, leafMat, treeCount);
    const leavesUpper = new THREE.InstancedMesh(foliageUpperGeo, leafMat, treeCount);
    const leafCol = new THREE.Color();

    let placedTrees = 0;
    for (let i = 0; i < 140 && placedTrees < treeCount; i++) {
      const ang = i * 2.39996;
      const rad = 17 + (i % 10) * 3.8;
      const tx = Math.cos(ang) * rad;
      const tz = Math.sin(ang) * rad;
      if (Math.abs(tx - (14 + Math.sin(tz * 0.12) * 3)) < 5.4) continue; // keep river clear
      if (Math.hypot(tx, tz + 18) < 6.5) continue; // keep monolith clear
      if (tz > 4 && Math.abs(tx) < 11) continue; // keep spawn plaza & third-person camera clear
      const ty = groundHeightAt('naturaleza', tx, tz);
      const sc = 0.85 + (i % 5) * 0.08;
      dummy.position.set(tx, ty + 1.1 * sc, tz);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      trunks.setMatrixAt(placedTrees, dummy.matrix);

      dummy.position.set(tx, ty + 2.85 * sc, tz);
      dummy.updateMatrix();
      leavesLower.setMatrixAt(placedTrees, dummy.matrix);

      dummy.position.set(tx, ty + 4.3 * sc, tz);
      dummy.updateMatrix();
      leavesUpper.setMatrixAt(placedTrees, dummy.matrix);

      leafCol.set(i % 2 === 0 ? '#276d3b' : '#33884c').offsetHSL(0, 0, ((i % 3) - 1) * 0.04);
      leavesLower.setColorAt(placedTrees, leafCol);
      leavesUpper.setColorAt(placedTrees, leafCol.clone().offsetHSL(0, 0, 0.04));
      placedTrees++;
    }
    trunks.count = placedTrees;
    leavesLower.count = placedTrees;
    leavesUpper.count = placedTrees;
    trunks.computeBoundingSphere();
    leavesLower.computeBoundingSphere();
    leavesUpper.computeBoundingSphere();
    group.add(trunks, leavesLower, leavesUpper);
  } else if (world.id === 'tecnologico') {
    // Energy Reactor Tower at (0, -18)
    const tower = new THREE.Group();
    tower.position.set(0, 0, -18);
    const pad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.2, 3.6, 0.6, 8)), steelMat);
    pad.position.y = 0.3;
    const coreCol = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.1, 1.4, 6.4, 12)), steelMat);
    coreCol.position.y = 3.5;
    const ring1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.1, 0.18, 10, 28)), accentMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 4.2;
    const dish = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.6, 1.1, 12)), accentMat);
    dish.position.y = 7.4;
    dish.rotation.x = Math.PI;
    tower.add(pad, coreCol, ring1, dish);
    group.add(tower);
    animatedParts.push({ mesh: ring1, speed: 1.1, axis: 'y', baseY: 4.2 });

    // Lab Dome & Conduit Pillars
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(3.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.65 }))
    );
    dome.position.set(22, 0, -22);
    group.add(dome);

    const conduitGeo = trackGeo(new THREE.BoxGeometry(0.9, 3.8, 0.9));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const cx = Math.cos(ang) * 28;
      const cz = Math.sin(ang) * 28;
      const cy = groundHeightAt('tecnologico', cx, cz);
      const pylon = new THREE.Mesh(conduitGeo, steelMat);
      pylon.position.set(cx, cy + 1.9, cz);
      const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.35, 1.1)), accentMat);
      cap.position.set(cx, cy + 3.9, cz);
      group.add(pylon, cap);
    }
  } else if (world.id === 'construccion') {
    // Tall Construction Crane at (0, -18)
    const crane = new THREE.Group();
    crane.position.set(0, 0, -18);
    const yellowMat = trackMat(new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.35, metalness: 0.55 }));
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.8, 3.4)), steelMat);
    base.position.y = 0.4;
    const mast = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 9.2, 1.3)), yellowMat);
    mast.position.y = 5.0;
    const jib = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(10.5, 0.7, 0.9)), yellowMat);
    jib.position.set(2.4, 9.6, 0);
    const counter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.0, 1.1, 1.3)), steelMat);
    counter.position.set(-2.5, 9.5, 0);
    const cable = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6)), steelMat);
    cable.position.set(5.8, 7.8, 0);
    const load = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 1.1, 1.1)), accentMat);
    load.position.set(5.8, 5.8, 0);
    crane.add(base, mast, jib, counter, cable, load);
    group.add(crane);
    animatedParts.push({ mesh: load, speed: 1.2, axis: 'bob', baseY: 5.8 });

    // Modular city blocks & archways
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.4;
      const bx = Math.cos(ang) * 26;
      const bz = Math.sin(ang) * 26;
      const by = groundHeightAt('construccion', bx, bz);
      const h = 3.5 + (i % 3) * 1.8;
      const bldg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, h, 3.6)), steelMat);
      bldg.position.set(bx, by + h / 2, bz);
      const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 0.35, 3.8)), yellowMat);
      roof.position.set(bx, by + h + 0.18, bz);
      group.add(bldg, roof);
    }
  } else if (world.id === 'misterio') {
    // Stepped Temple Pyramid at (0, -18)
    const temple = new THREE.Group();
    temple.position.set(0, 0, -18);
    const step1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(14, 0.9, 14)), stoneMat);
    step1.position.y = 0.45;
    const step2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.6, 0.9, 9.6)), stoneMat);
    step2.position.y = 1.35;
    const step3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, 2.4, 5.2)), stoneMat);
    step3.position.y = 3.0;
    const altarGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(1.0, 0)), accentMat);
    altarGem.position.y = 5.4;
    temple.add(step1, step2, step3, altarGem);
    group.add(temple);
    animatedParts.push({ mesh: altarGem, speed: 1.0, axis: 'y', baseY: 5.4 });

    // Stone Labyrinth Walls aligned with getStaticWorldColliders('misterio')
    for (const c of getStaticWorldColliders('misterio')) {
      const w = c.maxX - c.minX;
      const d = c.maxZ - c.minZ;
      const h = 3.2;
      const wall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), stoneMat);
      wall.position.set((c.minX + c.maxX) / 2, h / 2 - 0.1, (c.minZ + c.maxZ) / 2);
      group.add(wall);
    }

    // Rune Obelisks
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const ox = Math.cos(ang) * 28;
      const oz = Math.sin(ang) * 28;
      const oy = groundHeightAt('misterio', ox, oz);
      const ob = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.85, 4.5, 4)), stoneMat);
      ob.position.set(ox, oy + 2.25, oz);
      const tip = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.45)), accentMat);
      tip.position.set(ox, oy + 4.9, oz);
      group.add(ob, tip);
    }
  } else {
    // Futurista: Orbital Quantum Spire at (0, -18)
    const spire = new THREE.Group();
    spire.position.set(0, 0, -18);
    const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.5, 4.2, 0.7, 12)), steelMat);
    plinth.position.y = 0.35;
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.85, 1.5, 8.5, 12)), steelMat);
    shaft.position.y = 4.6;
    const ringA = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.6, 0.16, 10, 32)), accentMat);
    ringA.position.y = 6.2;
    const ringB = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.9, 0.14, 10, 32)), accentMat);
    ringB.position.y = 6.2;
    ringB.rotation.x = Math.PI / 3;
    const core = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.95, 0)), accentMat);
    core.position.y = 6.2;
    spire.add(plinth, shaft, ringA, ringB, core);
    group.add(spire);
    animatedParts.push({ mesh: ringA, speed: 1.0, axis: 'y', baseY: 6.2 });
    animatedParts.push({ mesh: ringB, speed: -1.4, axis: 'x', baseY: 6.2 });

    // Geodesic Glass Domes around perimeter
    const glassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        roughness: 0.15,
        metalness: 0.3,
        transparent: true,
        opacity: 0.45,
      })
    );
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const gx = Math.cos(ang) * 28;
      const gz = Math.sin(ang) * 28;
      const gy = groundHeightAt('futurista', gx, gz);
      const gDome = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(3.2, 1)), glassMat);
      gDome.position.set(gx, gy + 1.0, gz);
      group.add(gDome);
    }
  }

  // 3. NPCs
  for (const npc of world.npcs) {
    const npcGroup = buildNpcGroup(npc, shadowDiscTex);
    npcGroups.set(npc.id, npcGroup);
    group.add(npcGroup);
    const ind = npcGroup.getObjectByName('npc_indicator');
    if (ind) animatedParts.push({ mesh: ind, speed: 1.8, axis: 'bob', baseY: 2.25 });
  }

  // 4. Collectible Crystals
  const orbGeo = trackGeo(new THREE.OctahedronGeometry(0.45, 0));
  for (const col of world.collectibles) {
    if (collectedIds.includes(col.id)) continue;
    const cGroup = new THREE.Group();
    const gy = groundHeightAt(world.id, col.position.x, col.position.z);
    cGroup.position.set(col.position.x, gy, col.position.z);

    const cMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: col.color,
        emissive: col.color,
        emissiveIntensity: 0.55,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    const orb = new THREE.Mesh(orbGeo, cMat);
    orb.position.y = 1.1;
    const shadow = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.45, 16)),
      trackMat(new THREE.MeshBasicMaterial({ map: shadowDiscTex, transparent: true, opacity: 0.45, depthWrite: false }))
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    cGroup.add(orb, shadow);
    group.add(cGroup);
    collectibleMeshes.set(col.id, cGroup);
    animatedParts.push({ mesh: orb, speed: 2.0, axis: 'bob', baseY: 1.1 });
  }

  // 5. Mission Beacons (24 missions per world)
  const completedSet = new Set(completedMissions);
  const pedGeo = trackGeo(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 12));
  const beaconCrystalGeo = trackGeo(new THREE.OctahedronGeometry(0.38, 0));
  const pedMat = trackMat(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.5 }));

  for (const m of MISSIONS) {
    if (m.worldId !== world.id) continue;
    const done = completedSet.has(m.id);
    const bGroup = new THREE.Group();
    const gy = groundHeightAt(world.id, m.location.x, m.location.z);
    bGroup.position.set(m.location.x, gy, m.location.z);

    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = 0.125;

    const beaconColor = done ? '#10b981' : m.mechanic === 'world-build' ? '#f59e0b' : '#38bdf8';
    const cMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: beaconColor,
        emissive: beaconColor,
        emissiveIntensity: done ? 0.25 : 0.7,
        roughness: 0.2,
        metalness: 0.35,
      })
    );
    const crystal = new THREE.Mesh(beaconCrystalGeo, cMat);
    crystal.position.y = 1.35;

    const ringRadius = m.buildTarget ? m.buildTarget.radius : 1.05;
    const ringGeo = trackGeo(new THREE.RingGeometry(ringRadius - 0.14, ringRadius, 32));
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: beaconColor,
        transparent: true,
        opacity: done ? 0.2 : 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.04;

    bGroup.add(ped, crystal, ring);
    group.add(bGroup);
    missionBeacons.set(m.id, { group: bGroup, crystal, ring });
    animatedParts.push({ mesh: crystal, speed: 1.6, axis: 'bob', baseY: 1.35 });
  }

  return {
    group,
    animatedParts,
    collectibleMeshes,
    missionBeacons,
    npcGroups,
    disposables: { geometries, materials, textures },
  };
}

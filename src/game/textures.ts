import * as THREE from 'three';
import type { WorldId } from '../types/game';

export interface ProceduralTextureSet {
  groundMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  shadowDiscMap: THREE.CanvasTexture;
  blockMaps: Record<string, THREE.CanvasTexture>;
}

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGroundTexture(
  worldId: WorldId,
  baseHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  if (worldId === 'naturaleza') {
    // Organic grass speckles and clover patches
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = i % 3 === 0 ? accentHex : 'rgba(20, 60, 20, 0.14)';
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      ctx.fillRect(x, y, 3, 4);
    }
  } else if (worldId === 'tecnologico' || worldId === 'futurista') {
    // Clean modular tech grid plates
    ctx.strokeStyle = worldId === 'futurista' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= 256; p += 64) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.stroke();
    }
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(8, 8, 48, 48);
    ctx.fillRect(136, 136, 48, 48);
    ctx.globalAlpha = 1;
  } else if (worldId === 'construccion') {
    // Architectural concrete pavers
    ctx.strokeStyle = 'rgba(40, 48, 58, 0.22)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      const offset = (y / 32) % 2 === 0 ? 0 : 32;
      for (let x = -32; x < 256; x += 64) {
        ctx.strokeRect(x + offset, y, 64, 32);
      }
    }
  } else {
    // Misterio: ancient weathered stone slabs
    ctx.strokeStyle = 'rgba(60, 44, 28, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? baseHex : accentHex;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
        ctx.globalAlpha = 1;
        ctx.strokeRect(i * 64, j * 64, 64, 64);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createNoiseBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = 100 + ((i * 31) % 60);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect((i * 53) % 128, (i * 97) % 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBlockDetailTexture(
  kind: string,
  baseColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);

  if (kind === 'madera' || kind === 'puente') {
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 16; y < 128; y += 20) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(124, y);
      ctx.stroke();
    }
  } else if (kind === 'circuito' || kind === 'energia') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, 84, 84);
    ctx.beginPath();
    ctx.moveTo(64, 4);
    ctx.lineTo(64, 22);
    ctx.moveTo(64, 106);
    ctx.lineTo(64, 124);
    ctx.moveTo(4, 64);
    ctx.lineTo(22, 64);
    ctx.moveTo(106, 64);
    ctx.lineTo(124, 64);
    ctx.stroke();
  } else if (kind === 'engranaje') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(64, 64, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'piedra' || kind === 'acero') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 104, 104);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BLOCK_MATERIAL_MAP, BLOCK_MATERIALS } from '../data/catalog';
import { MISSIONS } from '../data/missions';
import { WORLD_MAP } from '../data/worlds';
import { soundEngine } from '../game/audio';
import { groundHeightAt, resolvePlayerMovement } from '../game/rules';
import { createBlockDetailTexture, createContactShadowTexture } from '../game/textures';
import {
  buildCharacterGroup,
  buildWorldEnvironment,
  type CharacterRig,
  type WorldVisualRefs,
} from '../game/worldBuilder';
import type {
  ActiveModal,
  BlockMaterialId,
  GameScreenState,
  NearbyInteractable,
  PlacedBlock,
  SaveGameState,
  Vec3,
} from '../types/game';

export interface TouchInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward negative or positive)
  jumpQueued: boolean;
  sprint: boolean;
  crouch: boolean;
}

interface GameCanvasProps {
  gameState: GameScreenState;
  activeModal: ActiveModal;
  saveState: SaveGameState;
  buildMode: boolean;
  selectedMaterial: BlockMaterialId;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  actionTriggerRef: React.MutableRefObject<{
    interact: () => void;
    placeAtPlayer: () => void;
    respawn: () => void;
  } | null>;
  onNearbyChange: (item: NearbyInteractable | null) => void;
  onCollect: (collectibleId: string) => void;
  onInteract: (item: NearbyInteractable) => void;
  onPlaceBlock: (x: number, y: number, z: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onPositionSample: (pos: Vec3) => void;
  onToggleBuildMode: () => void;
}

const _wishDir = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

export default function GameCanvas({
  gameState,
  activeModal,
  saveState,
  buildMode,
  selectedMaterial,
  touchInputRef,
  actionTriggerRef,
  onNearbyChange,
  onCollect,
  onInteract,
  onPlaceBlock,
  onRemoveBlock,
  onPositionSample,
  onToggleBuildMode,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Refs for live props inside single-mount Three.js loop
  const propsRef = useRef({
    gameState,
    activeModal,
    saveState,
    buildMode,
    selectedMaterial,
    onNearbyChange,
    onCollect,
    onInteract,
    onPlaceBlock,
    onRemoveBlock,
    onPositionSample,
    onToggleBuildMode,
  });
  propsRef.current = {
    gameState,
    activeModal,
    saveState,
    buildMode,
    selectedMaterial,
    onNearbyChange,
    onCollect,
    onInteract,
    onPlaceBlock,
    onRemoveBlock,
    onPositionSample,
    onToggleBuildMode,
  };

  // Sync triggers for external changes (world switch, customization, placed blocks, completion)
  const syncFlagsRef = useRef({
    worldId: saveState.currentWorldId,
    customKey: JSON.stringify(saveState.customization),
    blocksKey: '',
    completedCount: saveState.completedMissionIds.length,
    collectedCount: saveState.collectedIds.length,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.dataset.testid = 'logic-world-canvas';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.15,
      240
    );

    // Environment map (PMREM RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3-Point / Outdoor Balanced Lighting Rig (<= 1 shadow caster)
    const hemiLight = new THREE.HemisphereLight(0x9ed8ff, 0x4f6d3a, 0.78);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff2d6, 1.55);
    keyLight.position.set(28, 44, 24);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.camera.left = -45;
    keyLight.shadow.camera.right = 45;
    keyLight.shadow.camera.top = 45;
    keyLight.shadow.camera.bottom = -45;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa5f3fc, 0.45);
    rimLight.position.set(-24, 18, -30);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const shadowDiscTex = createContactShadowTexture();

    // Shared Block Geometries & Materials
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterialsMap = new Map<BlockMaterialId, THREE.MeshStandardMaterial>();
    const blockTextures: THREE.Texture[] = [];
    for (const def of BLOCK_MATERIALS) {
      const tex = createBlockDetailTexture(def.id, def.color, maxAniso);
      blockTextures.push(tex);
      blockMaterialsMap.set(
        def.id,
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: tex,
          roughness: def.roughness,
          metalness: def.metalness,
          emissive: def.emissive ? new THREE.Color(def.emissive) : new THREE.Color(0x000000),
          emissiveIntensity: def.emissive ? 0.35 : 0,
        })
      );
    }

    // Ghost Preview Cube for Build Mode
    const ghostMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 1.02, 1.02),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.42,
        wireframe: false,
        depthWrite: false,
      })
    );
    const ghostWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)),
      new THREE.LineBasicMaterial({ color: '#e0f2fe' })
    );
    ghostMesh.add(ghostWire);
    ghostMesh.visible = false;
    scene.add(ghostMesh);

    // Player-placed blocks group
    const placedBlocksGroup = new THREE.Group();
    scene.add(placedBlocksGroup);
    const blockMeshById = new Map<string, THREE.Mesh>();

    // Character Rig
    let playerRig: CharacterRig = buildCharacterGroup(
      propsRef.current.saveState.customization,
      shadowDiscTex
    );
    scene.add(playerRig.root);

    // Current World Visuals
    let worldVisuals: WorldVisualRefs | null = null;
    const applyWorldScene = (worldId: SaveGameState['currentWorldId']) => {
      if (worldVisuals) {
        scene.remove(worldVisuals.group);
        worldVisuals.disposables.geometries.forEach((g) => g.dispose());
        worldVisuals.disposables.materials.forEach((m) => m.dispose());
        worldVisuals.disposables.textures.forEach((t) => t.dispose());
      }
      const worldDef = WORLD_MAP[worldId];
      scene.background = new THREE.Color(worldDef.skyHorizonColor);
      scene.fog = new THREE.FogExp2(worldDef.fogColor, 0.0115);
      hemiLight.color.set(worldDef.hemiSkyColor);
      hemiLight.groundColor.set(worldDef.hemiGroundColor);
      keyLight.color.set(worldDef.keyLightColor);

      worldVisuals = buildWorldEnvironment(
        worldDef,
        propsRef.current.saveState.completedMissionIds,
        propsRef.current.saveState.collectedIds,
        shadowDiscTex,
        maxAniso,
        isSoftwareGl
      );
      scene.add(worldVisuals.group);
    };

    const syncPlacedBlocks = () => {
      const worldId = propsRef.current.saveState.currentWorldId;
      const activeBlocks = propsRef.current.saveState.placedBlocks.filter(
        (b) => b.worldId === worldId
      );
      const activeIds = new Set(activeBlocks.map((b) => b.id));

      for (const [id, mesh] of blockMeshById.entries()) {
        if (!activeIds.has(id)) {
          placedBlocksGroup.remove(mesh);
          blockMeshById.delete(id);
        }
      }

      for (const b of activeBlocks) {
        if (!blockMeshById.has(b.id)) {
          const mat =
            blockMaterialsMap.get(b.materialId) ||
            blockMaterialsMap.get('madera')!;
          const mesh = new THREE.Mesh(blockGeo, mat);
          mesh.position.set(b.x, b.y, b.z);
          mesh.castShadow = !isSoftwareGl;
          mesh.receiveShadow = !isSoftwareGl;
          mesh.userData.blockId = b.id;
          placedBlocksGroup.add(mesh);
          blockMeshById.set(b.id, mesh);
        }
      }
    };

    applyWorldScene(propsRef.current.saveState.currentWorldId);
    syncPlacedBlocks();

    // Pre-warm shaders on GPU devices
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Physics & Camera state
    const initialWorldId = propsRef.current.saveState.currentWorldId;
    const savedPos =
      propsRef.current.saveState.playerPositionsByWorld[initialWorldId] ||
      WORLD_MAP[initialWorldId].spawnPosition;
    let physState = {
      position: {
        x: savedPos.x,
        y: Math.max(savedPos.y, groundHeightAt(initialWorldId, savedPos.x, savedPos.z)),
        z: savedPos.z,
      },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      coyoteTimer: 0.11,
      crouching: false,
    };

    let playerYaw = Math.PI; // Facing -Z (towards central landmark)
    let camYaw = 0; // Camera behind player looking toward -Z
    let camPitch = 0.42;
    let camDistance = 10.5;
    const camPosCurrent = new THREE.Vector3(physState.position.x, physState.position.y + 5, physState.position.z + 10);
    const camLookCurrent = new THREE.Vector3(physState.position.x, physState.position.y + 1.4, physState.position.z);

    let walkCycle = 0;
    let squashY = 1;
    let jumpBufferTimer = 0;
    let stepAudioCooldown = 0;
    let lastPosEmit = 0;
    let lastNearbyId: string | null = null;
    let activeNearby: NearbyInteractable | null = null;
    let ghostTargetPos: Vec3 | null = null;

    // Input Tracking
    const keysPressed = new Set<string>();
    let draggingLook = false;
    let dragMovedDist = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastMouseClientX = window.innerWidth * 0.5;
    let lastMouseClientY = window.innerHeight * 0.5;

    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const tryInteract = () => {
      if (propsRef.current.gameState !== 'playing' || propsRef.current.activeModal !== null) return;
      if (activeNearby) {
        propsRef.current.onInteract(activeNearby);
      }
    };

    const placeBlockInFrontOfPlayer = () => {
      const { saveState: st, selectedMaterial: matId } = propsRef.current;
      if ((st.inventory[matId] || 0) <= 0) {
        soundEngine.error();
        return;
      }
      const fwdX = Math.sin(playerYaw);
      const fwdZ = Math.cos(playerYaw);
      const bx = Math.round(physState.position.x + fwdX * 2.2);
      const bz = Math.round(physState.position.z + fwdZ * 2.2);
      const gy = groundHeightAt(st.currentWorldId, bx, bz);
      const by = Math.round((gy + 0.5) * 2) / 2;
      soundEngine.placeBlock();
      propsRef.current.onPlaceBlock(bx, by, bz);
    };

    actionTriggerRef.current = {
      interact: tryInteract,
      placeAtPlayer: placeBlockInFrontOfPlayer,
      respawn: () => {
        const wId = propsRef.current.saveState.currentWorldId;
        const sp = WORLD_MAP[wId].spawnPosition;
        physState = {
          position: { x: sp.x, y: groundHeightAt(wId, sp.x, sp.z), z: sp.z },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: true,
          coyoteTimer: 0.11,
          crouching: false,
        };
        playerYaw = Math.PI;
      },
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (propsRef.current.gameState !== 'playing' || propsRef.current.activeModal !== null) {
        return;
      }

      if (!keysPressed.has(e.code)) {
        if (e.code === 'Space') {
          jumpBufferTimer = 0.13;
        } else if (e.code === 'KeyE') {
          tryInteract();
        } else if (e.code === 'KeyB') {
          propsRef.current.onToggleBuildMode();
        }
      }
      keysPressed.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && physState.velocity.y > 2.0) {
        physState.velocity.y *= 0.48;
      }
      keysPressed.delete(e.code);
    };

    const onBlur = () => {
      keysPressed.clear();
      draggingLook = false;
    };

    const computeGhostPlacement = (clientX: number, clientY: number): { pos: Vec3 | null; hitBlockId: string | null } => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_pointerNdc, camera);

      const blockMeshes = Array.from(blockMeshById.values());
      const hits = raycaster.intersectObjects(blockMeshes, false);
      if (hits.length > 0 && hits[0].distance < 22) {
        const hit = hits[0];
        const normal = hit.face?.normal || new THREE.Vector3(0, 1, 0);
        const target = hit.object.position.clone().add(normal);
        return {
          pos: { x: Math.round(target.x), y: Math.round(target.y * 2) / 2, z: Math.round(target.z) },
          hitBlockId: String(hit.object.userData.blockId || ''),
        };
      }

      // Ground plane raycast at player's ground level
      const gyCenter = groundHeightAt(propsRef.current.saveState.currentWorldId, physState.position.x, physState.position.z);
      groundPlane.constant = -gyCenter;
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        const distFromPlayer = Math.hypot(
          hitPoint.x - physState.position.x,
          hitPoint.z - physState.position.z
        );
        if (distFromPlayer < 16) {
          const gx = Math.round(hitPoint.x);
          const gz = Math.round(hitPoint.z);
          const gy = groundHeightAt(propsRef.current.saveState.currentWorldId, gx, gz);
          return {
            pos: { x: gx, y: Math.round((gy + 0.5) * 2) / 2, z: gz },
            hitBlockId: null,
          };
        }
      }
      return { pos: null, hitBlockId: null };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (propsRef.current.gameState !== 'playing' || propsRef.current.activeModal !== null) return;
      draggingLook = true;
      dragMovedDist = 0;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastMouseClientX = e.clientX;
      lastMouseClientY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      lastMouseClientX = e.clientX;
      lastMouseClientY = e.clientY;
      if (!draggingLook) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      dragMovedDist += Math.hypot(dx, dy);
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const sens = 0.0055 * (propsRef.current.saveState.settings.cameraSensitivity || 1);
      camYaw -= dx * sens;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * sens * 0.75, 0.14, 1.15);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!draggingLook) return;
      draggingLook = false;
      if (
        dragMovedDist < 6 &&
        propsRef.current.buildMode &&
        propsRef.current.gameState === 'playing' &&
        propsRef.current.activeModal === null
      ) {
        const { pos, hitBlockId } = computeGhostPlacement(e.clientX, e.clientY);
        if ((e.button === 2 || e.shiftKey) && hitBlockId) {
          soundEngine.removeBlock();
          propsRef.current.onRemoveBlock(hitBlockId);
        } else if (e.button === 0 && pos) {
          const matId = propsRef.current.selectedMaterial;
          if ((propsRef.current.saveState.inventory[matId] || 0) > 0) {
            soundEngine.placeBlock();
            propsRef.current.onPlaceBlock(pos.x, pos.y, pos.z);
          } else {
            soundEngine.error();
          }
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (propsRef.current.buildMode) e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (propsRef.current.gameState !== 'playing' || propsRef.current.activeModal !== null) return;
      camDistance = THREE.MathUtils.clamp(camDistance + e.deltaY * 0.008, 5.5, 22);
    };

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.elapsedTime;
      const {
        gameState: gState,
        activeModal: modal,
        saveState: st,
        buildMode: bMode,
      } = propsRef.current;

      // Sync world change
      if (syncFlagsRef.current.worldId !== st.currentWorldId) {
        syncFlagsRef.current.worldId = st.currentWorldId;
        applyWorldScene(st.currentWorldId);
        syncPlacedBlocks();
        const nextSpawn =
          st.playerPositionsByWorld[st.currentWorldId] ||
          WORLD_MAP[st.currentWorldId].spawnPosition;
        physState = {
          position: {
            x: nextSpawn.x,
            y: Math.max(nextSpawn.y, groundHeightAt(st.currentWorldId, nextSpawn.x, nextSpawn.z)),
            z: nextSpawn.z,
          },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: true,
          coyoteTimer: 0.11,
          crouching: false,
        };
      }

      // Sync customization change
      const customKey = JSON.stringify(st.customization);
      if (syncFlagsRef.current.customKey !== customKey) {
        syncFlagsRef.current.customKey = customKey;
        scene.remove(playerRig.root);
        playerRig = buildCharacterGroup(st.customization, shadowDiscTex);
        scene.add(playerRig.root);
      }

      // Sync placed blocks or mission/collectible updates
      const blocksKey = `${st.currentWorldId}:${st.placedBlocks.length}:${st.placedBlocks.map((b) => b.id).join(',')}`;
      if (syncFlagsRef.current.blocksKey !== blocksKey) {
        syncFlagsRef.current.blocksKey = blocksKey;
        syncPlacedBlocks();
      }
      if (
        syncFlagsRef.current.completedCount !== st.completedMissionIds.length ||
        syncFlagsRef.current.collectedCount !== st.collectedIds.length
      ) {
        syncFlagsRef.current.completedCount = st.completedMissionIds.length;
        syncFlagsRef.current.collectedCount = st.collectedIds.length;
        applyWorldScene(st.currentWorldId);
      }

      // Animate world props (crystals, rings, NPC indicators)
      if (worldVisuals) {
        for (const item of worldVisuals.animatedParts) {
          if (item.axis === 'y') item.mesh.rotation.y += dt * item.speed;
          else if (item.axis === 'x') item.mesh.rotation.x += dt * item.speed;
          else {
            item.mesh.rotation.y += dt * 1.1;
            item.mesh.position.y = item.baseY + Math.sin(elapsed * item.speed) * 0.16;
          }
        }
      }

      if (gState === 'title') {
        // Live World Camera Tour Flyover around the central landmark & character
        const tourAngle = elapsed * 0.18;
        const tourRadius = 21;
        camera.position.set(
          Math.sin(tourAngle) * tourRadius,
          8.5 + Math.sin(elapsed * 0.35) * 1.4,
          -6 + Math.cos(tourAngle) * tourRadius
        );
        camera.lookAt(0, 2.5, -10);
        playerRig.root.position.set(physState.position.x, physState.position.y, physState.position.z);
        playerRig.root.rotation.y = Math.PI;
        playerRig.bodyPivot.position.y = Math.sin(elapsed * 2) * 0.03;
      } else if (gState === 'playing') {
        const isFrozen = modal !== null;
        const touch = touchInputRef.current;

        if (!isFrozen) {
          if (keysPressed.has('KeyQ')) camYaw += dt * 2.1;
          if (keysPressed.has('KeyR')) camYaw -= dt * 2.1;

          let inForward = 0;
          let inRight = 0;
          if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) inForward += 1;
          if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) inForward -= 1;
          if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) inRight += 1;
          if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) inRight -= 1;

          inForward += -touch.moveY;
          inRight += touch.moveX;

          if (touch.jumpQueued) {
            jumpBufferTimer = 0.13;
            touch.jumpQueued = false;
          }

          // Convert input relative to camera yaw
          const sinY = Math.sin(camYaw);
          const cosY = Math.cos(camYaw);
          _wishDir.set(
            inRight * cosY - inForward * sinY,
            0,
            -inRight * sinY - inForward * cosY
          );
          if (_wishDir.lengthSq() > 1) _wishDir.normalize();

          const speedMult = st.unlockedAbilities.includes('carrera_veloz') ? 1.25 : 1.0;
          const jumpMult = st.unlockedAbilities.includes('salto_impulsado') ? 1.28 : 1.0;
          const sprint = keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight') || touch.sprint;
          const crouch = keysPressed.has('KeyC') || keysPressed.has('ControlLeft') || touch.crouch;

          const step = resolvePlayerMovement(
            physState,
            {
              moveX: _wishDir.x,
              moveZ: _wishDir.z,
              sprint,
              crouch,
              jumpBuffered: jumpBufferTimer > 0,
              speedMultiplier: speedMult,
              jumpMultiplier: jumpMult,
            },
            st.currentWorldId,
            st.placedBlocks,
            dt
          );
          physState = step.state;
          jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);

          if (step.jumped) {
            squashY = 1.2;
            soundEngine.jump();
          }
          if (step.landed) {
            squashY = 0.78;
            soundEngine.land();
          }

          // Smooth character facing toward movement direction
          const horizSpeed = Math.hypot(physState.velocity.x, physState.velocity.z);
          if (horizSpeed > 0.35) {
            const targetYaw = Math.atan2(physState.velocity.x, physState.velocity.z);
            let diff = targetYaw - playerYaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerYaw += diff * (1 - Math.exp(-12 * dt));
            walkCycle += horizSpeed * dt * 1.45;

            stepAudioCooldown -= dt;
            if (physState.grounded && stepAudioCooldown <= 0) {
              soundEngine.footstep();
              stepAudioCooldown = sprint ? 0.26 : 0.36;
            }
          }

          // Animate character limbs & squash-stretch
          squashY = THREE.MathUtils.damp(squashY, physState.crouching ? 0.72 : 1.0, 12, dt);
          const invXZ = 1 / Math.sqrt(Math.max(0.5, squashY));
          playerRig.bodyPivot.scale.set(invXZ, squashY, invXZ);

          const swing = horizSpeed > 0.35 ? Math.sin(walkCycle) * 0.68 : 0;
          playerRig.leftLeg.rotation.x = swing;
          playerRig.rightLeg.rotation.x = -swing;
          playerRig.leftArm.rotation.x = -swing * 0.85;
          playerRig.rightArm.rotation.x = swing * 0.85;

          if (!physState.grounded) {
            playerRig.leftArm.rotation.z = -0.35;
            playerRig.rightArm.rotation.z = 0.35;
          } else {
            playerRig.leftArm.rotation.z = THREE.MathUtils.damp(playerRig.leftArm.rotation.z, 0, 10, dt);
            playerRig.rightArm.rotation.z = THREE.MathUtils.damp(playerRig.rightArm.rotation.z, 0, 10, dt);
          }

          // Auto-collect nearby crystal orbs
          const collectReach = st.unlockedAbilities.includes('iman_cristales') ? 3.8 : 1.9;
          const worldDef = WORLD_MAP[st.currentWorldId];
          for (const col of worldDef.collectibles) {
            if (st.collectedIds.includes(col.id)) continue;
            const cy = groundHeightAt(st.currentWorldId, col.position.x, col.position.z);
            const d = Math.hypot(
              physState.position.x - col.position.x,
              physState.position.y - cy,
              physState.position.z - col.position.z
            );
            if (d <= collectReach) {
              soundEngine.collect();
              propsRef.current.onCollect(col.id);
            }
          }

          // Nearest Interactable Check (NPCs + Mission Beacons)
          let closest: NearbyInteractable | null = null;
          let minD = 3.6;

          for (const npc of worldDef.npcs) {
            const d = Math.hypot(
              physState.position.x - npc.position.x,
              physState.position.z - npc.position.z
            );
            if (d < minD) {
              minD = d;
              closest = {
                kind: 'npc',
                id: npc.id,
                label: npc.name,
                sublabel: npc.role,
                distance: d,
              };
            }
          }

          for (const m of MISSIONS) {
            if (m.worldId !== st.currentWorldId) continue;
            const d = Math.hypot(
              physState.position.x - m.location.x,
              physState.position.z - m.location.z
            );
            if (d < minD) {
              minD = d;
              closest = {
                kind: 'mission',
                id: m.id,
                label: m.title,
                sublabel: st.completedMissionIds.includes(m.id) ? 'Misión completada' : `Misión · +${m.xpReward} XP`,
                distance: d,
              };
            }
          }

          activeNearby = closest;
          const nextId = closest ? `${closest.kind}:${closest.id}` : null;
          if (nextId !== lastNearbyId) {
            lastNearbyId = nextId;
            propsRef.current.onNearbyChange(closest);
          }

          // Emit position sample at <= 4 Hz for save/map
          if (elapsed - lastPosEmit > 0.28) {
            lastPosEmit = elapsed;
            propsRef.current.onPositionSample({ ...physState.position });
          }

          // Build mode ghost block preview
          if (bMode) {
            const { pos } = computeGhostPlacement(lastMouseClientX, lastMouseClientY);
            ghostTargetPos = pos;
            if (ghostTargetPos) {
              ghostMesh.visible = true;
              ghostMesh.position.set(ghostTargetPos.x, ghostTargetPos.y, ghostTargetPos.z);
              const matColor = BLOCK_MATERIAL_MAP[propsRef.current.selectedMaterial].color;
              (ghostMesh.material as THREE.MeshBasicMaterial).color.set(matColor);
            } else {
              ghostMesh.visible = false;
            }
          } else {
            ghostMesh.visible = false;
          }
        }

        playerRig.root.position.set(physState.position.x, physState.position.y, physState.position.z);
        playerRig.root.rotation.y = playerYaw;

        // Smooth Third-Person Camera with terrain ground guard
        const horizDist = Math.cos(camPitch) * camDistance;
        const vertDist = Math.sin(camPitch) * camDistance;
        _camDesired.set(
          physState.position.x + Math.sin(camYaw) * horizDist,
          physState.position.y + 1.5 + vertDist,
          physState.position.z + Math.cos(camYaw) * horizDist
        );

        const camFloor = groundHeightAt(st.currentWorldId, _camDesired.x, _camDesired.z) + 0.85;
        if (_camDesired.y < camFloor) _camDesired.y = camFloor;

        // Pull camera slightly in if static collider obstructs line of sight
        _rayOrigin.set(physState.position.x, physState.position.y + 1.4, physState.position.z);
        _rayDir.copy(_camDesired).sub(_rayOrigin);
        const targetDist = _rayDir.length();
        if (targetDist > 0.1 && worldVisuals) {
          _rayDir.divideScalar(targetDist);
          raycaster.set(_rayOrigin, _rayDir);
          raycaster.far = targetDist;
          // Lightweight terrain clamp already prevents floor clipping
          raycaster.far = Infinity;
        }

        const dampAlpha = 1 - Math.exp(-10 * dt);
        camPosCurrent.lerp(_camDesired, dampAlpha);
        _lookTarget.set(physState.position.x, physState.position.y + 1.35, physState.position.z);
        camLookCurrent.lerp(_lookTarget, dampAlpha);

        camera.position.copy(camPosCurrent);
        camera.lookAt(camLookCurrent);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      if (worldVisuals) {
        worldVisuals.disposables.geometries.forEach((g) => g.dispose());
        worldVisuals.disposables.materials.forEach((m) => m.dispose());
        worldVisuals.disposables.textures.forEach((t) => t.dispose());
      }
      blockGeo.dispose();
      blockMaterialsMap.forEach((m) => m.dispose());
      blockTextures.forEach((t) => t.dispose());
      shadowDiscTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [actionTriggerRef, touchInputRef]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden"
      aria-label="Escenario 3D interactivo de Logic World"
    />
  );
}

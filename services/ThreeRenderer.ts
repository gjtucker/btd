import * as THREE from 'three';
import { GameEngine } from './GameEngine';
import { GameMap, Point } from '../types';
import { BLOON_STATS, CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';

export class ThreeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private bloonMeshes: Map<number, THREE.Group> = new Map();
  private towerMeshes: Map<number, THREE.Group> = new Map();
  private projectileMeshes: Map<number, THREE.Mesh> = new Map();
  private particlePool: THREE.Mesh[] = [];
  private activeParticles: THREE.Group;
  private particleGeo: THREE.SphereGeometry = new THREE.SphereGeometry(1, 4, 4);

  private ground: THREE.Mesh | null = null;
  private pathMesh: THREE.Group | null = null;

  private rangeCircle: THREE.LineLoop | null = null;
  private ghostTower: THREE.Group | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.camera = new THREE.PerspectiveCamera(
      50,
      CANVAS_WIDTH / CANVAS_HEIGHT,
      0.1,
      3000
    );
    // Position camera at an overhead angle to see the whole 800x600 area
    this.camera.position.set(0, 800, 600);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.activeParticles = new THREE.Group();
    this.scene.add(this.activeParticles);

    this.initLighting();
  }

  private initLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 500, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    this.scene.add(directionalLight);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.disposeObject(this.scene);
    this.particleGeo.dispose();
    this.particlePool.forEach(p => {
        p.geometry.dispose();
        if (p.material instanceof THREE.Material) p.material.dispose();
    });
  }

  private to3D(x: number, y: number): THREE.Vector3 {
    // Map (0, 800) x (0, 600) to (-400, 400) x (-300, 300)
    // Z is 0 on the plane, we use Y for vertical if needed but mostly Z is for depth in Three.js default but here we use XZ plane
    return new THREE.Vector3(x - CANVAS_WIDTH / 2, 0, y - CANVAS_HEIGHT / 2);
  }

  public initScene(map: GameMap) {
    // Clear existing environment
    if (this.ground) {
        this.disposeObject(this.ground);
        this.scene.remove(this.ground);
    }
    if (this.pathMesh) {
        this.disposeObject(this.pathMesh);
        this.scene.remove(this.pathMesh);
    }

    // Create ground
    const groundGeo = new THREE.PlaneGeometry(CANVAS_WIDTH, CANVAS_HEIGHT);
    const groundMat = new THREE.MeshStandardMaterial({ color: map.theme.terrainMid });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Create path
    this.pathMesh = new THREE.Group();
    const pathMat = new THREE.MeshStandardMaterial({ color: map.theme.pathMid });

    for (let i = 0; i < map.nodes.length - 1; i++) {
        const start = map.nodes[i];
        const end = map.nodes[i + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy) + 40; // Add width to length to cover corners
        const angle = Math.atan2(dy, dx);

        const segmentGeo = new THREE.PlaneGeometry(length, 40);
        const segment = new THREE.Mesh(segmentGeo, pathMat);

        const centerPos = this.to3D((start.x + end.x) / 2, (start.y + end.y) / 2);
        segment.position.set(centerPos.x, 0.1, centerPos.z); // Slightly above ground
        segment.rotation.x = -Math.PI / 2;
        segment.rotation.z = angle;
        segment.receiveShadow = true;
        this.pathMesh.add(segment);

        // Add a "joint" at each node to smooth corners
        const jointGeo = new THREE.CircleGeometry(20, 16);
        const joint = new THREE.Mesh(jointGeo, pathMat);
        const jointPos = this.to3D(start.x, start.y);
        joint.position.set(jointPos.x, 0.11, jointPos.z);
        joint.rotation.x = -Math.PI / 2;
        this.pathMesh.add(joint);

        if (i === map.nodes.length - 2) {
            const endJoint = new THREE.Mesh(jointGeo, pathMat);
            const endJointPos = this.to3D(end.x, end.y);
            endJoint.position.set(endJointPos.x, 0.11, endJointPos.z);
            endJoint.rotation.x = -Math.PI / 2;
            this.pathMesh.add(endJoint);
        }
    }

    this.scene.add(this.pathMesh);
  }

  private getBloonColor(type: string): number {
    switch (type) {
      case 'Red': return 0xef4444;
      case 'Blue': return 0x3b82f6;
      case 'Green': return 0x22c55e;
      case 'Yellow': return 0xeab308;
      case 'Pink': return 0xec4899;
      case 'Black': return 0x1f2937;
      case 'White': return 0xf3f4f6;
      case 'Lead': return 0x6b7280;
      case 'Zebra': return 0x111827;
      case 'Rainbow': return 0x6366f1;
      case 'Ceramic': return 0xfdba74;
      case 'MOAB': return 0x3b82f6;
      default: return 0xef4444;
    }
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private syncBloons(engine: GameEngine) {
    const currentIds = new Set(engine.bloons.map(b => b.id));

    // Remove old bloons
    for (const [id, mesh] of this.bloonMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.disposeObject(mesh);
        this.bloonMeshes.delete(id);
      }
    }

    // Add or update bloons
    engine.bloons.forEach(b => {
      let group = this.bloonMeshes.get(b.id);
      const stats = BLOON_STATS[b.type];

      if (!group) {
        group = new THREE.Group();

        const color = this.getBloonColor(b.type);
        const bodyGeo = b.type === 'MOAB'
            ? new THREE.SphereGeometry(stats.r, 32, 16)
            : new THREE.SphereGeometry(stats.r, 16, 12);

        const bodyMat = new THREE.MeshStandardMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);

        if (b.type === 'MOAB') {
            body.scale.set(1.5, 1, 1);
        } else {
            body.scale.set(0.85, 1.1, 0.85);

            // Knot
            const knotGeo = new THREE.ConeGeometry(3, 6, 8);
            const knot = new THREE.Mesh(knotGeo, bodyMat);
            knot.position.y = -stats.r;
            knot.rotation.x = Math.PI;
            group.add(knot);
        }

        body.castShadow = true;
        group.add(body);
        this.scene.add(group);
        this.bloonMeshes.set(b.id, group);
      }

      const pos = this.to3D(b.x, b.y);
      group.position.set(pos.x, stats.r + 5, pos.z);

      if (b.type === 'MOAB') {
          const targetNode = engine.getMap().nodes[b.nodeIndex + 1];
          if (targetNode) {
              const dx = targetNode.x - b.x;
              const dy = targetNode.y - b.y;
              group.rotation.y = -Math.atan2(dy, dx);
          }
      }
    });
  }

  private syncTowers(engine: GameEngine) {
    const currentIds = new Set(engine.towers.map(t => t.id));

    // Remove old towers
    for (const [id, mesh] of this.towerMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.disposeObject(mesh);
        this.towerMeshes.delete(id);
      }
    }

    // Add or update towers
    engine.towers.forEach(t => {
      let group = this.towerMeshes.get(t.id);

      if (!group) {
        group = new THREE.Group();

        // Base
        const baseGeo = new THREE.CylinderGeometry(24, 24, 10, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 5;
        base.receiveShadow = true;
        group.add(base);

        // Body
        const bodyGeo = new THREE.CylinderGeometry(20, 20, 30, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: t.config.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 25;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(15, 12, 12);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 45;
        head.castShadow = true;
        group.add(head);

        this.scene.add(group);
        this.towerMeshes.set(t.id, group);
      }

      const pos = this.to3D(t.x, t.y);
      group.position.set(pos.x, 0, pos.z);
    });
  }

  private syncProjectiles(engine: GameEngine) {
    const currentIds = new Set(engine.projectiles.map(p => p.id));

    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.disposeObject(mesh);
        this.projectileMeshes.delete(id);
      }
    }

    engine.projectiles.forEach(p => {
      let mesh = this.projectileMeshes.get(p.id);

      if (!mesh) {
        const geo = p.damageType === 'Explosive'
            ? new THREE.SphereGeometry(6, 8, 8)
            : new THREE.BoxGeometry(4, 4, 12);
        const mat = new THREE.MeshStandardMaterial({ color: p.color });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.projectileMeshes.set(p.id, mesh);
      }

      const pos = this.to3D(p.x, p.y);
      mesh.position.set(pos.x, 25, pos.z);

      if (p.damageType !== 'Explosive') {
          mesh.rotation.y = -Math.atan2(p.vy, p.vx);
      }
    });
  }

  private syncParticles(engine: GameEngine) {
    // Return all active particles to pool
    while(this.activeParticles.children.length > 0) {
        const child = this.activeParticles.children[0] as THREE.Mesh;
        this.activeParticles.remove(child);
        this.particlePool.push(child);
    }

    engine.particles.forEach(p => {
        let mesh = this.particlePool.pop();
        if (!mesh) {
            const mat = new THREE.MeshBasicMaterial({ transparent: true });
            mesh = new THREE.Mesh(this.particleGeo, mat);
        }

        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(p.color);
        mat.opacity = p.life / p.maxLife;

        const pos = this.to3D(p.x, p.y);
        mesh.position.set(pos.x, 25, pos.z);
        mesh.scale.set(p.size, p.size, p.size);
        this.activeParticles.add(mesh);
    });
  }

  private syncUI(engine: GameEngine) {
    // Range Circle
    let rangeTowerPos: THREE.Vector3 | null = null;
    let range: number = 0;

    if (engine.selectedTowerPlacement && engine.hoverPos) {
        rangeTowerPos = this.to3D(engine.hoverPos.x, engine.hoverPos.y);
        range = engine.selectedTowerPlacement.range;

        // Ghost Tower
        if (!this.ghostTower) {
            this.ghostTower = new THREE.Group();
            const geo = new THREE.CylinderGeometry(20, 20, 30, 16);
            const mat = new THREE.MeshStandardMaterial({ color: engine.selectedTowerPlacement.color, transparent: true, opacity: 0.5 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 15;
            this.ghostTower.add(mesh);
            this.scene.add(this.ghostTower);
        }
        this.ghostTower.position.set(rangeTowerPos.x, 0, rangeTowerPos.z);
        this.ghostTower.visible = true;
    } else {
        if (this.ghostTower) this.ghostTower.visible = false;
    }

    if (engine.selectedTowerId) {
        const t = engine.towers.find(tw => tw.id === engine.selectedTowerId);
        if (t) {
            rangeTowerPos = this.to3D(t.x, t.y);
            range = t.dynamicRange;
        }
    }

    if (rangeTowerPos && range > 0) {
        if (!this.rangeCircle) {
            const points = [];
            for (let i = 0; i <= 64; i++) {
                const theta = (i / 64) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
            this.rangeCircle = new THREE.LineLoop(geo, mat);
            this.scene.add(this.rangeCircle);
        }
        this.rangeCircle.position.set(rangeTowerPos.x, 0.2, rangeTowerPos.z);
        this.rangeCircle.scale.set(range, 1, range);
        this.rangeCircle.visible = true;
    } else {
        if (this.rangeCircle) this.rangeCircle.visible = false;
    }
  }

  public render(engine: GameEngine) {
    this.syncBloons(engine);
    this.syncTowers(engine);
    this.syncProjectiles(engine);
    this.syncParticles(engine);
    this.syncUI(engine);
    this.renderer.render(this.scene, this.camera);
  }
}

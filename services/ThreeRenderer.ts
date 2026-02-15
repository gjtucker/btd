import { GameEngine } from './GameEngine';
import { BLOON_STATS, CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { GameMap } from '../types';

type GroundPoint = { x: number; y: number };

export class ThreeRenderer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentMap: GameMap | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = '100%';
    this.canvas.style.height = 'auto';
    this.canvas.style.display = 'block';

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to initialize renderer canvas');
    }

    this.ctx = context;
    this.container.appendChild(this.canvas);
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public dispose() {
    if (this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
  }

  public initScene(map: GameMap) {
    this.currentMap = map;
  }

  private project(x: number, y: number, height = 0): GroundPoint {
    const horizon = 80;
    const tilt = 0.62;
    const screenY = y * tilt + horizon - height;
    return { x, y: screenY };
  }

  private drawMap(map: GameMap) {
    this.ctx.fillStyle = map.theme.terrainEnd;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const top = this.project(0, 0).y;
    const bottom = this.project(0, CANVAS_HEIGHT).y;
    const gradient = this.ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, map.theme.terrainStart);
    gradient.addColorStop(0.45, map.theme.terrainMid);
    gradient.addColorStop(1, map.theme.terrainEnd);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, top, CANVAS_WIDTH, bottom - top);

    const projectedNodes = map.nodes.map((node) => this.project(node.x, node.y));

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.strokeStyle = '#00000055';
    this.ctx.lineWidth = 50;
    this.ctx.beginPath();
    this.ctx.moveTo(projectedNodes[0].x, projectedNodes[0].y + 6);
    for (let i = 1; i < projectedNodes.length; i++) {
      this.ctx.lineTo(projectedNodes[i].x, projectedNodes[i].y + 6);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = map.theme.pathBorder;
    this.ctx.lineWidth = 42;
    this.ctx.beginPath();
    this.ctx.moveTo(projectedNodes[0].x, projectedNodes[0].y);
    for (let i = 1; i < projectedNodes.length; i++) {
      this.ctx.lineTo(projectedNodes[i].x, projectedNodes[i].y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = map.theme.pathStart;
    this.ctx.lineWidth = 22;
    this.ctx.beginPath();
    this.ctx.moveTo(projectedNodes[0].x, projectedNodes[0].y - 1);
    for (let i = 1; i < projectedNodes.length; i++) {
      this.ctx.lineTo(projectedNodes[i].x, projectedNodes[i].y - 1);
    }
    this.ctx.stroke();
  }

  private drawPlacementRange(engine: GameEngine) {
    if (!engine.selectedTowerPlacement || !engine.hoverPos) return;

    const center = this.project(engine.hoverPos.x, engine.hoverPos.y);

    this.ctx.strokeStyle = '#ffffffbb';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y, engine.selectedTowerPlacement.range, engine.selectedTowerPlacement.range * 0.62, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = `${engine.selectedTowerPlacement.color}88`;
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y - 10, 18, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSelectionRange(engine: GameEngine) {
    if (!engine.selectedTowerId) return;
    const tower = engine.towers.find((candidate) => candidate.id === engine.selectedTowerId);
    if (!tower) return;

    const center = this.project(tower.x, tower.y);
    this.ctx.strokeStyle = '#ffffffaa';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y, tower.dynamicRange, tower.dynamicRange * 0.62, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawTower(x: number, y: number, color: string) {
    const base = this.project(x, y);

    this.ctx.fillStyle = '#00000055';
    this.ctx.beginPath();
    this.ctx.ellipse(base.x + 5, base.y + 8, 26, 14, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.ellipse(base.x, base.y - 8, 24, 11, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(base.x, base.y - 28, 18, 14, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.ellipse(base.x + 8, base.y - 36, 6, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawBloon(x: number, y: number, type: string) {
    const stats = BLOON_STATS[type as keyof typeof BLOON_STATS];
    const body = this.project(x, y, 20);
    const shadow = this.project(x, y);

    this.ctx.fillStyle = '#00000066';
    this.ctx.beginPath();
    this.ctx.ellipse(shadow.x + 4, shadow.y + 5, stats.r, stats.r * 0.45, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = this.getBloonColor(type);
    this.ctx.beginPath();
    if (type === 'MOAB') {
      this.ctx.ellipse(body.x, body.y, stats.r * 1.8, stats.r * 0.9, 0, 0, Math.PI * 2);
    } else {
      this.ctx.ellipse(body.x, body.y, stats.r * 0.95, stats.r * 1.25, 0, 0, Math.PI * 2);
    }
    this.ctx.fill();

    if (type !== 'MOAB') {
      this.ctx.fillStyle = '#111827';
      this.ctx.beginPath();
      this.ctx.moveTo(body.x - 3, body.y + stats.r * 0.95);
      this.ctx.lineTo(body.x, body.y + stats.r + 9);
      this.ctx.lineTo(body.x + 3, body.y + stats.r * 0.95);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawProjectile(x: number, y: number, color: string, explosive: boolean) {
    const p = this.project(x, y, explosive ? 14 : 20);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(p.x, p.y, explosive ? 7 : 4, explosive ? 5 : 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawParticle(x: number, y: number, size: number, color: string, alpha: number) {
    const p = this.project(x, y, 18);
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  private getBloonColor(type: string): string {
    switch (type) {
      case 'Blue': return '#3b82f6';
      case 'Green': return '#22c55e';
      case 'Yellow': return '#eab308';
      case 'Pink': return '#ec4899';
      case 'Black': return '#1f2937';
      case 'White': return '#f3f4f6';
      case 'Lead': return '#6b7280';
      case 'Zebra': return '#111827';
      case 'Rainbow': return '#6366f1';
      case 'Ceramic': return '#fdba74';
      case 'MOAB': return '#3b82f6';
      default: return '#ef4444';
    }
  }

  public render(engine: GameEngine) {
    const map = this.currentMap ?? engine.getMap();
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawMap(map);
    this.drawPlacementRange(engine);
    this.drawSelectionRange(engine);

    const drawQueue: Array<{ depth: number; draw: () => void }> = [];

    engine.towers.forEach((tower) => {
      drawQueue.push({ depth: tower.y, draw: () => this.drawTower(tower.x, tower.y, tower.config.color) });
    });

    engine.bloons.forEach((bloon) => {
      drawQueue.push({ depth: bloon.y, draw: () => this.drawBloon(bloon.x, bloon.y, bloon.type) });
    });

    engine.projectiles.forEach((projectile) => {
      drawQueue.push({ depth: projectile.y, draw: () => this.drawProjectile(projectile.x, projectile.y, projectile.color, projectile.damageType === 'Explosive') });
    });

    drawQueue.sort((a, b) => a.depth - b.depth).forEach((item) => item.draw());

    engine.particles.forEach((particle) => {
      this.drawParticle(particle.x, particle.y, particle.size, particle.color, Math.max(0, particle.life / particle.maxLife));
    });
  }
}

import { GameEngine } from './GameEngine';
import { BLOON_STATS, CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { GameMap } from '../types';

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
      throw new Error('Failed to initialize canvas renderer');
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

  private drawMap(map: GameMap) {
    this.ctx.fillStyle = map.theme.terrainMid;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.strokeStyle = map.theme.pathMid;
    this.ctx.lineWidth = 40;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(map.nodes[0].x, map.nodes[0].y);

    for (let i = 1; i < map.nodes.length; i++) {
      this.ctx.lineTo(map.nodes[i].x, map.nodes[i].y);
    }

    this.ctx.stroke();
  }

  private drawBloons(engine: GameEngine) {
    engine.bloons.forEach((bloon) => {
      const stats = BLOON_STATS[bloon.type];

      this.ctx.save();
      this.ctx.translate(bloon.x, bloon.y);

      if (bloon.type === 'MOAB') {
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, stats.r * 1.8, stats.r * 1.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = this.getBloonColor(bloon.type);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, stats.r * 0.9, stats.r * 1.1, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#111827';
        this.ctx.beginPath();
        this.ctx.moveTo(-3, stats.r * 0.7);
        this.ctx.lineTo(0, stats.r + 7);
        this.ctx.lineTo(3, stats.r * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  private drawTowers(engine: GameEngine) {
    engine.towers.forEach((tower) => {
      this.ctx.fillStyle = '#1e293b';
      this.ctx.beginPath();
      this.ctx.arc(tower.x, tower.y, 22, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = tower.config.color;
      this.ctx.beginPath();
      this.ctx.arc(tower.x, tower.y, 16, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#0f172a';
      this.ctx.beginPath();
      this.ctx.arc(tower.x + 8, tower.y - 8, 6, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawProjectiles(engine: GameEngine) {
    engine.projectiles.forEach((projectile) => {
      this.ctx.fillStyle = projectile.color;
      this.ctx.beginPath();
      this.ctx.arc(projectile.x, projectile.y, projectile.damageType === 'Explosive' ? 6 : 4, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawParticles(engine: GameEngine) {
    engine.particles.forEach((particle) => {
      this.ctx.globalAlpha = Math.max(particle.life / particle.maxLife, 0);
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  private drawRangeUi(engine: GameEngine) {
    if (engine.selectedTowerPlacement && engine.hoverPos) {
      this.ctx.globalAlpha = 0.25;
      this.ctx.fillStyle = engine.selectedTowerPlacement.color;
      this.ctx.beginPath();
      this.ctx.arc(engine.hoverPos.x, engine.hoverPos.y, 16, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 6]);
      this.ctx.beginPath();
      this.ctx.arc(engine.hoverPos.x, engine.hoverPos.y, engine.selectedTowerPlacement.range, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      return;
    }

    if (engine.selectedTowerId) {
      const selected = engine.towers.find((tower) => tower.id === engine.selectedTowerId);
      if (!selected) return;

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.globalAlpha = 0.6;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(selected.x, selected.y, selected.dynamicRange, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
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
      default: return '#ef4444';
    }
  }

  public render(engine: GameEngine) {
    const map = this.currentMap ?? engine.getMap();
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawMap(map);
    this.drawRangeUi(engine);
    this.drawTowers(engine);
    this.drawBloons(engine);
    this.drawProjectiles(engine);
    this.drawParticles(engine);
  }
}

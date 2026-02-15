import { BLOON_STATS, DIFFICULTY_PRESETS, PATH_NODES, WAVES, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { BloonColor, BloonLayer, DamageType, DifficultyPreset, GameDifficulty, Point, TargetStrategy, TowerConfig, Upgrade, WaveGroup } from '../types';

interface Bloon {
  id: number;
  type: BloonColor;
  x: number;
  y: number;
  nodeIndex: number;
  distanceTraveled: number;
  health: number;
  frozen: number;
  glued: number;
  onFire: number;
}

interface Tower {
  id: number;
  x: number;
  y: number;
  config: TowerConfig;
  cooldownTimer: number; // seconds until next shot
  strategy: TargetStrategy;
  totalDamageDealt: number;
  currentUpgrades: number;
  dynamicRange: number;
  dynamicDamage: number;
  dynamicCooldown: number;
  dynamicPierce: number;
  dynamicProjectileSpeed: number;
  dynamicIncome: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  lifespan: number; // seconds remaining
  damageType: DamageType;
  hitBloons: Set<number>;
  color: string;
  sourceTowerId: number;
  isExplosive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number; // seconds remaining
  maxLife: number; // seconds total
  size: number;
}

const SIMULATION_FPS = 60;
const MIN_EVENT_SPACING_SECONDS = 0.0001;

export class GameEngine {
  bloons: Bloon[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];

  money: number = 650;
  lives: number = 100;
  round: number = 1;
  isRoundActive: boolean = false;
  isGameOver: boolean = false;

  hoverPos: Point | null = null;
  selectedTowerPlacement: TowerConfig | null = null;
  selectedTowerId: number | null = null;

  private bloonIdCounter = 0;
  private projectileIdCounter = 0;
  private waveGroupIndex = 0;
  private waveCountRemaining = 0;
  private waveTimer = 0;
  private difficulty: GameDifficulty = GameDifficulty.Medium;
  private difficultyPreset: DifficultyPreset = DIFFICULTY_PRESETS[GameDifficulty.Medium];
  
  onStateChange: () => void = () => {};

  constructor(onStateChange: () => void, difficulty: GameDifficulty = GameDifficulty.Medium) {
    this.onStateChange = onStateChange;
    this.setDifficulty(difficulty, false);
  }

  setDifficulty(difficulty: GameDifficulty, notify: boolean = true) {
    this.difficulty = difficulty;
    this.difficultyPreset = DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS[GameDifficulty.Medium];
    this.money = this.difficultyPreset.startingMoney;
    this.lives = this.difficultyPreset.startingLives;
    this.round = 1;
    this.isRoundActive = false;
    this.isGameOver = false;
    this.bloons = [];
    this.projectiles = [];
    this.particles = [];
    this.towers = [];
    this.waveGroupIndex = 0;
    this.waveCountRemaining = 0;
    this.waveTimer = 0;
    this.selectedTowerId = null;
    this.selectedTowerPlacement = null;
    if (notify) this.onStateChange();
  }

  getDifficultyPreset(): DifficultyPreset {
    return this.difficultyPreset;
  }

  getRoundPreview(roundNumber: number = this.round): WaveGroup[] {
    return WAVES[roundNumber - 1] ?? [];
  }

  startRound() {
    if (this.isRoundActive || this.round > WAVES.length) return;
    this.isRoundActive = true;
    this.waveGroupIndex = 0;
    const waveData = WAVES[this.round - 1];
    if (waveData && waveData.length > 0) {
        this.waveCountRemaining = waveData[0].count;
        this.waveTimer = 0;
    }
    this.onStateChange();
  }

  placeTower(x: number, y: number, config: TowerConfig): boolean {
    if (this.money < config.cost) return false;
    if (x < 0 || x > CANVAS_WIDTH || y < 0 || y > CANVAS_HEIGHT) return false;
    if (this.isPointOnPath(x, y, 20)) return false;

    for (const t of this.towers) {
      const dx = t.x - x;
      const dy = t.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) return false;
    }

    this.money -= config.cost;
    this.towers.push({
      id: Date.now(),
      x,
      y,
      config: JSON.parse(JSON.stringify(config)), // Clone to avoid ref issues
      cooldownTimer: 0,
      strategy: TargetStrategy.First,
      totalDamageDealt: 0,
      currentUpgrades: 0,
      dynamicRange: config.range,
      dynamicDamage: config.damage,
      dynamicCooldown: config.cooldown,
      dynamicPierce: config.pierce,
      dynamicProjectileSpeed: config.projectileSpeed,
      dynamicIncome: config.income ?? 0,
    });
    this.onStateChange();
    return true;
  }

  upgradeTower(towerId: number): boolean {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return false;
    if (tower.currentUpgrades >= tower.config.upgrades.length) return false;

    const upgrade = tower.config.upgrades[tower.currentUpgrades];
    if (this.money < upgrade.cost) return false;

    this.money -= upgrade.cost;
    tower.currentUpgrades++;
    
    // Apply effects
    if (upgrade.effect.damage) tower.dynamicDamage += upgrade.effect.damage;
    if (upgrade.effect.range) tower.dynamicRange += upgrade.effect.range;
    if (upgrade.effect.cooldownMult) tower.dynamicCooldown *= upgrade.effect.cooldownMult;
    if (upgrade.effect.pierce) tower.dynamicPierce += upgrade.effect.pierce;
    if (upgrade.effect.projectileSpeed) tower.dynamicProjectileSpeed += upgrade.effect.projectileSpeed;
    if (upgrade.effect.income) tower.dynamicIncome += upgrade.effect.income;

    this.onStateChange();
    return true;
  }

  sellTower(id: number) {
    const idx = this.towers.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.money += Math.floor(this.towers[idx].config.cost * this.difficultyPreset.sellbackRate);
      this.towers.splice(idx, 1);
      this.onStateChange();
    }
  }

  changeStrategy(id: number) {
     const tower = this.towers.find(t => t.id === id);
     if (tower) {
         const strategies = [TargetStrategy.First, TargetStrategy.Last, TargetStrategy.Close, TargetStrategy.Strong];
         const idx = strategies.indexOf(tower.strategy);
         tower.strategy = strategies[(idx + 1) % strategies.length];
         this.onStateChange();
     }
  }

  private isPointOnPath(x: number, y: number, buffer: number): boolean {
    for (let i = 0; i < PATH_NODES.length - 1; i++) {
      const dist = this.distToSegment({x, y}, PATH_NODES[i], PATH_NODES[i + 1]);
      if (dist < buffer) return true;
    }
    return false;
  }

  private distToSegment(p: Point, v: Point, w: Point): number {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
  }

  update(dt: number) {
    if (this.lives <= 0) {
      this.isGameOver = true;
      this.onStateChange();
      return;
    }

    if (this.isRoundActive) {
      const waveData = WAVES[this.round - 1];
      if (waveData) {
        if (this.waveGroupIndex < waveData.length) {
           this.waveTimer -= dt;
           while (this.waveGroupIndex < waveData.length && this.waveTimer <= 0) {
             const group = waveData[this.waveGroupIndex];
             this.spawnWaveBloon(group.type);
             this.waveCountRemaining--;

             if (this.waveCountRemaining <= 0) {
               this.waveGroupIndex++;
               if (this.waveGroupIndex < waveData.length) {
                 this.waveCountRemaining = waveData[this.waveGroupIndex].count;
                 this.waveTimer += Math.max(MIN_EVENT_SPACING_SECONDS, waveData[this.waveGroupIndex].spacing);
               }
             } else {
               this.waveTimer += Math.max(MIN_EVENT_SPACING_SECONDS, group.spacing);
             }
           }
        } else if (this.bloons.length === 0) {
           this.isRoundActive = false;
           this.money += Math.floor((this.difficultyPreset.roundBonusBase + this.round * this.difficultyPreset.roundBonusScale));
           this.round++;
           this.onStateChange();
        }
      } else {
          this.isRoundActive = false; 
      }
    }

    for (let i = this.bloons.length - 1; i >= 0; i--) {
      const b = this.bloons[i];
      const stats = BLOON_STATS[b.type];
      const speed = stats.speed * (this.round > 20 ? 1 + (this.round - 20) * 0.05 : 1);
      let movementRemaining = speed * dt;

      while (movementRemaining > 0 && b.nodeIndex < PATH_NODES.length - 1) {
        const targetNode = PATH_NODES[b.nodeIndex + 1];
        const dx = targetNode.x - b.x;
        const dy = targetNode.y - b.y;
        const distToNode = Math.sqrt(dx * dx + dy * dy);

        if (distToNode <= movementRemaining) {
          b.x = targetNode.x;
          b.y = targetNode.y;
          b.nodeIndex++;
          b.distanceTraveled += distToNode;
          movementRemaining -= distToNode;

          if (b.nodeIndex >= PATH_NODES.length - 1) {
            this.lives -= stats.leakLives;
            this.bloons.splice(i, 1);
            this.onStateChange();
            break;
          }
        } else {
          const moveRatio = movementRemaining / distToNode;
          b.x += dx * moveRatio;
          b.y += dy * moveRatio;
          b.distanceTraveled += movementRemaining;
          movementRemaining = 0;
        }
      }
    }

    this.towers.forEach(tower => {
      tower.cooldownTimer = Math.max(0, tower.cooldownTimer - dt);
      while (tower.cooldownTimer <= 0) {
        const cooldownSeconds = Math.max(MIN_EVENT_SPACING_SECONDS, tower.dynamicCooldown / SIMULATION_FPS);

        if (tower.config.id === 'FARM') {
          this.money += tower.dynamicIncome;
          tower.totalDamageDealt += tower.dynamicIncome;
          tower.cooldownTimer += cooldownSeconds;
          this.createParticle(tower.x, tower.y - 20, '#fde047', 10);
          this.onStateChange();
          continue;
        }

        const target = this.findTarget(tower);
        if (!target) {
          tower.cooldownTimer = 0;
          break;
        }

          this.fire(tower, target);
          tower.cooldownTimer += cooldownSeconds;
      }
    });

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.lifespan -= dt;
      if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT || p.lifespan <= 0) {
        this.projectiles.splice(i, 1); continue;
      }
      for (let j = this.bloons.length - 1; j >= 0; j--) {
        const b = this.bloons[j];
        if (p.hitBloons.has(b.id)) continue;
        const d = Math.sqrt((b.x - p.x)**2 + (b.y - p.y)**2);
        if (d < BLOON_STATS[b.type].r + 5) {
            p.hitBloons.add(b.id);
            this.damageBloon(j, p.damage, p.damageType, p.sourceTowerId);
            p.pierce--;
            this.createParticle(p.x, p.y, BLOON_STATS[b.type].color, 5);
            if (p.pierce <= 0) {
                if (p.isExplosive) this.explode(p.x, p.y, 70, p.damage, p.sourceTowerId);
                this.projectiles.splice(i, 1); break;
            }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].x += this.particles[i].vx * dt * SIMULATION_FPS;
        this.particles[i].y += this.particles[i].vy * dt * SIMULATION_FPS;
        this.particles[i].life -= dt;
        if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }

  private findTarget(tower: Tower): Bloon | null {
    const inRange = this.bloons.filter(b => Math.sqrt((b.x - tower.x)**2 + (b.y - tower.y)**2) <= tower.dynamicRange);
    if (inRange.length === 0) return null;
    switch (tower.strategy) {
      case TargetStrategy.First: return inRange.reduce((p, c) => (c.distanceTraveled > p.distanceTraveled ? c : p));
      case TargetStrategy.Last: return inRange.reduce((p, c) => (c.distanceTraveled < p.distanceTraveled ? c : p));
      case TargetStrategy.Strong: return inRange.reduce((p, c) => (c.health > p.health ? c : p));
      case TargetStrategy.Close: return inRange.reduce((p, c) => ((c.x - tower.x)**2 + (c.y - tower.y)**2 < (p.x - tower.x)**2 + (p.y - tower.y)**2 ? c : p));
      default: return inRange[0];
    }
  }

  private fire(tower: Tower, target: Bloon) {
    if (tower.dynamicProjectileSpeed === 0) { // Hitscan
        this.damageBloon(this.bloons.indexOf(target), tower.dynamicDamage, tower.config.damageType, tower.id);
        this.createParticle(target.x, target.y, '#FFFFFF', 8); // Flash effect
        return;
    }

    const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.config.id === 'TACK') {
        for (let i = 0; i < 8; i++) {
            const theta = (Math.PI * 2 * i) / 8;
            this.projectiles.push({
                id: ++this.projectileIdCounter, x: tower.x, y: tower.y,
                vx: Math.cos(theta) * tower.dynamicProjectileSpeed * 60, vy: Math.sin(theta) * tower.dynamicProjectileSpeed * 60,
                damage: tower.dynamicDamage, pierce: tower.dynamicPierce, lifespan: 40 / 60, damageType: tower.config.damageType,
                hitBloons: new Set(), color: tower.config.color, sourceTowerId: tower.id, isExplosive: false
            });
        }
    } else {
        this.projectiles.push({
            id: ++this.projectileIdCounter, x: tower.x, y: tower.y,
            vx: Math.cos(angle) * tower.dynamicProjectileSpeed * 60, vy: Math.sin(angle) * tower.dynamicProjectileSpeed * 60,
            damage: tower.dynamicDamage, pierce: tower.dynamicPierce, lifespan: 120 / 60, damageType: tower.config.damageType,
            hitBloons: new Set(), color: tower.config.color, sourceTowerId: tower.id,
            isExplosive: tower.config.damageType === DamageType.Explosive
        });
    }
  }

  private damageBloon(index: number, damage: number, type: DamageType, towerId: number) {
     if (index === -1 || damage <= 0) return;
     const bloon = this.bloons[index];
     const stats = BLOON_STATS[bloon.type];
     if (stats.immunities.includes(type)) return;

     const tower = this.towers.find(t => t.id === towerId);
     if (tower) tower.totalDamageDealt += damage;

     if (bloon.health > damage) {
         bloon.health -= damage;
         this.onStateChange();
         return;
     }

     const px = bloon.x; const py = bloon.y; const pn = bloon.nodeIndex; const pd = bloon.distanceTraveled;
     this.money += stats.money;
     const carryDamage = damage - bloon.health;
     this.bloons.splice(index, 1);

     const spawnedChildren: Bloon[] = [];
     if (stats.children.length > 0) {
         stats.children.forEach((childType, childIndex) => {
             for (let k = 0; k < stats.childCount; k++) {
                 this.spawnChild(childType, px, py, pn, pd - ((childIndex * stats.childCount + k) * 10));
                 const child = this.bloons[this.bloons.length - 1];
                 if (child) spawnedChildren.push(child);
             }
         });
     }

     if (carryDamage > 0 && spawnedChildren.length === 1) {
         this.damageBloon(this.bloons.findIndex(b => b.id === spawnedChildren[0].id), carryDamage, type, towerId);
         return;
     }

     this.onStateChange();
  }

  private explode(x: number, y: number, radius: number, damage: number, towerId: number) {
      for (let i = this.bloons.length - 1; i >= 0; i--) {
          if (Math.sqrt((this.bloons[i].x - x)**2 + (this.bloons[i].y - y)**2) <= radius) {
              this.damageBloon(i, damage, DamageType.Explosive, towerId);
          }
      }
      for(let i=0; i<8; i++) this.createParticle(x, y, '#FFA500', 6);
  }

  private spawnWaveBloon(type: BloonColor) {
      this.bloons.push({
          id: ++this.bloonIdCounter, type, x: PATH_NODES[0].x, y: PATH_NODES[0].y,
          nodeIndex: 0, distanceTraveled: 0, health: BLOON_STATS[type].health, frozen: 0, glued: 0, onFire: 0
      });
  }

  private spawnChild(type: BloonColor, x: number, y: number, nodeIndex: number, distanceTraveled: number) {
      this.bloons.push({ id: ++this.bloonIdCounter, type, x, y, nodeIndex, distanceTraveled, health: BLOON_STATS[type].health, frozen: 0, glued: 0, onFire: 0 });
  }

  createParticle(x: number, y: number, color: string, size: number) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        color,
        life: 15 / SIMULATION_FPS,
        maxLife: 15 / SIMULATION_FPS,
        size,
      });
  }

  private getBloonColor(type: BloonColor): string {
      switch (type) {
          case BloonColor.Red: return '#ef4444';
          case BloonColor.Blue: return '#3b82f6';
          case BloonColor.Green: return '#22c55e';
          case BloonColor.Yellow: return '#eab308';
          case BloonColor.Pink: return '#ec4899';
          case BloonColor.Black: return '#1f2937';
          case BloonColor.White: return '#f3f4f6';
          case BloonColor.Lead: return '#6b7280';
          case BloonColor.Zebra: return '#111827';
          case BloonColor.Rainbow: return '#6366f1';
          case BloonColor.Ceramic: return '#fdba74';
          case BloonColor.MOAB: return '#3b82f6';
          default: return '#ef4444';
      }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grass Background
    const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH);
    gradient.addColorStop(0, '#4ADE80');
    gradient.addColorStop(1, '#22c55e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Subtle Grid Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // Draw Path Border
    ctx.strokeStyle = '#a8a29e'; // Stone border color
    ctx.lineWidth = 48; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(PATH_NODES[0].x, PATH_NODES[0].y);
    for (let i = 1; i < PATH_NODES.length; i++) ctx.lineTo(PATH_NODES[i].x, PATH_NODES[i].y);
    ctx.stroke();

    // Draw Path Road
    ctx.strokeStyle = '#d6d3d1'; // Light stone path
    ctx.lineWidth = 40; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(PATH_NODES[0].x, PATH_NODES[0].y);
    for (let i = 1; i < PATH_NODES.length; i++) ctx.lineTo(PATH_NODES[i].x, PATH_NODES[i].y);
    ctx.stroke();

    // Draw Path Detail (Dashed Line)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(PATH_NODES[0].x, PATH_NODES[0].y);
    for (let i = 1; i < PATH_NODES.length; i++) ctx.lineTo(PATH_NODES[i].x, PATH_NODES[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Range Previews
    if (this.selectedTowerPlacement && this.hoverPos) {
        this.drawRangeCircle(ctx, this.hoverPos.x, this.hoverPos.y, this.selectedTowerPlacement.range);
        // Ghost tower
        ctx.globalAlpha = 0.5;
        this.drawTower(ctx, { x: this.hoverPos.x, y: this.hoverPos.y, config: this.selectedTowerPlacement } as Tower);
        ctx.globalAlpha = 1.0;
    }
    if (this.selectedTowerId) {
        const t = this.towers.find(tw => tw.id === this.selectedTowerId);
        if (t) {
            this.drawRangeCircle(ctx, t.x, t.y, t.dynamicRange);
        }
    }

    // Draw Towers
    this.towers.forEach(t => this.drawTower(ctx, t));

    // Draw Bloons
    this.bloons.forEach(b => this.drawBloon(ctx, b));

    // Draw Projectiles
    this.projectiles.forEach(p => this.drawProjectile(ctx, p));

    // Draw Particles
    this.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
  }

  private drawRangeCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
  }

  private drawTower(ctx: CanvasRenderingContext2D, t: Tower) {
      // Base
      ctx.fillStyle = '#1e293b'; // Slate 800
      ctx.beginPath(); ctx.arc(t.x, t.y, 24, 0, Math.PI * 2); ctx.fill();

      // Body
      const gradient = ctx.createRadialGradient(t.x - 5, t.y - 5, 5, t.x, t.y, 20);
      gradient.addColorStop(0, this.lightenColor(t.config.color, 20));
      gradient.addColorStop(1, t.config.color);

      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();

      // Detail based on type
      ctx.save();
      ctx.translate(t.x, t.y);
      // Determine rotation if there is a target (mock rotation for now or last target angle could be stored)
      // For simplicity, we just draw static details or simple animations

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      if (t.config.id === 'DART' || t.config.id === 'SNIPER') {
          // Bandana / Hat
          ctx.beginPath(); ctx.ellipse(0, -10, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      } else if (t.config.id === 'CANNON') {
          // Cannon hole
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.stroke();
      } else if (t.config.id === 'TACK') {
          // Tack holes
          ctx.fillStyle = '#000';
          for(let i=0; i<8; i++) {
              const theta = (Math.PI * 2 * i) / 8;
              ctx.beginPath(); ctx.arc(Math.cos(theta)*12, Math.sin(theta)*12, 3, 0, Math.PI * 2); ctx.fill();
          }
      } else if (t.config.id === 'SUPER') {
          // Cape
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(10, 10); ctx.lineTo(0, 25); ctx.fill();
      } else if (t.config.id === 'FARM') {
          // Banana bunch
          ctx.fillStyle = '#fde047';
          ctx.beginPath(); ctx.ellipse(-6, -2, 5, 8, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(0, -5, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(6, -2, 5, 8, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -17); ctx.stroke();
      }

      ctx.restore();

      // Upgrades (Stars)
      const startAngle = -Math.PI / 2;
      const angleStep = Math.PI / 6;
      for(let i=0; i<t.currentUpgrades; i++) {
          const angle = startAngle + (i * angleStep) - ((t.currentUpgrades-1) * angleStep / 2);
          const ux = t.x + Math.cos(angle) * 26;
          const uy = t.y + Math.sin(angle) * 26;
          this.drawStar(ctx, ux, uy, 4, 3, 1.5, '#fbbf24');
      }
  }

  private drawBloon(ctx: CanvasRenderingContext2D, b: Bloon) {
      const stats = BLOON_STATS[b.type];
      const color = this.getBloonColor(b.type);

      ctx.save();
      ctx.translate(b.x, b.y);

      if (b.type === BloonColor.MOAB) {
          const targetNode = PATH_NODES[b.nodeIndex + 1];
          const currentNode = PATH_NODES[b.nodeIndex];
          if (targetNode && currentNode) {
              const angle = Math.atan2(targetNode.y - currentNode.y, targetNode.x - currentNode.x);
              ctx.rotate(angle);
          }
      }

      // Knot
      if (b.type !== BloonColor.MOAB) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(0, stats.r);
          ctx.lineTo(-3, stats.r + 6);
          ctx.lineTo(3, stats.r + 6);
          ctx.fill();
      }

      // Body Gradient
      const gradient = ctx.createRadialGradient(-stats.r/3, -stats.r/3, stats.r/4, 0, 0, stats.r);
      gradient.addColorStop(0, this.lightenColor(color, 50));
      gradient.addColorStop(1, color);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (b.type === BloonColor.MOAB) {
          ctx.ellipse(0, 0, stats.r * 1.5, stats.r, 0, 0, Math.PI * 2);
      } else {
          ctx.ellipse(0, 0, stats.r * 0.85, stats.r, 0, 0, Math.PI * 2);
      }
      ctx.fill();

      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (b.type === BloonColor.MOAB) {
          // Stripes
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-stats.r * 0.4, -stats.r * 0.8);
          ctx.lineTo(-stats.r * 0.4, stats.r * 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(stats.r * 0.4, -stats.r * 0.8);
          ctx.lineTo(stats.r * 0.4, stats.r * 0.8);
          ctx.stroke();

          // Fins
          ctx.fillStyle = '#1d4ed8'; // Slightly darker blue
          ctx.beginPath();
          ctx.moveTo(-stats.r * 1.5, 0);
          ctx.lineTo(-stats.r * 1.8, -stats.r * 0.6);
          ctx.lineTo(-stats.r * 1.8, stats.r * 0.6);
          ctx.closePath();
          ctx.fill();
      }

      if (b.type === BloonColor.Zebra) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3;
          for (let i = -1; i <= 1; i++) {
              ctx.beginPath();
              ctx.moveTo(-stats.r * 0.55, i * stats.r * 0.35);
              ctx.lineTo(stats.r * 0.55, i * stats.r * 0.35);
              ctx.stroke();
          }
      }

      if (b.type === BloonColor.Rainbow) {
          const stripeColors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
          ctx.lineWidth = 2;
          stripeColors.forEach((stripe, idx) => {
              const y = -stats.r * 0.6 + idx * (stats.r * 0.3);
              ctx.strokeStyle = stripe;
              ctx.beginPath();
              ctx.moveTo(-stats.r * 0.55, y);
              ctx.lineTo(stats.r * 0.55, y);
              ctx.stroke();
          });
      }

      if (b.type === BloonColor.Lead) {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, stats.r * 0.55, -Math.PI / 2.5, Math.PI / 2.5);
          ctx.stroke();
      }

      if (b.type === BloonColor.Ceramic) {
          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 2;
          const crackDepth = 1 - (b.health / Math.max(1, stats.health));
          ctx.beginPath();
          ctx.moveTo(-stats.r * 0.45, -stats.r * 0.25);
          ctx.lineTo(-stats.r * 0.1, stats.r * (0.1 + crackDepth * 0.2));
          ctx.lineTo(stats.r * 0.3, -stats.r * 0.05);
          ctx.stroke();
      }

      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(-stats.r * 0.3, -stats.r * 0.3, stats.r * 0.2, stats.r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
      ctx.fillStyle = p.color;
      if (p.damageType === DamageType.Explosive) {
          // Bomb
          ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; // Shine
          ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.damageType === DamageType.Magic) {
           // Magic Bolt
           ctx.shadowBlur = 10; ctx.shadowColor = p.color;
           ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
           ctx.shadowBlur = 0;
      } else {
          // Dart / Sharp
          const angle = Math.atan2(p.vy, p.vx);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-4, 4);
          ctx.lineTo(-4, -4);
          ctx.fill();
          ctx.restore();
      }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#b45309'; // Darker gold outline
      ctx.lineWidth = 1;
      ctx.stroke();
  }

  private lightenColor(color: string, percent: number) {
      const num = parseInt(color.replace('#', ''), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      B = (num >> 8 & 0x00FF) + amt,
      G = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
  }
}

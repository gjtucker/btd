import { BLOON_STATS, PATH_NODES, WAVES, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { BloonColor, BloonLayer, DamageType, Point, TargetStrategy, TowerConfig, Upgrade } from '../types';

interface Bloon {
  id: number;
  type: BloonColor;
  x: number;
  y: number;
  nodeIndex: number;
  distanceTraveled: number;
  frozen: number;
  glued: number;
  onFire: number;
}

interface Tower {
  id: number;
  x: number;
  y: number;
  config: TowerConfig;
  cooldownTimer: number;
  strategy: TargetStrategy;
  totalDamageDealt: number;
  currentUpgrades: number;
  dynamicRange: number;
  dynamicDamage: number;
  dynamicCooldown: number;
  dynamicPierce: number;
  dynamicProjectileSpeed: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  lifespan: number;
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
  life: number;
}

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
  
  onStateChange: () => void = () => {};

  constructor(onStateChange: () => void) {
    this.onStateChange = onStateChange;
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

    this.onStateChange();
    return true;
  }

  sellTower(id: number) {
    const idx = this.towers.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.money += Math.floor(this.towers[idx].config.cost * 0.7);
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
           const group = waveData[this.waveGroupIndex];
           this.waveTimer -= dt;
           if (this.waveTimer <= 0) {
             this.spawnWaveBloon(group.type);
             this.waveCountRemaining--;
             this.waveTimer = group.spacing;
             if (this.waveCountRemaining <= 0) {
               this.waveGroupIndex++;
               if (this.waveGroupIndex < waveData.length) {
                 this.waveCountRemaining = waveData[this.waveGroupIndex].count;
                 this.waveTimer = waveData[this.waveGroupIndex].spacing;
               }
             }
           }
        } else if (this.bloons.length === 0) {
           this.isRoundActive = false;
           this.money += 100 + this.round;
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
      const targetNode = PATH_NODES[b.nodeIndex + 1];
      const currentNode = PATH_NODES[b.nodeIndex];
      const dx = targetNode.x - currentNode.x;
      const dy = targetNode.y - currentNode.y;
      const totalDist = Math.sqrt(dx*dx + dy*dy);
      b.x += (dx / totalDist) * speed;
      b.y += (dy / totalDist) * speed;
      b.distanceTraveled += speed;
      if (Math.sqrt((targetNode.x - b.x)**2 + (targetNode.y - b.y)**2) < speed) {
        b.nodeIndex++;
        b.x = targetNode.x; b.y = targetNode.y;
        if (b.nodeIndex >= PATH_NODES.length - 1) {
          this.lives -= stats.health;
          this.bloons.splice(i, 1);
          this.onStateChange();
        }
      }
    }

    this.towers.forEach(tower => {
      if (tower.cooldownTimer > 0) tower.cooldownTimer--;
      else {
        const target = this.findTarget(tower);
        if (target) {
            this.fire(tower, target);
            tower.cooldownTimer = tower.dynamicCooldown;
        }
      }
    });

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx; p.y += p.vy;
      p.lifespan--;
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
            this.createParticle(p.x, p.y, BLOON_STATS[b.type].color);
            if (p.pierce <= 0) {
                if (p.isExplosive) this.explode(p.x, p.y, 70, p.damage, p.sourceTowerId);
                this.projectiles.splice(i, 1); break;
            }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].x += this.particles[i].vx;
        this.particles[i].y += this.particles[i].vy;
        this.particles[i].life--;
        if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }

  private findTarget(tower: Tower): Bloon | null {
    const inRange = this.bloons.filter(b => Math.sqrt((b.x - tower.x)**2 + (b.y - tower.y)**2) <= tower.dynamicRange);
    if (inRange.length === 0) return null;
    switch (tower.strategy) {
      case TargetStrategy.First: return inRange.reduce((p, c) => (c.distanceTraveled > p.distanceTraveled ? c : p));
      case TargetStrategy.Last: return inRange.reduce((p, c) => (c.distanceTraveled < p.distanceTraveled ? c : p));
      case TargetStrategy.Strong: return inRange.reduce((p, c) => (BLOON_STATS[c.type].health > BLOON_STATS[p.type].health ? c : p));
      case TargetStrategy.Close: return inRange.reduce((p, c) => ((c.x - tower.x)**2 + (c.y - tower.y)**2 < (p.x - tower.x)**2 + (p.y - tower.y)**2 ? c : p));
      default: return inRange[0];
    }
  }

  private fire(tower: Tower, target: Bloon) {
    if (tower.dynamicProjectileSpeed === 0) { // Hitscan
        this.damageBloon(this.bloons.indexOf(target), tower.dynamicDamage, tower.config.damageType, tower.id);
        this.createParticle(target.x, target.y, '#FFFFFF'); // Flash effect
        return;
    }

    const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.config.id === 'TACK') {
        for (let i = 0; i < 8; i++) {
            const theta = (Math.PI * 2 * i) / 8;
            this.projectiles.push({
                id: ++this.projectileIdCounter, x: tower.x, y: tower.y,
                vx: Math.cos(theta) * tower.dynamicProjectileSpeed, vy: Math.sin(theta) * tower.dynamicProjectileSpeed,
                damage: tower.dynamicDamage, pierce: tower.dynamicPierce, lifespan: 40, damageType: tower.config.damageType,
                hitBloons: new Set(), color: tower.config.color, sourceTowerId: tower.id, isExplosive: false
            });
        }
    } else {
        this.projectiles.push({
            id: ++this.projectileIdCounter, x: tower.x, y: tower.y,
            vx: Math.cos(angle) * tower.dynamicProjectileSpeed, vy: Math.sin(angle) * tower.dynamicProjectileSpeed,
            damage: tower.dynamicDamage, pierce: tower.dynamicPierce, lifespan: 120, damageType: tower.config.damageType,
            hitBloons: new Set(), color: tower.config.color, sourceTowerId: tower.id,
            isExplosive: tower.config.damageType === DamageType.Explosive
        });
    }
  }

  private damageBloon(index: number, damage: number, type: DamageType, towerId: number) {
     if (index === -1) return;
     const bloon = this.bloons[index];
     const stats = BLOON_STATS[bloon.type];
     if (stats.immunities.includes(type)) return;
     this.money += stats.money;
     const tower = this.towers.find(t => t.id === towerId);
     if (tower) tower.totalDamageDealt++;

     const px = bloon.x; const py = bloon.y; const pn = bloon.nodeIndex; const pd = bloon.distanceTraveled;
     this.bloons.splice(index, 1);

     if (stats.children.length > 0) {
         for (let k = 0; k < stats.childCount; k++) {
             this.spawnChild(stats.children[0], px, py, pn, pd - (k * 10)); 
         }
     }
     this.onStateChange();
  }

  private explode(x: number, y: number, radius: number, damage: number, towerId: number) {
      for (let i = this.bloons.length - 1; i >= 0; i--) {
          if (Math.sqrt((this.bloons[i].x - x)**2 + (this.bloons[i].y - y)**2) <= radius) {
              this.damageBloon(i, damage, DamageType.Explosive, towerId);
          }
      }
      for(let i=0; i<8; i++) this.createParticle(x, y, '#FFA500');
  }

  private spawnWaveBloon(type: BloonColor) {
      this.bloons.push({
          id: ++this.bloonIdCounter, type, x: PATH_NODES[0].x, y: PATH_NODES[0].y,
          nodeIndex: 0, distanceTraveled: 0, frozen: 0, glued: 0, onFire: 0
      });
  }

  private spawnChild(type: BloonColor, x: number, y: number, nodeIndex: number, distanceTraveled: number) {
      this.bloons.push({ id: ++this.bloonIdCounter, type, x, y, nodeIndex, distanceTraveled, frozen: 0, glued: 0, onFire: 0 });
  }

  createParticle(x: number, y: number, color: string) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, color, life: 15 });
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#D4D4D4';
    ctx.lineWidth = 40; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(PATH_NODES[0].x, PATH_NODES[0].y);
    for (let i = 1; i < PATH_NODES.length; i++) ctx.lineTo(PATH_NODES[i].x, PATH_NODES[i].y);
    ctx.stroke();

    // Draw Range Previews
    if (this.selectedTowerPlacement && this.hoverPos) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath(); ctx.arc(this.hoverPos.x, this.hoverPos.y, this.selectedTowerPlacement.range, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.stroke();
    }
    if (this.selectedTowerId) {
        const t = this.towers.find(tw => tw.id === this.selectedTowerId);
        if (t) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath(); ctx.arc(t.x, t.y, t.dynamicRange, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.stroke();
        }
    }

    this.towers.forEach(t => {
        ctx.fillStyle = t.config.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, Math.PI * 2); ctx.fill();
        // Upgrade dots
        for(let i=0; i<t.currentUpgrades; i++) {
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath(); ctx.arc(t.x - 12 + i*12, t.y + 12, 3, 0, Math.PI * 2); ctx.fill();
        }
    });

    this.bloons.forEach(b => {
        const stats = BLOON_STATS[b.type];
        ctx.fillStyle = stats.color.toLowerCase();
        if (b.type === BloonColor.Black) ctx.fillStyle = '#1F2937';
        if (b.type === BloonColor.White) ctx.fillStyle = '#F3F4F6';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, stats.r * 0.8, stats.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    });

    this.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    });

    this.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 15;
        ctx.fillRect(p.x, p.y, 4, 4); ctx.globalAlpha = 1.0;
    });
  }
}

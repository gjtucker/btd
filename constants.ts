import { BloonColor, BloonLayer, DamageType, Point, TowerConfig, Wave } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PATH_NODES: Point[] = [
  { x: 0, y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 400 },
  { x: 400, y: 400 },
  { x: 400, y: 200 },
  { x: 600, y: 200 },
  { x: 600, y: 500 },
  { x: 800, y: 500 },
];

export const BLOON_STATS: Record<BloonColor, BloonLayer> = {
  [BloonColor.Red]: { color: BloonColor.Red, health: 1, speed: 1.5, children: [], childCount: 0, immunities: [], r: 15, money: 1 },
  [BloonColor.Blue]: { color: BloonColor.Blue, health: 1, speed: 2.1, children: [BloonColor.Red], childCount: 1, immunities: [], r: 16, money: 1 },
  [BloonColor.Green]: { color: BloonColor.Green, health: 1, speed: 2.7, children: [BloonColor.Blue], childCount: 1, immunities: [], r: 17, money: 1 },
  [BloonColor.Yellow]: { color: BloonColor.Yellow, health: 1, speed: 4.8, children: [BloonColor.Green], childCount: 1, immunities: [], r: 18, money: 1 },
  [BloonColor.Pink]: { color: BloonColor.Pink, health: 1, speed: 5.2, children: [BloonColor.Yellow], childCount: 1, immunities: [], r: 15, money: 1 },
  [BloonColor.Black]: { color: BloonColor.Black, health: 1, speed: 2.7, children: [BloonColor.Pink], childCount: 2, immunities: [DamageType.Explosive], r: 14, money: 1 },
  [BloonColor.White]: { color: BloonColor.White, health: 1, speed: 3.0, children: [BloonColor.Pink], childCount: 2, immunities: [DamageType.Freeze], r: 14, money: 1 },
};

export const TOWERS: Record<string, TowerConfig> = {
  DART: {
    id: 'DART',
    name: 'Dart Monkey',
    cost: 200,
    range: 150,
    damage: 1,
    cooldown: 40,
    pierce: 2,
    projectileSpeed: 15,
    damageType: DamageType.Sharp,
    color: '#8B5A2B',
    upgrades: [
      { name: 'Sharp Shots', description: '+2 pierce', cost: 140, effect: { pierce: 2 } },
      { name: 'Very Quick Shots', description: 'Attack 50% faster', cost: 200, effect: { cooldownMult: 0.5 } },
    ],
  },
  TACK: {
    id: 'TACK',
    name: 'Tack Shooter',
    cost: 400,
    range: 100,
    damage: 1,
    cooldown: 50,
    pierce: 1,
    projectileSpeed: 10,
    damageType: DamageType.Sharp,
    color: '#FF69B4',
    upgrades: [
      { name: 'Fast Tacks', description: 'Faster shots', cost: 210, effect: { cooldownMult: 0.7 } },
      { name: 'Extra Range Tacks', description: '+30 range', cost: 300, effect: { range: 30 } },
    ],
  },
  CANNON: {
    id: 'CANNON',
    name: 'Bomb Shooter',
    cost: 600,
    range: 180,
    damage: 2,
    cooldown: 80,
    pierce: 10,
    projectileSpeed: 10,
    damageType: DamageType.Explosive,
    color: '#333333',
    upgrades: [
      { name: 'Bigger Bombs', description: '+1 damage', cost: 400, effect: { damage: 1 } },
      { name: 'Missile Launcher', description: 'Faster missiles', cost: 500, effect: { projectileSpeed: 5 } },
    ],
  },
  SNIPER: {
    id: 'SNIPER',
    name: 'Sniper Monkey',
    cost: 450, // Buffed cost
    range: 2000,
    damage: 2, // High damage
    cooldown: 100,
    pierce: 1,
    projectileSpeed: 0, // 0 = Hitscan
    damageType: DamageType.Sharp,
    color: '#556B2F',
    upgrades: [
      { name: 'Full Metal Jacket', description: '+2 damage', cost: 350, effect: { damage: 2 } },
      { name: 'Faster Firing', description: 'Fire faster', cost: 400, effect: { cooldownMult: 0.7 } },
    ],
  },
  WIZARD: {
    id: 'WIZARD',
    name: 'Wizard Monkey',
    cost: 400,
    range: 160,
    damage: 1,
    cooldown: 45,
    pierce: 3,
    projectileSpeed: 12,
    damageType: DamageType.Magic,
    color: '#4B0082',
    upgrades: [
      { name: 'Intense Magic', description: '+2 pierce', cost: 300, effect: { pierce: 2 } },
      { name: 'Fireball', description: 'Huge explosion dmg', cost: 550, effect: { damage: 2 } },
    ],
  },
  SUPER: {
    id: 'SUPER',
    name: 'Super Monkey',
    cost: 2500,
    range: 250,
    damage: 1,
    cooldown: 3, // Insanely fast
    pierce: 1,
    projectileSpeed: 20,
    damageType: DamageType.Sharp,
    color: '#FFFF00',
    upgrades: [
      { name: 'Laser Blasts', description: '+1 dmg, magic type', cost: 2500, effect: { damage: 1 } },
      { name: 'Epic Range', description: '+100 range', cost: 1500, effect: { range: 100 } },
    ],
  },
};

export const WAVES: Wave[] = [
  [{ type: BloonColor.Red, count: 20, spacing: 1.0 }],
  [{ type: BloonColor.Red, count: 35, spacing: 0.8 }],
  [{ type: BloonColor.Red, count: 25, spacing: 0.5 }, { type: BloonColor.Blue, count: 5, spacing: 0.5 }],
  [{ type: BloonColor.Red, count: 35, spacing: 0.4 }, { type: BloonColor.Blue, count: 18, spacing: 0.4 }],
  [{ type: BloonColor.Red, count: 5, spacing: 0.5 }, { type: BloonColor.Blue, count: 27, spacing: 0.5 }],
  [{ type: BloonColor.Red, count: 15, spacing: 0.6 }, { type: BloonColor.Blue, count: 15, spacing: 0.6 }, { type: BloonColor.Green, count: 4, spacing: 0.6 }],
  [{ type: BloonColor.Red, count: 20, spacing: 0.4 }, { type: BloonColor.Blue, count: 20, spacing: 0.4 }, { type: BloonColor.Green, count: 5, spacing: 0.4 }],
  [{ type: BloonColor.Red, count: 10, spacing: 0.4 }, { type: BloonColor.Blue, count: 20, spacing: 0.4 }, { type: BloonColor.Green, count: 14, spacing: 0.4 }],
  [{ type: BloonColor.Blue, count: 30, spacing: 0.2 }],
  [{ type: BloonColor.Blue, count: 102, spacing: 0.1 }],
  [{ type: BloonColor.Red, count: 10, spacing: 0.2 }, { type: BloonColor.Blue, count: 10, spacing: 0.2 }, { type: BloonColor.Green, count: 12, spacing: 0.2 }, { type: BloonColor.Yellow, count: 3, spacing: 0.5 }],
  [{ type: BloonColor.Blue, count: 15, spacing: 0.2 }, { type: BloonColor.Green, count: 10, spacing: 0.2 }, { type: BloonColor.Yellow, count: 5, spacing: 0.5 }],
  [{ type: BloonColor.Blue, count: 50, spacing: 0.1 }, { type: BloonColor.Green, count: 23, spacing: 0.1 }],
  [{ type: BloonColor.Red, count: 49, spacing: 0.15 }, { type: BloonColor.Blue, count: 15, spacing: 0.15 }, { type: BloonColor.Green, count: 10, spacing: 0.15 }, { type: BloonColor.Yellow, count: 9, spacing: 0.3 }],
  [{ type: BloonColor.Red, count: 20, spacing: 0.1 }, { type: BloonColor.Blue, count: 15, spacing: 0.1 }, { type: BloonColor.Green, count: 12, spacing: 0.1 }, { type: BloonColor.Yellow, count: 10, spacing: 0.2 }, { type: BloonColor.Pink, count: 5, spacing: 0.2 }],
  [{ type: BloonColor.Green, count: 40, spacing: 0.2 }, { type: BloonColor.Yellow, count: 8, spacing: 0.3 }],
  [{ type: BloonColor.Yellow, count: 12, spacing: 0.1 }],
  [{ type: BloonColor.Green, count: 80, spacing: 0.1 }],
  [{ type: BloonColor.Green, count: 10, spacing: 0.1 }, { type: BloonColor.Yellow, count: 10, spacing: 0.1 }, { type: BloonColor.Pink, count: 7, spacing: 0.2 }],
  [{ type: BloonColor.Black, count: 6, spacing: 1.0 }],
];

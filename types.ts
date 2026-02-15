
export enum BloonColor {
  Red = 'Red',
  Blue = 'Blue',
  Green = 'Green',
  Yellow = 'Yellow',
  Pink = 'Pink',
  Black = 'Black',
  White = 'White',
  Lead = 'Lead',
  Zebra = 'Zebra',
}

export enum DamageType {
  Sharp = 'Sharp',
  Explosive = 'Explosive',
  Magic = 'Magic',
  Fire = 'Fire',
  Freeze = 'Freeze',
}

// BloonLayer defines the base stats for each bloon color/tier
export interface BloonLayer {
  color: BloonColor;
  health: number;
  speed: number;
  children: BloonColor[];
  childCount: number;
  immunities: DamageType[];
  r: number;
  money: number;
  leakLives: number;
}

export interface Upgrade {
  name: string;
  description: string;
  cost: number;
  effect: {
    damage?: number;
    range?: number;
    cooldownMult?: number;
    pierce?: number;
    projectileSpeed?: number;
  };
}

export interface TowerConfig {
  id: string;
  name: string;
  cost: number;
  range: number;
  damage: number;
  cooldown: number; // Frames between shots
  pierce: number;
  projectileSpeed: number; // 0 for hitscan
  damageType: DamageType;
  color: string;
  upgrades: Upgrade[];
}


export enum GameDifficulty {
  Easy = 'EASY',
  Medium = 'MEDIUM',
  Hard = 'HARD',
}

export interface DifficultyPreset {
  id: GameDifficulty;
  label: string;
  startingMoney: number;
  startingLives: number;
  roundBonusBase: number;
  roundBonusScale: number;
  sellbackRate: number;
}

export enum TargetStrategy {
  First = 'First',
  Last = 'Last',
  Strong = 'Strong',
  Close = 'Close',
}

export interface Point {
  x: number;
  y: number;
}

export interface WaveGroup {
  type: BloonColor;
  count: number;
  spacing: number; // Seconds
}

export type Wave = WaveGroup[];

import type { Cell } from './pathfinding';

export type LaneId = 'horizontal' | 'vertical';
export type EnemyKind = 'normal' | 'group' | 'fast' | 'flying' | 'immune' | 'spawn' | 'shard' | 'boss';
export type TowerKind = 'cannon' | 'mortar' | 'antiair' | 'frost';
export interface Lane { id: LaneId; entrance: Cell; exit: Cell; color: string }
export const LANES: readonly Lane[] = [
  { id: 'horizontal', entrance: { x: 0, y: 5 }, exit: { x: 15, y: 5 }, color: '#b9df99' },
  { id: 'vertical', entrance: { x: 7, y: 0 }, exit: { x: 7, y: 11 }, color: '#8dcdd7' },
];
export interface TowerStats {
  damage: number; range: number; interval: number; upgradeCost: number | null;
  splash: number; slow: number;
}
interface TowerDefinition {
  name: string; cost: number; color: string; target: 'ground' | 'air'; role: string;
  levels: readonly TowerStats[];
}
const level = (damage: number, range: number, interval: number, upgradeCost: number | null, splash = 0, slow = 1): TowerStats =>
  ({ damage, range, interval, upgradeCost, splash, slow });
export const TOWER_TYPES: Record<TowerKind, TowerDefinition> = {
  cannon: { name: 'キャノン', cost: 20, color: '#b9df99', target: 'ground', role: '地上 / 単体火力', levels: [level(10, 2.7, .65, 30), level(21, 3.1, .55, 50), level(38, 3.5, .45, null)] },
  mortar: { name: '迫撃砲', cost: 35, color: '#e8bd80', target: 'ground', role: '地上 / 範囲攻撃', levels: [level(12, 3, 1.1, 40, 1.1), level(24, 3.3, 1, 60, 1.25), level(42, 3.6, .9, null, 1.4)] },
  antiair: { name: '対空砲', cost: 25, color: '#a3c9f3', target: 'air', role: '飛行専用 / 高速射撃', levels: [level(15, 3.5, .45, 30), level(29, 4, .4, 50), level(48, 4.5, .35, null)] },
  frost: { name: '冷却砲', cost: 30, color: '#88d9d2', target: 'ground', role: '地上 / 減速（耐性型は無効）', levels: [level(2, 2.8, .7, 35, 0, .55), level(4, 3.2, .65, 55, 0, .45), level(7, 3.6, .6, null, 0, .35)] },
};
interface EnemyDefinition { name: string; color: string; hp: number; speed: number; reward: number; hint: string }
export const ENEMY_TYPES: Record<EnemyKind, EnemyDefinition> = {
  normal: { name: '通常', color: '#ee8f80', hp: 1, speed: 1.275, reward: 5, hint: '交差点にキャノンを置き、両方向を迎撃。' },
  group: { name: '集団', color: '#e6a1ac', hp: .5, speed: 1.15, reward: 3, hint: '密集する敵には迫撃砲の範囲攻撃。' },
  fast: { name: '高速', color: '#edbd72', hp: .7, speed: 2, reward: 5, hint: '長い迷路と冷却砲で攻撃時間を稼ごう。' },
  flying: { name: '飛行', color: '#a3c9f3', hp: .9, speed: 1.7, reward: 6, hint: '迷路を無視して直進。中央に対空砲を準備。' },
  immune: { name: '耐性', color: '#c49ee7', hp: 1.35, speed: 1.15, reward: 7, hint: '減速は無効。キャノンの強化と迷路で対処。' },
  spawn: { name: '分裂', color: '#a9d780', hp: 1.1, speed: 1.1, reward: 5, hint: '撃破時に小型2体へ分裂。出口手前にも範囲攻撃を。' },
  shard: { name: '小型', color: '#d0e89b', hp: .3, speed: 1.9, reward: 2, hint: '分裂した小型敵。再分裂せず、1体ずつライフを削る。' },
  boss: { name: 'ボス', color: '#d99dbd', hp: 4.5, speed: .8, reward: 25, hint: '高HP。迷路を延ばし、強化した砲台で集中攻撃。' },
};

export interface SpawnOrder { kind: EnemyKind; lane: LaneId; delay: number }
export interface WaveInfo {
  count: number; hp: number; bonus: number; kinds: EnemyKind[]; entries: SpawnOrder[];
  title: string; hint: string;
}
const repeat = (kind: EnemyKind, count: number): EnemyKind[] => Array<EnemyKind>(count).fill(kind);
const WAVES: readonly { roster: EnemyKind[]; title: string; hint: string }[] = [
  { roster: repeat('normal', 9), title: '交差する進路', hint: '左右と上下の2方向から出現。中央を守ろう。' },
  { roster: repeat('group', 18), title: '密集隊列', hint: '集団型がまとまって出現。迫撃砲が効果的。' },
  { roster: repeat('fast', 12), title: '高速突破', hint: '高速型には冷却砲と遠回りする迷路を。' },
  { roster: repeat('flying', 10), title: '空からの侵入', hint: '飛行型は迷路を無視。対空砲以外では攻撃できません。' },
  { roster: [...repeat('normal', 4), 'boss', ...repeat('normal', 4), 'boss'], title: '二方向の巨体', hint: '左右・上下それぞれにボス。地上火力を強化しよう。' },
  { roster: repeat('immune', 14), title: '冷却無効', hint: '耐性型は減速無効。火力と長い迷路で迎撃。' },
  { roster: repeat('spawn', 8), title: '増殖する脅威', hint: '分裂型8体から小型が最大16体追加。範囲攻撃で処理。' },
  { roster: [...repeat('group', 6), ...repeat('fast', 4), ...repeat('immune', 4), ...repeat('spawn', 4)], title: '地上混成部隊', hint: '範囲・減速・単体火力を組み合わせ、両方向を守ろう。' },
  { roster: [...repeat('flying', 6), ...repeat('fast', 6), ...repeat('immune', 4)], title: '空陸同時進攻', hint: '対空砲の強化も忘れずに。地上の守りとの両立が必要。' },
  { roster: [...repeat('normal', 4), ...repeat('immune', 4), ...repeat('spawn', 2), ...repeat('flying', 6), 'boss', 'boss'], title: '最終防衛線', hint: '分裂・飛行・耐性とボス2体。残った資金を防衛へ。' },
];
export const TOTAL_WAVES = WAVES.length;
export function waveInfo(wave: number): WaveInfo {
  const n = Math.max(1, Math.min(TOTAL_WAVES, Math.floor(wave)));
  const definition = WAVES[n - 1];
  return {
    count: definition.roster.length, hp: 24 + (n - 1) * 12 + n * n * 1.5, bonus: 15 + n * 2,
    kinds: [...new Set(definition.roster)], title: definition.title, hint: definition.hint,
    entries: definition.roster.map((kind, i) => ({ kind, lane: i % 2 === 0 ? 'horizontal' : 'vertical', delay: kind === 'group' ? (i % 3 === 2 ? .75 : .1) : kind === 'fast' ? .5 : .65 })),
  };
}

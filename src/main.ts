import './style.css';
import { Game, TOTAL_WAVES, waveInfo } from './game/model';
import type { ActionResult } from './game/model';
import type { Cell } from './game/pathfinding';
import { cellAt } from './view/input';
import { render } from './view/renderer';
import type { ViewState } from './view/renderer';

const icon = (name: string): string => {
  const paths: Record<string, string> = {
    coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8m-3-6h4a2 2 0 0 1 0 4H9"/>',
    heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 0 9 8 15 8-6 12-11 8-15Z"/>',
    wave: '<path d="m3 16 5-8 4 8 4-8 5 8"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    tower: '<rect x="5" y="6" width="14" height="14" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M12 13V3"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.arrow}</svg>`;
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" aria-label="Waypoint ホーム"><span class="brand-mark" aria-hidden="true">W</span><span>WAYPOINT<span class="brand-sub">MAZE DEFENSE</span></span></a>
    <div class="header-right"><span class="edition">PROTOTYPE / 01</span><a class="help-link" href="#guide">遊び方 <span>↗</span></a></div>
  </header>
  <main>
    <section class="intro"><div><div class="eyebrow"><span class="status-dot"></span> BUILD. REDIRECT. DEFEND.</div><h1>道をつくり、<span>守り抜く。</span></h1></div><p>砲台が、道になる。<br>あなただけの迷路で、10のWaveを生き残ろう。</p></section>
    <section class="stats" aria-label="ゲームの状態">
      <div class="stat">${icon('coin')}<div><span class="stat-label">資金 <span>CREDITS</span></span><strong id="money">140</strong><small> C</small></div></div>
      <div class="stat">${icon('heart')}<div><span class="stat-label">ライフ <span>INTEGRITY</span></span><strong id="lives">20</strong><small> / 20</small></div></div>
      <div class="stat">${icon('wave')}<div><span class="stat-label">ウェーブ <span>WAVE</span></span><strong id="wave">0</strong><small> / 10</small></div></div>
      <div class="stat">${icon('target')}<div><span class="stat-label">撃破数 <span>ELIMINATED</span></span><strong id="kills">0</strong><small> 体</small></div></div>
    </section>
    <div class="game-layout">
      <section class="field-panel" aria-label="防衛フィールド">
        <div class="field-toolbar"><div class="field-title"><span class="status-dot"></span><span id="phase">配置フェーズ</span><span class="grid-size">16 × 12</span></div><div class="field-controls"><button id="route-toggle" class="text-button" aria-pressed="true">経路表示</button><button id="speed" class="small-button" aria-label="ゲーム速度を切り替え">1×</button><button id="pause" class="small-button" disabled>一時停止</button></div></div>
        <div class="field-labels"><span><i class="entry-dot"></i> ENTRY</span><span>SECTOR 01 — OPEN GRID</span><span>EXIT <i class="exit-dot"></i></span></div>
        <div class="board-frame">
          <canvas id="battlefield" width="800" height="600" tabindex="0" role="application" aria-label="16列12行の防衛フィールド。クリックかタップで砲台を配置。矢印キーで移動、Enterで配置または選択。" aria-describedby="keyboard-position feedback"></canvas>
          <span id="keyboard-position" class="sr-only">カーソル: 列1、行6</span>
          <div id="board-overlay" class="board-overlay" hidden><span class="eyebrow" id="overlay-label"></span><h2 id="overlay-title"></h2><p id="overlay-text"></p></div>
        </div>
        <div class="field-footer"><div class="legend"><span><i class="legend-tower"></i>砲台</span><span><i class="legend-enemy"></i>敵</span><span><i class="legend-route"></i>進行経路</span></div><span class="cardinal">4-WAY MOVEMENT</span></div>
        <div id="feedback" class="feedback" role="status" aria-live="polite">空いているマスをタップ / クリックして砲台を配置。</div>
      </section>
      <aside class="sidebar" aria-label="建設とウェーブ操作">
        <section class="panel build-card"><div class="panel-heading"><span>01 / BUILD</span><span>建設</span></div>
          <button id="build-tool" class="tower-choice" aria-label="キャノンの配置モード"><span class="tower-art">${icon('tower')}</span><span class="tower-description"><strong>キャノン</strong><small>基本の単体攻撃砲台</small></span><span class="price">20<small> C</small></span></button>
          <div class="mini-stats"><span>攻撃力 <strong>10</strong></span><span>射程 <strong>2.7</strong></span><span>間隔 <strong>0.65s</strong></span></div>
          <p class="build-note">配置した砲台が障害物になります。<br>通り道を残しながら、遠回りさせよう。</p>
        </section>
        <section class="panel selection-card" id="selection-card"><div class="panel-heading"><span>02 / INSPECT</span><span>選択中の砲台</span></div>
          <div id="selection-empty" class="selection-empty">${icon('target')}<p>砲台を選択して<br><span>強化・売却ができます</span></p></div>
          <div id="tower-panel" hidden><div class="selected-heading"><span class="selected-badge">${icon('tower')}</span><div><strong id="selected-name"></strong><small id="selected-cell"></small></div></div><div class="selected-stats"><span>攻撃力 <b id="selected-damage"></b></span><span>射程 <b id="selected-range"></b></span></div><div class="tower-actions"><button id="upgrade" class="upgrade-button"></button><button id="sell" class="sell-button"></button></div></div>
        </section>
        <section class="panel wave-card"><div class="panel-heading"><span id="wave-heading">NEXT WAVE</span><span id="wave-kind">通常部隊</span></div><div class="wave-title"><h2 id="wave-title">Wave 01</h2><span id="wave-detail">9 体</span></div><div class="wave-track"><div id="wave-progress"></div></div><p id="wave-hint">準備ができたら、迎撃を始めよう。</p><button id="start-wave" class="primary-button"><span id="start-label">Wave 01 を開始</span>${icon('arrow')}</button></section>
      </aside>
    </div>
    <section id="guide" class="guide" aria-label="遊び方"><div class="guide-title"><span class="eyebrow">FIELD NOTES</span><h2>3つの基本ルール</h2></div><div><span class="step-number">01</span><h3>砲台で迷路をつくる</h3><p>空きマスに配置。敵はそのたびに<br>出口への最短経路を探し直します。</p></div><div><span class="step-number">02</span><h3>通り道は、残しておく</h3><p>入口や敵を閉じ込める配置は不可。<br>長い道と、射程の重なりがカギ。</p></div><div><span class="step-number">03</span><h3>資金を次の一手に</h3><p>撃破・Waveクリアで資金獲得。<br>強化と売却を使い、10 Waveを防衛。</p></div></section>
    <footer class="site-footer"><span>WAYPOINT <span class="footer-separator">/</span> AN ORIGINAL MAZE DEFENSE</span><button id="restart" class="text-button">${icon('reset')}最初からやり直す</button></footer>
  </main>`;

const game = new Game();
const view: ViewState = { selectedId: null, hover: null, showRoute: true };
const canvas = document.querySelector<HTMLCanvasElement>('#battlefield')!;
const ctx = canvas.getContext('2d')!;
let speed = 1;
let keyboardCell: Cell = { x: 0, y: 5 };
let keyboardActive = false;
let pointerDown: { x: number; y: number } | null = null;

function element<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
function text(id: string, value: string | number): void {
  const node = element(id);
  if (node.textContent !== String(value)) node.textContent = String(value);
}
function feedback(message: string, error = false): void {
  text('feedback', message);
  element('feedback').classList.toggle('error', error);
}
const reasons: Record<string, string> = {
  bounds: 'フィールド内のマスを選んでください。', portal: '入口と出口には配置できません。', occupied: 'このマスには砲台があります。',
  enemy: '敵が通過中のマスには配置できません。', blocked: '通路を完全に塞ぐ配置はできません。敵の通り道を残してください。',
  funds: '資金が足りません。敵を撃破して資金を集めよう。', finished: 'ゲームは終了しました。「最初からやり直す」で再挑戦できます。',
  missing: '砲台を選択してください。', max: 'この砲台は最大レベルです。', busy: '現在のWaveをクリアすると次へ進めます。',
};
function report(result: ActionResult, success: string): void {
  feedback(result.ok ? success : reasons[result.reason], !result.ok);
  syncUI();
}

function activate(cell: Cell): void {
  const tower = game.towers.find(t => t.x === cell.x && t.y === cell.y);
  if (tower) {
    view.selectedId = tower.id;
    feedback('選択した砲台の射程を表示しています。強化・売却ができます。');
  } else {
    const result = game.placeTower(cell);
    if (result.ok) view.selectedId = result.towerId ?? null;
    report(result, 'キャノンを配置しました。さらに配置して、敵を遠回りさせよう。');
  }
  syncUI();
}

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  pointerDown = { x: event.clientX, y: event.clientY };
  keyboardActive = false;
});
canvas.addEventListener('pointerup', event => {
  const down = pointerDown;
  pointerDown = null;
  if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
  const cell = cellAt(event.clientX, event.clientY, canvas.getBoundingClientRect(), game.width, game.height);
  if (cell) activate(cell);
});
canvas.addEventListener('pointercancel', () => { pointerDown = null; });
canvas.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse') {
    keyboardActive = false;
    view.hover = cellAt(event.clientX, event.clientY, canvas.getBoundingClientRect(), game.width, game.height);
  }
});
canvas.addEventListener('pointerleave', () => { if (!keyboardActive) view.hover = null; pointerDown = null; });
canvas.addEventListener('blur', () => { keyboardActive = false; view.hover = null; });
canvas.addEventListener('keydown', event => {
  const deltas: Record<string, Cell> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
  if (deltas[event.key]) {
    event.preventDefault();
    const d = deltas[event.key];
    keyboardCell = { x: Math.max(0, Math.min(game.width - 1, keyboardCell.x + d.x)), y: Math.max(0, Math.min(game.height - 1, keyboardCell.y + d.y)) };
    keyboardActive = true;
    view.hover = keyboardCell;
    text('keyboard-position', `カーソル: 列${keyboardCell.x + 1}、行${keyboardCell.y + 1}`);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate(keyboardCell);
  } else if (event.key === 'Escape') {
    view.selectedId = null; syncUI();
  }
});

element('build-tool').addEventListener('click', () => { view.selectedId = null; feedback('空いているマスをタップ / クリックして砲台を配置。'); syncUI(); });
element('upgrade').addEventListener('click', () => { if (view.selectedId !== null) report(game.upgradeTower(view.selectedId), '砲台を強化しました。攻撃力と射程が上がりました。'); });
element('sell').addEventListener('click', () => {
  if (view.selectedId === null) return;
  const result = game.sellTower(view.selectedId);
  if (result.ok) view.selectedId = null;
  report(result, '砲台を売却し、投資額の70%を回収しました。');
});
element('start-wave').addEventListener('click', () => report(game.startWave(), `Wave ${game.wave} 開始。迎撃中も配置・強化・売却ができます。`));
element('pause').addEventListener('click', () => { game.togglePause(); syncUI(); });
element('speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; text('speed', `${speed}×`); });
element('route-toggle').addEventListener('click', () => { view.showRoute = !view.showRoute; element('route-toggle').setAttribute('aria-pressed', String(view.showRoute)); });
element('restart').addEventListener('click', () => {
  if ((game.wave > 0 || game.towers.length > 0) && !game.finished && !window.confirm('現在のゲームを終了し、最初からやり直しますか？')) return;
  game.restart(); view.selectedId = null; view.hover = null; speed = 1;
  keyboardCell = { x: 0, y: 5 }; text('speed', '1×');
  feedback('新しい防衛を開始しました。砲台を配置して、道をつくろう。'); syncUI();
});

function syncUI(): void {
  text('money', game.money); text('lives', game.lives); text('wave', game.wave); text('kills', game.kills);
  const phase = game.finished ? game.status === 'won' ? '防衛成功' : '防衛失敗' : game.paused ? '一時停止' : game.status === 'running' ? '防衛中' : '配置フェーズ';
  text('phase', phase);
  element('phase').parentElement!.classList.toggle('in-combat', game.status === 'running' && !game.paused);
  const pause = element<HTMLButtonElement>('pause');
  pause.disabled = game.status !== 'running'; text('pause', game.paused ? '再開' : '一時停止');
  const selected = game.towers.find(t => t.id === view.selectedId);
  element('selection-empty').hidden = !!selected;
  element('tower-panel').hidden = !selected;
  element('selection-card').classList.toggle('has-selection', !!selected);
  if (selected) {
    const stats = game.statsFor(selected);
    text('selected-name', `キャノン Lv.${selected.level}`);
    text('selected-cell', `GRID ${String(selected.x + 1).padStart(2, '0')} : ${String(selected.y + 1).padStart(2, '0')}`);
    text('selected-damage', stats.damage); text('selected-range', stats.range);
    text('upgrade', stats.upgradeCost === null ? '最大レベル' : `強化 · ${stats.upgradeCost} C`);
    element<HTMLButtonElement>('upgrade').disabled = game.finished || stats.upgradeCost === null || game.money < stats.upgradeCost;
    text('sell', `売却 · ${Math.floor(selected.spent * 0.7)} C`);
    element<HTMLButtonElement>('sell').disabled = game.finished;
  }
  const active = game.status === 'running';
  const next = active || game.finished ? game.wave : Math.min(TOTAL_WAVES, game.wave + 1);
  const info = waveInfo(next);
  text('wave-heading', game.finished ? 'RESULT' : active ? 'CURRENT WAVE' : 'NEXT WAVE');
  text('wave-title', `Wave ${String(next).padStart(2, '0')}`);
  text('wave-kind', info.heavy ? '重装部隊を含む' : '通常 + 高速部隊');
  text('wave-detail', active ? `残り ${game.remainingToSpawn + game.enemies.length} 体` : `${info.count} 体`);
  element('wave-progress').style.width = `${game.finished ? 100 : active ? (1 - (game.remainingToSpawn + game.enemies.length) / info.count) * 100 : 0}%`;
  text('wave-hint', game.finished ? game.status === 'won' ? 'すべてのWaveを守り抜きました。' : '迷路を見直して、もう一度挑戦しよう。' : active ? '迎撃中も砲台を配置・強化できます。' : `クリア報酬 +${info.bonus} C。準備ができたら開始。`);
  text('start-label', game.finished ? game.status === 'won' ? '全Waveクリア' : '防衛終了' : active ? `Wave ${String(game.wave).padStart(2, '0')} 進行中` : `Wave ${String(next).padStart(2, '0')} を開始`);
  element<HTMLButtonElement>('start-wave').disabled = active || game.finished;
  element('board-overlay').hidden = !game.finished && !game.paused;
  if (game.finished || game.paused) {
    text('overlay-label', game.paused ? 'TACTICAL PAUSE' : game.status === 'won' ? 'MISSION COMPLETE' : 'SIGNAL LOST');
    text('overlay-title', game.paused ? '作戦を練ろう。' : game.status === 'won' ? '防衛、成功。' : 'もう一度、道をつくろう。');
    text('overlay-text', game.paused ? '配置・強化ができます。「再開」で迎撃を続けます。' : game.status === 'won' ? `${game.kills} 体撃破 / 残りライフ ${game.lives}` : `Wave ${game.wave} で防衛終了。下の「最初からやり直す」で再挑戦。`);
  }
}

let lastTime: number | null = null;
document.addEventListener('visibilitychange', () => { lastTime = null; });
function frame(time: number): void {
  const seconds = lastTime === null || document.hidden ? 0 : Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  const before = game.status;
  game.update(seconds * speed);
  if (before === 'running' && game.status !== before) {
    feedback(game.status === 'planning' ? `Wave ${game.wave} クリア！ +${waveInfo(game.wave).bonus} C。次のWaveに備えよう。` : game.status === 'won' ? '防衛成功！ 10のWaveをすべて守り抜きました。' : 'ライフがなくなりました。迷路を見直して再挑戦しよう。');
  }
  syncUI();
  render(ctx, game, view);
  requestAnimationFrame(frame);
}
syncUI();
requestAnimationFrame(frame);

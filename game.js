(() => {
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const NEXT_QUEUE = 3;
  const STORAGE_KEY = 'tetris-settings-v3';
  const LOCK_RESETS_MAX = 15;
  const LINE_FLASH_MS = 260;
  const INFINITY_CLEAR_ROWS = 8;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const board = $('board'); const ctx = board.getContext('2d');
  const nextCanvas = $('next'); const nctx = nextCanvas.getContext('2d');
  const holdCanvas = $('hold'); const hctx = holdCanvas.getContext('2d');
  const modeBgCanvas = $('modeBgCanvas'); const mbctx = modeBgCanvas.getContext('2d');
  const holdPanel = holdCanvas.parentElement;

  const scoreEl = $('score');
  const linesEl = $('lines');
  const levelEl = $('level');
  const goalEl  = $('goal');
  const pointsEl = $('points');
  const timeEl  = $('time');
  const modeNameEl = $('modeName');
  const overlay = $('overlay');
  const overlayTitle = $('overlay-title');
  const overlaySub = $('overlay-sub');
  const popupLayer = $('popupLayer');
  const fxLayer = $('fxLayer');
  const modeBadge = $('modeBadge');

  const pauseBtn = $('pauseBtn');
  const settingsBtn = $('settingsBtn');
  const modeBtn = $('modeBtn');
  const modeSettingsBtn = $('modeSettingsBtn');
  const gameFrame = $('gameFrame');
  const modeSelect = $('modeSelect');

  const modal = $('settingsModal');
  const bindingsGrid = $('bindingsGrid');
  const padBindingsGrid = $('padBindingsGrid');
  const closeSettings = $('closeSettings');
  const applyClose = $('applyClose');
  const resetDefaultsBtn = $('resetDefaults');

  const dasRange = $('dasRange');
  const arrRange = $('arrRange');
  const sdfRange = $('sdfRange');
  const gravRange = $('gravRange');
  const lockRange = $('lockRange');
  const dasVal = $('dasVal');
  const arrVal = $('arrVal');
  const sdfVal = $('sdfVal');
  const gravVal = $('gravVal');
  const lockVal = $('lockVal');
  const bgmRange = $('bgmRange');
  const seRange  = $('seRange');
  const bgmVal   = $('bgmVal');
  const seVal    = $('seVal');
  const cpuSpeedRange = $('cpuSpeedRange');
  const cpuSpeedVal   = $('cpuSpeedVal');

  // ---------- SHAPES & COLORS ----------
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
  };
  const COLORS = {
    I: { base: '#22d3ee', light: '#a5f3fc', dark: '#0e7490' },
    J: { base: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a' },
    L: { base: '#f97316', light: '#fdba74', dark: '#9a3412' },
    O: { base: '#facc15', light: '#fde68a', dark: '#a16207' },
    S: { base: '#22c55e', light: '#86efac', dark: '#166534' },
    T: { base: '#a855f7', light: '#d8b4fe', dark: '#6b21a8' },
    Z: { base: '#ef4444', light: '#fca5a5', dark: '#7f1d1d' },
  };
  const TYPES = Object.keys(SHAPES);
  const ROTATIONS = {};
  for (const t of TYPES) {
    const arr = [SHAPES[t]];
    for (let i = 0; i < 3; i++) arr.push(rotateMatrix(arr[arr.length - 1], 1));
    ROTATIONS[t] = arr;
  }
  function rotateMatrix(matrix, dir) {
    const n = matrix.length;
    const res = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (dir > 0) res[c][n - 1 - r] = matrix[r][c];
      else res[n - 1 - c][r] = matrix[r][c];
    }
    return res;
  }

  // ---------- SETTINGS ----------
  const DEFAULTS = {
    bindings: {
      moveLeft: 'ArrowLeft', moveRight: 'ArrowRight',
      softDrop: 'ArrowDown', hardDrop: 'Space',
      rotateCW: 'ArrowUp', rotateCCW: 'KeyZ', rotate180: 'KeyA',
      hold: 'KeyC', pause: 'KeyP', reset: 'KeyR',
    },
    handling: { das: 150, arr: 40, sdf: 20, gravity: 1000, lockDelay: 500 },
    audio:    { bgm: true, se: true, bgmVolume: 32, seVolume: 55 },
    display:  {
      ghost: true, grid: true, glow: true, stars: true,
      particles: true, shake: true, popups: true, flash: true,
    },
    cpu: { speed: 80, autoRestart: true, showTarget: true },
    gamepadBindings: {
      moveLeft: 14, moveRight: 15, softDrop: 13, hardDrop: 5,
      rotateCW:  0, rotateCCW: 1, rotate180: 3,
      hold: 2, pause: 9, reset: 8,
    },
  };
  const PAD_BUTTON_LABELS = {
    0: 'A / ✕',   1: 'B / ○',   2: 'X / □',   3: 'Y / △',
    4: 'LB / L1', 5: 'RB / R1', 6: 'LT / L2', 7: 'RT / R2',
    8: 'Back',    9: 'Start',
    10: 'LS Press', 11: 'RS Press',
    12: 'D-Pad ↑', 13: 'D-Pad ↓', 14: 'D-Pad ←', 15: 'D-Pad →',
    16: 'Home',
  };
  function padLabel(v) {
    if (v == null) return '—';
    return PAD_BUTTON_LABELS[v] ?? ('Btn ' + v);
  }
  const ACTION_LABELS = [
    ['moveLeft',  '移動: 左'], ['moveRight', '移動: 右'],
    ['softDrop',  'ソフトドロップ'], ['hardDrop', 'ハードドロップ'],
    ['rotateCW',  '右回転'], ['rotateCCW', '左回転'], ['rotate180', '180度回転'],
    ['hold',      'ホールド'], ['pause', '一時停止'], ['reset', 'リスタート'],
  ];
  const KEY_LABEL_MAP = {
    ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓',
    Space:'Space', Enter:'Enter', Tab:'Tab', Backspace:'Bksp',
    ShiftLeft:'L Shift', ShiftRight:'R Shift',
    ControlLeft:'L Ctrl', ControlRight:'R Ctrl',
    AltLeft:'L Alt', AltRight:'R Alt',
    Comma:',', Period:'.', Slash:'/', Semicolon:';', Quote:"'",
    BracketLeft:'[', BracketRight:']', Backslash:'\\',
    Minus:'-', Equal:'=', Backquote:'`',
  };
  function labelForCode(code) {
    if (!code) return '—';
    if (KEY_LABEL_MAP[code]) return KEY_LABEL_MAP[code];
    if (code.startsWith('Key'))    return code.slice(3);
    if (code.startsWith('Digit'))  return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    if (/^F\d+$/.test(code)) return code;
    return code;
  }
  function deepMerge(def, val) {
    if (val === null || typeof val !== 'object' || Array.isArray(val)) return def;
    const out = {};
    for (const k in def) {
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) {
        out[k] = deepMerge(def[k], val[k] ?? {});
      } else {
        out[k] = (val[k] !== undefined) ? val[k] : def[k];
      }
    }
    return out;
  }
  let settings;
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return deepMerge(DEFAULTS, JSON.parse(raw));
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }
  settings = loadSettings();

  // ---------- GAME STATE ----------
  let mode = null;             // 'marathon' | 'cpu' | 'infinity'
  let appState = 'menu';       // 'menu' | 'playing'
  let grid, current, queue, hold, holdLocked;
  let score, lines, level, goal, dropInterval, dropTimer, lastTime;
  let paused, gameOver, bag;
  let startTime, pausedTotal, pauseStarted;
  let modalOpen = false;
  let rebinding = null;
  let wasPausedBeforeModal = false;

  let lastActionWasRotate = false;
  let combo = -1;
  let b2b = 0;
  const held = {};
  const lockDelay = { active: false, timer: 0, resets: 0 };
  let flashing = null;
  const particles = [];
  let shakeAmount = 0;
  let scoreDisplay = 0;
  let bgmStartedOnce = false;

  // CPU state
  let cpuTarget = null;
  let cpuActionTimer = 0;

  // Mode-select background
  const bgPieces = [];
  let bgSpawnTimer = 0;

  // ---------- HELPERS ----------
  function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }
  function nextFromBag() {
    if (bag.length === 0) {
      bag = TYPES.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }
  function refillQueue() {
    while (queue.length < NEXT_QUEUE + 1) queue.push(nextFromBag());
  }
  function makePiece(type) {
    const matrix = SHAPES[type].map(r => r.slice());
    return {
      type, matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: type === 'I' ? -1 : 0,
      rotation: 0,
      rotateCount: 0,
    };
  }
  function spawn(typeOverride) {
    refillQueue();
    const type = typeOverride ?? queue.shift();
    refillQueue();
    current = makePiece(type);
    holdLocked = false;
    holdPanel.classList.remove('locked');
    lockDelay.active = false;
    lockDelay.timer = 0;
    lockDelay.resets = 0;
    lastActionWasRotate = false;
    cpuTarget = null;
    cpuActionTimer = 0;

    if (collides(current, grid)) {
      if (mode === 'infinity') {
        infinityRescue();
        current = makePiece(type);
        if (collides(current, grid)) {
          grid = createGrid();
        }
      } else if (mode === 'cpu' && settings.cpu.autoRestart) {
        gameOver = true;
        showOverlay('CPU RESTART', 'Restarting soon...');
        window.audio.stopBGM();
        window.audio.playSE('gameOver');
        setTimeout(() => { if (mode === 'cpu' && appState === 'playing') reset(); }, 1500);
      } else {
        gameOver = true;
        showOverlay('GAME OVER', 'Press R to restart');
        window.audio.stopBGM();
        window.audio.playSE('gameOver');
      }
    }
    drawNext();
  }
  function collides(piece, g) {
    const { matrix, x, y } = piece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && g[ny][nx]) return true;
      }
    }
    return false;
  }
  function merge(piece, g) {
    piece.matrix.forEach((row, r) => row.forEach((v, c) => {
      if (v) {
        const ny = piece.y + r, nx = piece.x + c;
        if (ny >= 0) g[ny][nx] = piece.type;
      }
    }));
  }
  function tryRotate(dir) {
    if (!current || gameOver || paused || flashing) return false;
    const rotated = rotateMatrix(current.matrix, dir);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      const test = { ...current, matrix: rotated, x: current.x + k };
      if (!collides(test, grid)) {
        current = test;
        current.rotation = (current.rotation + (dir > 0 ? 1 : 3)) % 4;
        current.rotateCount = (current.rotateCount || 0) + 1;
        lastActionWasRotate = true;
        consumeLockReset();
        window.audio.playSE('rotate');
        // 15回目の回転で強制ハードドロップ
        if (current.rotateCount >= 15) {
          spawnPopup('FORCED DROP', 'popup-b2b');
          hardDrop();
        }
        return true;
      }
    }
    return false;
  }
  function move(dx) {
    if (!current || gameOver || paused || flashing) return false;
    const test = { ...current, x: current.x + dx };
    if (!collides(test, grid)) {
      current = test;
      lastActionWasRotate = false;
      consumeLockReset();
      return true;
    }
    return false;
  }
  function stepDown(userTriggered) {
    if (!current || gameOver || paused || flashing) return false;
    const test = { ...current, y: current.y + 1 };
    if (!collides(test, grid)) {
      current = test;
      if (userTriggered) score += 1;
      lastActionWasRotate = false;
      return true;
    }
    return false;
  }
  function hardDrop() {
    if (!current || gameOver || paused || flashing) return;
    let drop = 0;
    while (!collides({ ...current, y: current.y + 1 }, grid)) {
      current.y++; drop++;
    }
    score += drop * 2;
    lastActionWasRotate = false;
    if (settings.display.shake) shake(6 + Math.min(6, drop * 0.4));
    if (settings.display.particles) emitLockParticles(current, true);
    window.audio.playSE('hardDrop');
    lockPiece();
  }
  function isOnGround() {
    return collides({ ...current, y: current.y + 1 }, grid);
  }
  function consumeLockReset() {
    if (lockDelay.active && lockDelay.resets < LOCK_RESETS_MAX) {
      lockDelay.timer = 0;
      lockDelay.resets++;
    }
  }
  function detectTSpin() {
    if (!current || current.type !== 'T' || !lastActionWasRotate) return null;
    const cx = current.x + 1, cy = current.y + 1;
    const corners = [[cx-1,cy-1],[cx+1,cy-1],[cx-1,cy+1],[cx+1,cy+1]];
    let blocked = 0;
    for (const [x, y] of corners) {
      if (x < 0 || x >= COLS || y >= ROWS || y < 0) { blocked++; continue; }
      if (grid[y][x]) blocked++;
    }
    return blocked >= 3 ? 'tspin' : null;
  }
  function lockPiece() {
    if (!current) return;
    merge(current, grid);
    if (settings.display.particles && !flashing) emitLockParticles(current, false);
    window.audio.playSE('lock');
    const tspin = detectTSpin();
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (grid[r].every(cell => cell)) fullRows.push(r);
    }
    if (fullRows.length > 0) {
      flashing = { rows: fullRows, timer: 0, tspin };
    } else {
      if (tspin) applyScoreAndFx(0, tspin);
      combo = -1;
      current = null;
      updateHud();
      spawn();
    }
  }
  function completeLineClear() {
    if (!flashing) return;
    const { rows, tspin } = flashing;
    if (settings.display.particles) {
      for (const r of rows) {
        for (let c = 0; c < COLS; c++) {
          const type = grid[r][c];
          if (type) emitClearParticles(c, r, type);
        }
      }
    }
    // Remove all cleared rows at once, then pad the top with empty rows.
    // Doing this row-by-row with splice+unshift breaks for non-contiguous
    // clears because the unshift shifts remaining target indices.
    const rowSet = new Set(rows);
    const kept = grid.filter((_, r) => !rowSet.has(r));
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++) grid[r] = kept[r];
    applyScoreAndFx(rows.length, tspin);
    if (rows.length === 4 && settings.display.shake) shake(12);
    flashing = null;
    current = null;
    spawn();
  }
  function applyScoreAndFx(cleared, tspin) {
    let base = 0, label = '', popupClass = '', isDifficult = false;
    if (tspin) {
      base = [400, 800, 1200, 1600][cleared] || 400;
      label = cleared === 0 ? 'T-SPIN'
            : cleared === 1 ? 'T-SPIN SINGLE'
            : cleared === 2 ? 'T-SPIN DOUBLE'
            : cleared === 3 ? 'T-SPIN TRIPLE' : 'T-SPIN';
      popupClass = 'popup-tspin';
      isDifficult = cleared > 0;
      window.audio.playSE('tspin');
      if (settings.display.flash) triggerFlash('tspin');
    } else if (cleared > 0) {
      base = [0, 100, 300, 500, 800][cleared];
      label = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][cleared];
      popupClass = cleared === 4 ? 'popup-tetris'
                : cleared === 3 ? 'popup-triple'
                : cleared === 2 ? 'popup-double' : 'popup-single';
      isDifficult = cleared === 4;
      if (cleared === 4) {
        window.audio.playSE('tetris');
        if (settings.display.flash) triggerFlash('tetris');
      } else {
        window.audio.playSE('line' + cleared);
      }
    }
    let b2bBonus = 0;
    if (cleared > 0) {
      if (isDifficult) {
        b2b++;
        if (b2b > 1) {
          b2bBonus = Math.floor(base * 0.5);
          spawnPopup(`B2B x${b2b}`, 'popup-b2b');
          window.audio.playSE('b2b');
        }
      } else b2b = 0;
    }
    let comboBonus = 0;
    if (cleared > 0) {
      combo++;
      if (combo > 0) {
        comboBonus = 50 * combo * level;
        spawnPopup(`COMBO x${combo}`, 'popup-combo');
        window.audio.playSE('combo');
      }
    }
    const total = base * level + b2bBonus + comboBonus;
    if (total > 0) score += total;
    if (cleared > 0) {
      lines += cleared;
      const linesPerLevel = mode === 'infinity' ? 5 : 10;
      const newLevel = Math.floor(lines / linesPerLevel) + 1;
      goal = Math.max(0, newLevel * linesPerLevel - lines);
      if (newLevel !== level) {
        level = newLevel;
        recalcDropInterval();
        spawnPopup(`LEVEL ${level}`, 'popup-levelup');
        window.audio.playSE('levelUp');
        if (settings.display.flash) triggerFlash('level');
      }
    }
    if (label) spawnPopup(label, popupClass);
    if (total > 0) spawnPopup(`+${total}`, 'popup-points');
    bumpDigi(scoreEl);
    if (cleared > 0) bumpDigi(linesEl);
    updateHud();
  }
  function recalcDropInterval() {
    const base = settings.handling.gravity;
    const drop = mode === 'infinity' ? 120 : 80;
    dropInterval = Math.max(60, base - (level - 1) * drop);
  }
  function doHold() {
    if (!current || gameOver || paused || holdLocked || flashing) return;
    const cur = current.type;
    if (hold) { const s = hold; hold = cur; spawn(s); }
    else      { hold = cur; spawn(); }
    holdLocked = true;
    holdPanel.classList.add('locked');
    window.audio.playSE('hold');
    drawHold();
  }
  function getGhost() {
    if (!current) return null;
    const g = { ...current, matrix: current.matrix };
    while (!collides({ ...g, y: g.y + 1 }, grid)) g.y++;
    return g;
  }
  function infinityRescue() {
    for (let r = ROWS - INFINITY_CLEAR_ROWS; r < ROWS; r++) {
      if (r < 0) continue;
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (t) emitClearParticles(c, r, t);
      }
    }
    for (let i = 0; i < INFINITY_CLEAR_ROWS; i++) {
      grid.splice(ROWS - 1, 1);
      grid.unshift(Array(COLS).fill(null));
    }
    spawnPopup('SURVIVE!', 'popup-tetris');
    shake(18);
    window.audio.playSE('tetris');
    if (settings.display.flash) triggerFlash('rescue');
  }

  // ---------- PARTICLES ----------
  function emitLockParticles(piece, big) {
    const col = COLORS[piece.type];
    const [r, g, b] = hexToRgb(col.base);
    piece.matrix.forEach((row, rr) => row.forEach((v, cc) => {
      if (!v) return;
      const px = (piece.x + cc + 0.5) * CELL;
      const py = (piece.y + rr + 0.5) * CELL;
      const count = big ? 8 : 3;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * (big ? 3 : 1.4);
        particles.push({
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (big ? 1 : 0.2),
          life: 0.6 + Math.random() * 0.4, maxLife: 1,
          size: 2 + Math.random() * 2, gravity: 0.12,
          rgb: [r, g, b],
        });
      }
    }));
  }
  function emitClearParticles(cx, cy, type) {
    const col = COLORS[type];
    const [r, g, b] = hexToRgb(col.base);
    const [lr, lg, lb] = hexToRgb(col.light);
    const px = (cx + 0.5) * CELL;
    const py = (cy + 0.5) * CELL;
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      const white = i % 3 === 0;
      particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 - Math.random() * 1.5,
        life: 0.7 + Math.random() * 0.6, maxLife: 1.2,
        size: 2 + Math.random() * 3, gravity: 0.18,
        rgb: white ? [lr, lg, lb] : [r, g, b],
      });
    }
  }
  function updateParticles(dt) {
    const dts = dt / 16.67;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.vy += p.gravity * dts;
      p.life -= dt / 1000;
      if (p.life <= 0 || p.y > ROWS * CELL + 20) particles.splice(i, 1);
    }
  }
  function drawParticles() {
    if (!settings.display.particles) return;
    for (const p of particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${a})`;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
  }
  function shake(amt) { shakeAmount = Math.max(shakeAmount, amt); }
  function applyShake() {
    if (shakeAmount <= 0.3) {
      if (shakeAmount !== 0) { gameFrame.style.transform = ''; shakeAmount = 0; }
      return;
    }
    const x = (Math.random() - 0.5) * shakeAmount;
    const y = (Math.random() - 0.5) * shakeAmount;
    gameFrame.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    shakeAmount *= 0.86;
  }
  function spawnPopup(text, cls) {
    if (!settings.display.popups) return;
    const el = document.createElement('div');
    el.className = 'popup ' + cls;
    el.textContent = text;
    popupLayer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  function bumpDigi(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  function triggerFlash(kind) {
    const el = document.createElement('div');
    el.className = `fx-flash fx-flash-${kind}`;
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
    // Add a shockwave ring
    const ring = document.createElement('div');
    ring.className = 'fx-ring';
    fxLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 1100);
  }

  // ---------- DRAWING ----------
  // Pre-rendered block sprites (one per piece type at CELL size).
  // Rebuilding gradients every frame across 200+ cells was the main cost;
  // drawImage from an offscreen canvas is O(1) per block.
  const blockCache = {};
  function drawBlockAbs(c, px, py, size, type) {
    let cached = blockCache[type];
    if (!cached) {
      cached = document.createElement('canvas');
      cached.width = CELL; cached.height = CELL;
      renderBlockToCtx(cached.getContext('2d'), 0, 0, CELL, type);
      blockCache[type] = cached;
    }
    if (size === CELL) c.drawImage(cached, px, py);
    else c.drawImage(cached, px, py, size, size);
  }
  function renderBlockToCtx(c, px, py, size, type) {
    const col = COLORS[type];
    if (!col) return;
    const s = size, inset = 1;
    const bevel = Math.max(2, Math.floor(s * 0.18));
    const grad = c.createLinearGradient(px, py, px, py + s);
    grad.addColorStop(0, col.light);
    grad.addColorStop(0.45, col.base);
    grad.addColorStop(1, col.dark);
    c.fillStyle = grad;
    c.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);

    c.fillStyle = col.light;
    c.beginPath();
    c.moveTo(px + inset, py + inset);
    c.lineTo(px + s - inset, py + inset);
    c.lineTo(px + s - inset - bevel, py + inset + bevel);
    c.lineTo(px + inset + bevel, py + inset + bevel);
    c.closePath(); c.fill();

    c.fillStyle = withAlpha(col.light, 0.75);
    c.beginPath();
    c.moveTo(px + inset, py + inset);
    c.lineTo(px + inset + bevel, py + inset + bevel);
    c.lineTo(px + inset + bevel, py + s - inset - bevel);
    c.lineTo(px + inset, py + s - inset);
    c.closePath(); c.fill();

    c.fillStyle = col.dark;
    c.beginPath();
    c.moveTo(px + s - inset, py + inset);
    c.lineTo(px + s - inset, py + s - inset);
    c.lineTo(px + s - inset - bevel, py + s - inset - bevel);
    c.lineTo(px + s - inset - bevel, py + inset + bevel);
    c.closePath(); c.fill();

    c.fillStyle = shade(col.dark, -0.2);
    c.beginPath();
    c.moveTo(px + inset, py + s - inset);
    c.lineTo(px + s - inset, py + s - inset);
    c.lineTo(px + s - inset - bevel, py + s - inset - bevel);
    c.lineTo(px + inset + bevel, py + s - inset - bevel);
    c.closePath(); c.fill();

    const gloss = c.createLinearGradient(
      px + inset + bevel, py + inset + bevel,
      px + s - inset - bevel, py + s - inset - bevel
    );
    gloss.addColorStop(0, 'rgba(255,255,255,0.32)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gloss;
    c.fillRect(px + inset + bevel, py + inset + bevel,
      s - (inset + bevel) * 2, s - (inset + bevel) * 2);

    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }
  function drawBlock(c, x, y, size, type) {
    drawBlockAbs(c, x * size, y * size, size, type);
  }
  function drawFlashBlock(c, x, y, size, phase) {
    const px = x * size, py = y * size, s = size;
    const a = 1 - phase * 0.8;
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.fillRect(px + 1, py + 1, s - 2, s - 2);
    c.strokeStyle = `rgba(255,255,255,${a})`;
    c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }
  function drawGhostBlock(c, x, y, size, type) {
    const col = COLORS[type];
    const px = x * size, py = y * size;
    c.fillStyle = withAlpha(col.base, 0.10);
    c.fillRect(px + 2, py + 2, size - 4, size - 4);
    c.strokeStyle = withAlpha(col.light, 0.55);
    c.setLineDash([4, 3]);
    c.lineWidth = 1.5;
    c.strokeRect(px + 2, py + 2, size - 4, size - 4);
    c.setLineDash([]);
  }
  function drawLockDimBlock(c, x, y, size, type, dim) {
    drawBlock(c, x, y, size, type);
    c.fillStyle = `rgba(255,255,255,${dim * 0.35})`;
    c.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  }
  function drawCpuTargetBlock(c, x, y, size, type) {
    const px = x * size, py = y * size;
    c.fillStyle = 'rgba(255, 180, 60, 0.10)';
    c.fillRect(px + 2, py + 2, size - 4, size - 4);
    c.strokeStyle = 'rgba(255, 210, 100, 0.8)';
    c.setLineDash([3, 3]);
    c.lineWidth = 1.5;
    c.strokeRect(px + 2, py + 2, size - 4, size - 4);
    c.setLineDash([]);
  }
  function withAlpha(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
  }
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function drawGrid() {
    ctx.fillStyle = '#0a0014';
    ctx.fillRect(0, 0, board.width, board.height);
    if (!settings.display.grid) return;
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.10)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(COLS * CELL, y * CELL + 0.5);
      ctx.stroke();
    }
  }
  function drawBoard() {
    drawGrid();
    const flashRows = flashing ? new Set(flashing.rows) : null;
    const flashPhase = flashing ? Math.min(1, flashing.timer / LINE_FLASH_MS) : 0;
    for (let r = 0; r < ROWS; r++) {
      const isFlash = flashRows && flashRows.has(r);
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (!t) continue;
        if (isFlash) drawFlashBlock(ctx, c, r, CELL, flashPhase);
        else drawBlock(ctx, c, r, CELL, t);
      }
    }
    if (current && !gameOver && !flashing) {
      // CPU target preview
      if (mode === 'cpu' && cpuTarget && settings.cpu.showTarget) {
        cpuTarget.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (!v) return;
          const ny = cpuTarget.y + r, nx = cpuTarget.x + c;
          if (ny >= 0) drawCpuTargetBlock(ctx, nx, ny, CELL, current.type);
        }));
      }
      if (settings.display.ghost) {
        const ghost = getGhost();
        ghost.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (!v) return;
          const ny = ghost.y + r, nx = ghost.x + c;
          if (ny >= 0) drawGhostBlock(ctx, nx, ny, CELL, ghost.type);
        }));
      }
      let dim = 0;
      if (lockDelay.active && settings.handling.lockDelay > 0) {
        dim = Math.min(1, lockDelay.timer / settings.handling.lockDelay);
      }
      current.matrix.forEach((row, r) => row.forEach((v, c) => {
        if (!v) return;
        const ny = current.y + r, nx = current.x + c;
        if (ny >= 0) {
          if (dim > 0.1) drawLockDimBlock(ctx, nx, ny, CELL, current.type, dim);
          else drawBlock(ctx, nx, ny, CELL, current.type);
        }
      }));
    }
    drawParticles();
  }
  function drawPieceOnCanvas(c, canvas, type, cell) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const m = SHAPES[type];
    let minR = m.length, maxR = -1, minC = m[0].length, maxC = -1;
    for (let r = 0; r < m.length; r++) for (let cc = 0; cc < m[0].length; cc++) {
      if (m[r][cc]) {
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
      }
    }
    const w = (maxC - minC + 1) * cell;
    const h = (maxR - minR + 1) * cell;
    const offX = (canvas.width - w) / 2 - minC * cell;
    const offY = (canvas.height - h) / 2 - minR * cell;
    for (let r = minR; r <= maxR; r++)
      for (let cc = minC; cc <= maxC; cc++)
        if (m[r][cc]) drawBlockAbs(c, offX + cc * cell, offY + r * cell, cell, type);
  }
  function drawNext() {
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const slotH = nextCanvas.height / NEXT_QUEUE;
    const cell = 16;
    for (let i = 0; i < NEXT_QUEUE; i++) {
      const type = queue[i]; if (!type) continue;
      const m = SHAPES[type];
      let minR = m.length, maxR = -1, minC = m[0].length, maxC = -1;
      for (let r = 0; r < m.length; r++) for (let cc = 0; cc < m[0].length; cc++) {
        if (m[r][cc]) {
          if (r < minR) minR = r; if (r > maxR) maxR = r;
          if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
        }
      }
      const w = (maxC - minC + 1) * cell;
      const h = (maxR - minR + 1) * cell;
      const offX = (nextCanvas.width - w) / 2 - minC * cell;
      const offY = i * slotH + (slotH - h) / 2 - minR * cell;
      for (let r = minR; r <= maxR; r++)
        for (let cc = minC; cc <= maxC; cc++)
          if (m[r][cc]) drawBlockAbs(nctx, offX + cc * cell, offY + r * cell, cell, type);
      if (i < NEXT_QUEUE - 1) {
        nctx.strokeStyle = 'rgba(140, 240, 255, 0.18)';
        nctx.lineWidth = 1;
        nctx.beginPath();
        nctx.moveTo(8, (i + 1) * slotH + 0.5);
        nctx.lineTo(nextCanvas.width - 8, (i + 1) * slotH + 0.5);
        nctx.stroke();
      }
    }
  }
  function drawHold() { drawPieceOnCanvas(hctx, holdCanvas, hold, 14); }

  // ---------- HUD ----------
  function fmtTime(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(min)}:${pad(sec)}:${pad(cs)}`;
  }
  function updateHud() {
    linesEl.textContent = String(lines).padStart(3, '0');
    levelEl.textContent = level;
    if (goalEl)  goalEl.textContent  = mode === 'infinity' ? '∞' : goal;
    if (pointsEl) pointsEl.textContent = `x${level}`;
  }
  function tickScoreDisplay() {
    const diff = score - scoreDisplay;
    if (Math.abs(diff) < 0.5) scoreDisplay = score;
    else scoreDisplay += diff * 0.14;
    scoreEl.textContent = String(Math.round(scoreDisplay)).padStart(4, '0');
  }
  function updateTime(now) {
    if (!startTime) return;
    let elapsed;
    if (paused && pauseStarted) elapsed = pauseStarted - startTime - pausedTotal;
    else elapsed = now - startTime - pausedTotal;
    timeEl.textContent = fmtTime(Math.max(0, elapsed));
  }
  function showOverlay(title, sub) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }
  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    const now = performance.now();
    if (paused) {
      pauseStarted = now;
      showOverlay('PAUSED', 'Press P to resume');
      window.audio.stopBGM();
      window.audio.playSE('pause');
    } else {
      if (pauseStarted) pausedTotal += now - pauseStarted;
      pauseStarted = 0;
      hideOverlay();
      window.audio.startBGM();
      window.audio.playSE('pause');
    }
    clearHeld();
  }
  function clearHeld() { for (const k in held) delete held[k]; }

  // ---------- INPUT ----------
  function triggerAction(action) {
    if (gameOver && action !== 'reset') return;
    if (mode === 'cpu' && action !== 'pause' && action !== 'reset') return; // block player in CPU mode
    switch (action) {
      case 'moveLeft':  if (move(-1)) window.audio.playSE('move'); break;
      case 'moveRight': if (move(1))  window.audio.playSE('move'); break;
      case 'softDrop':  if (stepDown(true)) { window.audio.playSE('softDrop'); dropTimer = 0; } break;
      case 'hardDrop':  hardDrop(); break;
      case 'rotateCW':  tryRotate(1); break;
      case 'rotateCCW': tryRotate(-1); break;
      case 'rotate180': tryRotate(1); tryRotate(1); break;
      case 'hold':      doHold(); break;
      case 'pause':     togglePause(); break;
      case 'reset':     reset(); break;
    }
  }
  function findActionByCode(code) {
    for (const action in settings.bindings) {
      if (settings.bindings[action] === code) return action;
    }
    return null;
  }
  function processHeld(now) {
    if (paused || gameOver || flashing) return;
    if (mode === 'cpu') return;
    const das = settings.handling.das;
    const arr = settings.handling.arr;
    for (const action of ['moveLeft', 'moveRight']) {
      for (const source of [held, padHeld]) {
        const state = source[action];
        if (!state) continue;
        if (now - state.since < das) continue;
        if (arr === 0) {
          let safety = COLS;
          while (safety-- > 0) {
            if (action === 'moveLeft' ? !move(-1) : !move(1)) break;
          }
          state.lastTrigger = now;
        } else {
          while (state.lastTrigger + arr <= now) {
            triggerAction(action);
            state.lastTrigger += arr;
          }
        }
      }
    }
  }

  // ---------- GAMEPAD (Bluetooth / USB) ----------
  // Uses standard-mapping Gamepad API — works with Xbox / PS / Switch Pro / mobile pads
  // once paired at the OS level.
  const padHeld = {};           // action -> { since, lastTrigger }
  const padPressed = {};        // action -> boolean (edge state, action-keyed)
  const padCapturePrev = {};    // idx -> boolean (edge state during rebinding)
  let gamepadConnected = false;
  let padRebinding = null;      // action name currently listening for a button, or null

  window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    console.log('Gamepad connected:', e.gamepad.id);
    if (appState === 'playing') spawnPopup('PAD CONNECTED', 'popup-mode');
  });
  window.addEventListener('gamepaddisconnected', () => {
    gamepadConnected = false;
    for (const k in padHeld) delete padHeld[k];
    for (const k in padPressed) delete padPressed[k];
    for (const k in padCapturePrev) delete padCapturePrev[k];
  });

  function pollGamepad(now) {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad = null;
    for (const p of pads) { if (p && p.connected) { pad = p; break; } }
    if (!pad) return;

    // Rebinding mode: absorb button presses and assign
    if (padRebinding) {
      for (let i = 0; i < pad.buttons.length; i++) {
        const btn = pad.buttons[i];
        const pressed = !!(btn && (btn.pressed || btn.value > 0.5));
        if (pressed && !padCapturePrev[i]) {
          assignPadBinding(padRebinding, i);
          for (const k in padCapturePrev) delete padCapturePrev[k];
          return;
        }
        padCapturePrev[i] = pressed;
      }
      return;
    }

    // Build "active this frame" set from bound buttons + sticks (movement).
    const active = {};
    const bindings = settings.gamepadBindings;
    for (const action in bindings) {
      const idx = bindings[action];
      if (idx == null) continue;
      const btn = pad.buttons[idx];
      if (btn && (btn.pressed || btn.value > 0.5)) active[action] = true;
    }
    // Left stick — always drives movement / drop (non-configurable escape hatch).
    const T = 0.5;
    const stickX = pad.axes[0] || 0;
    const stickY = pad.axes[1] || 0;
    if (stickX < -T) active.moveLeft  = true;
    if (stickX >  T) active.moveRight = true;
    if (stickY >  T) active.softDrop  = true;
    if (stickY < -T) active.hardDrop  = true;

    // Edge: newly-active actions fire once.
    for (const action in active) {
      if (!padPressed[action]) padPress(action, now);
      padPressed[action] = true;
    }
    // Release: previously-active actions no longer active.
    for (const action of Object.keys(padPressed)) {
      if (!active[action]) {
        delete padPressed[action];
        delete padHeld[action];
      }
    }
  }

  function padPress(action, now) {
    window.audio.resume();
    if (!bgmStartedOnce && settings.audio.bgm && appState === 'playing') {
      window.audio.startBGM(); bgmStartedOnce = true;
    }
    if (appState === 'menu') {
      const cards = Array.from(document.querySelectorAll('.mode-card'));
      let idx = cards.findIndex(c => c === document.activeElement);
      if (idx === -1) idx = 1;
      if (action === 'moveLeft')       cards[(idx + cards.length - 1) % cards.length].focus();
      else if (action === 'moveRight') cards[(idx + 1) % cards.length].focus();
      else if (action === 'rotateCW' || action === 'hardDrop') {
        const card = cards[idx === -1 ? 1 : idx];
        if (card) chooseMode(card.dataset.mode, card);
      }
      return;
    }
    if (modalOpen) {
      if (action === 'pause' || action === 'rotateCCW') closeModal();
      return;
    }
    if (!padHeld[action] && (action === 'moveLeft' || action === 'moveRight')) {
      padHeld[action] = { since: now, lastTrigger: now };
    }
    triggerAction(action);
  }

  // ---------- CPU AI ----------
  function evaluateGrid(g) {
    const heights = new Array(COLS).fill(0);
    let holes = 0;
    for (let c = 0; c < COLS; c++) {
      let firstBlock = -1;
      for (let r = 0; r < ROWS; r++) {
        if (g[r][c]) {
          if (firstBlock === -1) { firstBlock = r; heights[c] = ROWS - r; }
        } else if (firstBlock !== -1) holes++;
      }
    }
    const totalH = heights.reduce((a, b) => a + b, 0);
    const maxH = Math.max(...heights);
    let bump = 0;
    for (let i = 0; i < COLS - 1; i++) bump += Math.abs(heights[i] - heights[i+1]);
    let complete = 0;
    for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
    return -0.51*totalH - 0.76*holes - 0.18*bump + 0.76*complete - 0.28*maxH;
  }
  function findBestMove(piece, snapshot) {
    let best = null;
    const shapes = ROTATIONS[piece.type];
    for (let rot = 0; rot < shapes.length; rot++) {
      const matrix = shapes[rot];
      for (let x = -matrix.length; x <= COLS; x++) {
        // check horizontal bounds
        let ok = true;
        for (let r = 0; r < matrix.length && ok; r++) {
          for (let c = 0; c < matrix[r].length && ok; c++) {
            if (matrix[r][c]) {
              const nx = x + c;
              if (nx < 0 || nx >= COLS) ok = false;
            }
          }
        }
        if (!ok) continue;
        // find drop y
        let y = -3;
        const testPiece = { type: piece.type, matrix, x, y };
        if (collides({ ...testPiece }, snapshot)) continue;
        while (!collides({ ...testPiece, y: y + 1 }, snapshot)) {
          y++;
          if (y >= ROWS) break;
        }
        if (y < 0) continue;
        testPiece.y = y;
        const simGrid = snapshot.map(r => r.slice());
        merge(testPiece, simGrid);
        const s = evaluateGrid(simGrid);
        if (!best || s > best.score) {
          best = { score: s, x, y, rotation: rot, matrix };
        }
      }
    }
    return best;
  }
  function cpuStep(dt) {
    if (mode !== 'cpu' || !current || gameOver || paused || flashing) return;
    cpuActionTimer += dt;
    if (cpuActionTimer < settings.cpu.speed) return;
    cpuActionTimer = 0;

    if (!cpuTarget) {
      cpuTarget = findBestMove(current, grid);
      if (!cpuTarget) { hardDrop(); return; }
    }
    if (current.rotation !== cpuTarget.rotation) {
      if (!tryRotate(1)) {
        // rotation blocked — nudge horizontally then retry
        if (current.x < cpuTarget.x) move(1);
        else move(-1);
      }
      return;
    }
    if (current.x < cpuTarget.x) { if (move(1))  window.audio.playSE('move'); return; }
    if (current.x > cpuTarget.x) { if (move(-1)) window.audio.playSE('move'); return; }
    hardDrop();
    cpuTarget = null;
  }

  document.addEventListener('keydown', (e) => {
    if (rebinding) {
      e.preventDefault();
      if (e.code === 'Escape') { stopRebind(); return; }
      assignBinding(rebinding, e.code);
      return;
    }
    if (modalOpen) {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (padRebinding) stopPadRebind();
        else closeModal();
      }
      return;
    }
    if (appState === 'menu') {
      // Card keyboard navigation
      const cards = Array.from(document.querySelectorAll('.mode-card'));
      let idx = cards.findIndex(c => c === document.activeElement);
      if (idx === -1) idx = 1; // default to middle
      if (e.code === 'ArrowLeft')  { cards[(idx + cards.length - 1) % cards.length].focus(); e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { cards[(idx + 1) % cards.length].focus(); e.preventDefault(); return; }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        window.audio.resume();
        const card = cards[idx === -1 ? 1 : idx];
        if (card) chooseMode(card.dataset.mode, card);
      }
      return;
    }
    const action = findActionByCode(e.code);
    if (!action) return;
    if (e.repeat) { e.preventDefault(); return; }
    e.preventDefault();
    window.audio.resume();
    if (!bgmStartedOnce && settings.audio.bgm) { window.audio.startBGM(); bgmStartedOnce = true; }
    const now = performance.now();
    if (!held[action]) {
      held[action] = { since: now, lastTrigger: now };
      triggerAction(action);
    }
  });
  document.addEventListener('keyup', (e) => {
    const action = findActionByCode(e.code);
    if (action && held[action]) delete held[action];
  });
  window.addEventListener('blur', clearHeld);

  pauseBtn.addEventListener('click', () => {
    window.audio.resume();
    if (!bgmStartedOnce && settings.audio.bgm) { window.audio.startBGM(); bgmStartedOnce = true; }
    togglePause();
    pauseBtn.blur();
  });
  settingsBtn.addEventListener('click', () => { window.audio.resume(); openModal(); });
  modeSettingsBtn.addEventListener('click', () => { window.audio.resume(); openModal(); });
  modeBtn.addEventListener('click', () => { window.audio.resume(); showModeSelect(); });

  // ---------- MODE SELECT ----------
  const modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      window.audio.resume();
      chooseMode(card.dataset.mode, card);
    });
    // 3D tilt on hover
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width  - 0.5;
      const dy = (e.clientY - rect.top ) / rect.height - 0.5;
      card.style.transform = `translateY(-6px) scale(1.03) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  function chooseMode(m, cardEl) {
    if (!m || appState !== 'menu') return;
    window.audio.playSE('tetris');
    if (cardEl) cardEl.classList.add('selecting');
    modeCards.forEach(c => { if (c !== cardEl) c.classList.add('dismissing'); });
    setTimeout(() => {
      mode = m;
      appState = 'playing';
      modeSelect.classList.add('hidden');
      modeBgCanvas.classList.remove('visible');
      document.body.classList.remove('mode-marathon', 'mode-cpu', 'mode-infinity');
      document.body.classList.add(`mode-${mode}`);
      gameFrame.classList.remove('hidden');
      // restart frame entrance animation
      gameFrame.style.animation = 'none';
      void gameFrame.offsetWidth;
      gameFrame.style.animation = '';
      reset();
      if (settings.audio.bgm) { window.audio.startBGM(); bgmStartedOnce = true; }
      updateModeBadge();
      spawnPopup(mode.toUpperCase(), 'popup-mode');
    }, 550);
  }
  function showModeSelect() {
    appState = 'menu';
    mode = null;
    document.body.classList.remove('mode-marathon', 'mode-cpu', 'mode-infinity');
    window.audio.stopBGM();
    gameFrame.classList.add('hidden');
    modeSelect.classList.remove('hidden');
    modeBgCanvas.classList.add('visible');
    modeCards.forEach(c => {
      c.classList.remove('selecting', 'dismissing');
      c.style.animation = 'none';
      void c.offsetWidth;
      c.style.animation = '';
      c.style.transform = '';
    });
  }
  function updateModeBadge() {
    if (mode === 'marathon') {
      modeBadge.classList.add('hidden');
      modeNameEl.textContent = 'MARATHON';
      modeNameEl.className = 'mini-value';
    } else if (mode === 'cpu') {
      modeBadge.classList.remove('hidden');
      modeBadge.classList.add('mode-cpu');
      modeBadge.classList.remove('mode-infinity');
      modeBadge.textContent = 'CPU AUTO';
      modeNameEl.textContent = 'CPU';
      modeNameEl.className = 'mini-value mode-cpu';
    } else if (mode === 'infinity') {
      modeBadge.classList.remove('hidden');
      modeBadge.classList.add('mode-infinity');
      modeBadge.classList.remove('mode-cpu');
      modeBadge.textContent = 'INFINITY ∞';
      modeNameEl.textContent = 'INFINITY';
      modeNameEl.className = 'mini-value mode-infinity';
    }
  }

  // ---------- MODE BG (falling tetriminoes) ----------
  function resizeModeBg() {
    modeBgCanvas.width = window.innerWidth;
    modeBgCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeModeBg);
  resizeModeBg();

  function spawnBgPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const size = 14 + Math.random() * 22;
    bgPieces.push({
      type, size,
      x: Math.random() * modeBgCanvas.width,
      y: -80 - Math.random() * 100,
      vy: 0.4 + Math.random() * 1.3,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.015,
      alpha: 0.10 + Math.random() * 0.22,
    });
  }
  function updateModeBg(dt) {
    if (appState !== 'menu') return;
    bgSpawnTimer += dt;
    if (bgSpawnTimer > 550 && bgPieces.length < 10) { bgSpawnTimer = 0; spawnBgPiece(); }
    mbctx.clearRect(0, 0, modeBgCanvas.width, modeBgCanvas.height);
    const dts = dt / 16.67;
    for (let i = bgPieces.length - 1; i >= 0; i--) {
      const p = bgPieces[i];
      p.y += p.vy * dts;
      p.rotation += p.vr * dts;
      if (p.y > modeBgCanvas.height + 100) { bgPieces.splice(i, 1); continue; }
      mbctx.save();
      mbctx.translate(p.x, p.y);
      mbctx.rotate(p.rotation);
      mbctx.globalAlpha = p.alpha;
      const m = SHAPES[p.type];
      const halfW = m[0].length * p.size / 2;
      const halfH = m.length * p.size / 2;
      for (let r = 0; r < m.length; r++)
        for (let c = 0; c < m[r].length; c++)
          if (m[r][c]) drawBlockAbs(mbctx, c * p.size - halfW, r * p.size - halfH, p.size, p.type);
      mbctx.restore();
    }
  }
  // Pre-seed a few pieces so the menu isn't empty on load
  for (let i = 0; i < 4; i++) {
    spawnBgPiece();
    bgPieces[bgPieces.length - 1].y = Math.random() * modeBgCanvas.height;
  }
  modeBgCanvas.classList.add('visible');

  // ---------- SETTINGS MODAL ----------
  function buildBindingRows() {
    bindingsGrid.innerHTML = '';
    for (const [action, label] of ACTION_LABELS) {
      const row = document.createElement('div');
      row.className = 'binding-row';
      const lab = document.createElement('span');
      lab.className = 'binding-label';
      lab.textContent = label;
      const btn = document.createElement('button');
      btn.className = 'binding-key';
      btn.dataset.action = action;
      btn.textContent = labelForCode(settings.bindings[action]);
      btn.addEventListener('click', () => startRebind(action));
      row.appendChild(lab);
      row.appendChild(btn);
      bindingsGrid.appendChild(row);
    }
  }
  function refreshBindingButtons() {
    const codes = Object.values(settings.bindings);
    const dupCodes = new Set(codes.filter((c, i) => codes.indexOf(c) !== i));
    bindingsGrid.querySelectorAll('.binding-key').forEach(btn => {
      const action = btn.dataset.action;
      const code = settings.bindings[action];
      btn.textContent = btn.classList.contains('listening') ? 'press key…' : labelForCode(code);
      btn.classList.toggle('duplicate', dupCodes.has(code));
    });
  }
  function startRebind(action) {
    stopRebind();
    rebinding = action;
    const btn = bindingsGrid.querySelector(`.binding-key[data-action="${action}"]`);
    if (btn) { btn.classList.add('listening'); btn.textContent = 'press key…'; }
  }
  function stopRebind() {
    if (!rebinding) return;
    const btn = bindingsGrid.querySelector(`.binding-key[data-action="${rebinding}"]`);
    if (btn) btn.classList.remove('listening');
    rebinding = null;
    refreshBindingButtons();
  }
  function assignBinding(action, code) {
    let conflict = null;
    for (const a in settings.bindings) {
      if (a !== action && settings.bindings[a] === code) { conflict = a; break; }
    }
    if (conflict) settings.bindings[conflict] = settings.bindings[action];
    settings.bindings[action] = code;
    stopRebind();
    saveSettings();
    refreshBindingButtons();
  }

  // ---- Gamepad binding UI (mirrors keyboard bindings) ----
  function buildPadBindingRows() {
    if (!padBindingsGrid) return;
    padBindingsGrid.innerHTML = '';
    for (const [action, label] of ACTION_LABELS) {
      const row = document.createElement('div');
      row.className = 'binding-row';
      const lab = document.createElement('span');
      lab.className = 'binding-label';
      lab.textContent = label;
      const btn = document.createElement('button');
      btn.className = 'binding-key';
      btn.dataset.padAction = action;
      btn.textContent = padLabel(settings.gamepadBindings[action]);
      btn.addEventListener('click', () => startPadRebind(action));
      row.appendChild(lab);
      row.appendChild(btn);
      padBindingsGrid.appendChild(row);
    }
  }
  function refreshPadBindingButtons() {
    if (!padBindingsGrid) return;
    const codes = Object.values(settings.gamepadBindings).filter(v => v != null);
    const dupCodes = new Set(codes.filter((c, i) => codes.indexOf(c) !== i));
    padBindingsGrid.querySelectorAll('.binding-key').forEach(btn => {
      const action = btn.dataset.padAction;
      const code = settings.gamepadBindings[action];
      btn.textContent = btn.classList.contains('listening') ? 'press pad btn…' : padLabel(code);
      btn.classList.toggle('duplicate', code != null && dupCodes.has(code));
    });
  }
  function startPadRebind(action) {
    stopPadRebind();
    padRebinding = action;
    // seed capturePrev with current pad state so already-held buttons don't fire
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (p && p.connected) {
        for (let i = 0; i < p.buttons.length; i++) {
          const b = p.buttons[i];
          padCapturePrev[i] = !!(b && (b.pressed || b.value > 0.5));
        }
        break;
      }
    }
    const btn = padBindingsGrid.querySelector(`.binding-key[data-pad-action="${action}"]`);
    if (btn) { btn.classList.add('listening'); btn.textContent = 'press pad btn…'; }
  }
  function stopPadRebind() {
    if (!padRebinding) return;
    const btn = padBindingsGrid.querySelector(`.binding-key[data-pad-action="${padRebinding}"]`);
    if (btn) btn.classList.remove('listening');
    padRebinding = null;
    for (const k in padCapturePrev) delete padCapturePrev[k];
    refreshPadBindingButtons();
  }
  function assignPadBinding(action, idx) {
    let conflict = null;
    for (const a in settings.gamepadBindings) {
      if (a !== action && settings.gamepadBindings[a] === idx) { conflict = a; break; }
    }
    if (conflict) settings.gamepadBindings[conflict] = settings.gamepadBindings[action];
    settings.gamepadBindings[action] = idx;
    stopPadRebind();
    saveSettings();
    refreshPadBindingButtons();
  }
  function syncSlidersFromSettings() {
    dasRange.value = settings.handling.das;
    arrRange.value = settings.handling.arr;
    sdfRange.value = settings.handling.sdf;
    gravRange.value = settings.handling.gravity;
    lockRange.value = settings.handling.lockDelay;
    dasVal.textContent = `${settings.handling.das} ms`;
    arrVal.textContent = settings.handling.arr === 0 ? '0 ms (instant)' : `${settings.handling.arr} ms`;
    sdfVal.textContent = `x${settings.handling.sdf}`;
    gravVal.textContent = `${settings.handling.gravity} ms`;
    lockVal.textContent = settings.handling.lockDelay === 0 ? 'OFF' : `${settings.handling.lockDelay} ms`;
    bgmRange.value = settings.audio.bgmVolume;
    seRange.value  = settings.audio.seVolume;
    bgmVal.textContent = `${settings.audio.bgmVolume}%`;
    seVal.textContent  = `${settings.audio.seVolume}%`;
    cpuSpeedRange.value = settings.cpu.speed;
    cpuSpeedVal.textContent = `${settings.cpu.speed} ms`;
  }
  function syncTogglesFromSettings() {
    modal.querySelectorAll('[data-toggle-display]').forEach(t => {
      const k = t.dataset.toggleDisplay;
      t.setAttribute('aria-pressed', settings.display[k] ? 'true' : 'false');
    });
    modal.querySelectorAll('[data-toggle-audio]').forEach(t => {
      const k = t.dataset.toggleAudio;
      t.setAttribute('aria-pressed', settings.audio[k] ? 'true' : 'false');
    });
    modal.querySelectorAll('[data-toggle-cpu]').forEach(t => {
      const k = t.dataset.toggleCpu;
      t.setAttribute('aria-pressed', settings.cpu[k] ? 'true' : 'false');
    });
    applyDisplaySettings();
    applyAudioSettings();
  }
  function applyDisplaySettings() {
    document.body.classList.toggle('no-glow',  !settings.display.glow);
    document.body.classList.toggle('no-stars', !settings.display.stars);
  }
  function applyAudioSettings() {
    window.audio.setBgmVolume(settings.audio.bgmVolume / 100);
    window.audio.setSeVolume (settings.audio.seVolume / 100);
    window.audio.setBgmEnabled(settings.audio.bgm);
    window.audio.setSeEnabled (settings.audio.se);
  }

  dasRange.addEventListener('input', () => { settings.handling.das = +dasRange.value; dasVal.textContent = `${settings.handling.das} ms`; saveSettings(); });
  arrRange.addEventListener('input', () => { settings.handling.arr = +arrRange.value; arrVal.textContent = settings.handling.arr === 0 ? '0 ms (instant)' : `${settings.handling.arr} ms`; saveSettings(); });
  sdfRange.addEventListener('input', () => { settings.handling.sdf = +sdfRange.value; sdfVal.textContent = `x${settings.handling.sdf}`; saveSettings(); });
  gravRange.addEventListener('input', () => { settings.handling.gravity = +gravRange.value; gravVal.textContent = `${settings.handling.gravity} ms`; recalcDropInterval(); saveSettings(); });
  lockRange.addEventListener('input', () => { settings.handling.lockDelay = +lockRange.value; lockVal.textContent = settings.handling.lockDelay === 0 ? 'OFF' : `${settings.handling.lockDelay} ms`; saveSettings(); });
  bgmRange.addEventListener('input', () => { settings.audio.bgmVolume = +bgmRange.value; bgmVal.textContent = `${settings.audio.bgmVolume}%`; window.audio.setBgmVolume(settings.audio.bgmVolume / 100); saveSettings(); });
  seRange .addEventListener('input', () => { settings.audio.seVolume  = +seRange.value;  seVal.textContent  = `${settings.audio.seVolume}%`;  window.audio.setSeVolume (settings.audio.seVolume / 100);  saveSettings(); });
  cpuSpeedRange.addEventListener('input', () => { settings.cpu.speed = +cpuSpeedRange.value; cpuSpeedVal.textContent = `${settings.cpu.speed} ms`; saveSettings(); });

  modal.querySelectorAll('[data-toggle-display]').forEach(t => {
    t.addEventListener('click', () => {
      const key = t.dataset.toggleDisplay;
      settings.display[key] = !settings.display[key];
      t.setAttribute('aria-pressed', settings.display[key] ? 'true' : 'false');
      applyDisplaySettings();
      saveSettings();
    });
  });
  modal.querySelectorAll('[data-toggle-audio]').forEach(t => {
    t.addEventListener('click', () => {
      const key = t.dataset.toggleAudio;
      settings.audio[key] = !settings.audio[key];
      t.setAttribute('aria-pressed', settings.audio[key] ? 'true' : 'false');
      applyAudioSettings();
      if (key === 'bgm' && settings.audio.bgm && !paused && !gameOver && appState === 'playing') {
        window.audio.resume(); window.audio.startBGM(); bgmStartedOnce = true;
      }
      if (key === 'se' && settings.audio.se) window.audio.playSE('move');
      saveSettings();
    });
  });
  modal.querySelectorAll('[data-toggle-cpu]').forEach(t => {
    t.addEventListener('click', () => {
      const key = t.dataset.toggleCpu;
      settings.cpu[key] = !settings.cpu[key];
      t.setAttribute('aria-pressed', settings.cpu[key] ? 'true' : 'false');
      saveSettings();
    });
  });

  function openModal() {
    if (modalOpen) return;
    wasPausedBeforeModal = paused;
    if (appState === 'playing' && !paused && !gameOver) togglePause();
    modalOpen = true;
    buildBindingRows();
    refreshBindingButtons();
    buildPadBindingRows();
    refreshPadBindingButtons();
    syncSlidersFromSettings();
    syncTogglesFromSettings();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    clearHeld();
  }
  function closeModal() {
    if (!modalOpen) return;
    stopRebind();
    stopPadRebind();
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    modalOpen = false;
    if (appState === 'playing' && !wasPausedBeforeModal && paused && !gameOver) togglePause();
  }
  closeSettings.addEventListener('click', closeModal);
  applyClose.addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  resetDefaultsBtn.addEventListener('click', () => {
    settings = JSON.parse(JSON.stringify(DEFAULTS));
    saveSettings();
    buildBindingRows();
    refreshBindingButtons();
    buildPadBindingRows();
    refreshPadBindingButtons();
    syncSlidersFromSettings();
    syncTogglesFromSettings();
    recalcDropInterval();
  });

  // ---------- RESET / LOOP ----------
  function reset() {
    grid = createGrid();
    score = 0; scoreDisplay = 0;
    lines = 0; level = 1;
    goal = mode === 'infinity' ? 5 : 10;
    combo = -1; b2b = 0;
    recalcDropInterval();
    dropTimer = 0;
    gameOver = false; paused = false;
    bag = []; queue = [];
    hold = null; holdLocked = false; holdPanel.classList.remove('locked');
    startTime = performance.now();
    pausedTotal = 0; pauseStarted = 0;
    flashing = null;
    particles.length = 0;
    shakeAmount = 0;
    gameFrame.style.transform = '';
    popupLayer.innerHTML = '';
    fxLayer.innerHTML = '';
    clearHeld();
    cpuTarget = null;
    cpuActionTimer = 0;
    refillQueue();
    spawn();
    updateHud();
    drawHold();
    hideOverlay();
    window.audio.stopBGM();
    if (settings.audio.bgm && bgmStartedOnce) window.audio.startBGM();
  }
  function loop(t) {
    const dt = Math.min(100, t - lastTime);
    lastTime = t;

    pollGamepad(t);
    if (appState === 'menu') {
      updateModeBg(dt);
    } else if (appState === 'playing') {
      if (!paused && !gameOver) {
        if (flashing) {
          flashing.timer += dt;
          if (flashing.timer >= LINE_FLASH_MS) completeLineClear();
        } else {
          if (mode === 'cpu') cpuStep(dt);
          else processHeld(t);

          const isSoft = !!held.softDrop || !!padHeld.softDrop;
          const interval = isSoft
            ? Math.max(16, dropInterval / settings.handling.sdf)
            : dropInterval;
          const ground = current ? isOnGround() : false;

          if (!ground) {
            lockDelay.active = false; lockDelay.timer = 0; lockDelay.resets = 0;
            dropTimer += dt;
            let safety = 30;
            while (dropTimer >= interval && safety-- > 0) {
              dropTimer -= interval;
              if (!stepDown(isSoft)) break;
              if (gameOver || flashing) break;
            }
          } else {
            dropTimer = 0;
            if (settings.handling.lockDelay <= 0 || mode === 'cpu') {
              lockPiece();
            } else {
              if (!lockDelay.active) {
                lockDelay.active = true; lockDelay.timer = 0; lockDelay.resets = 0;
              }
              lockDelay.timer += dt;
              if (lockDelay.timer >= settings.handling.lockDelay) lockPiece();
            }
          }
        }
      }
      updateParticles(dt);
      drawBoard();
      applyShake();
      updateTime(t);
      tickScoreDisplay();
    }

    requestAnimationFrame(loop);
  }

  applyDisplaySettings();
  applyAudioSettings();
  updateHud();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();

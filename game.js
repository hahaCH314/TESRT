(() => {
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const NEXT_QUEUE = 3;
  const STORAGE_KEY = 'tetris-settings-v3';
  const LOCK_RESETS_MAX = 15;
  const LINE_FLASH_MS = 260;
  const INFINITY_CLEAR_ROWS = 8;
  // Garbage sent per lines cleared (idx = lines cleared). T-Spin/B2B add bonuses.
  // Garbage sent per lines cleared. Buffed vs. standard to make VS CPU
  // winnable — singles now send 1 row so even novice clears build pressure.
  const GARBAGE_BY_LINES = [0, 1, 2, 4, 8];

  const $ = (id) => document.getElementById(id);

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
    I: { base:'#22d3ee', light:'#a5f3fc', dark:'#0e7490' },
    J: { base:'#3b82f6', light:'#93c5fd', dark:'#1e3a8a' },
    L: { base:'#f97316', light:'#fdba74', dark:'#9a3412' },
    O: { base:'#facc15', light:'#fde68a', dark:'#a16207' },
    S: { base:'#22c55e', light:'#86efac', dark:'#166534' },
    T: { base:'#a855f7', light:'#d8b4fe', dark:'#6b21a8' },
    Z: { base:'#ef4444', light:'#fca5a5', dark:'#7f1d1d' },
    G: { base:'#6b7280', light:'#9ca3af', dark:'#374151' }, // garbage grey
  };
  const TYPES = Object.keys(SHAPES);
  const ROTATIONS = {};
  function rotateMatrix(matrix, dir) {
    const n = matrix.length;
    const res = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (dir > 0) res[c][n - 1 - r] = matrix[r][c];
      else res[n - 1 - c][r] = matrix[r][c];
    }
    return res;
  }
  for (const t of TYPES) {
    const arr = [SHAPES[t]];
    for (let i = 0; i < 3; i++) arr.push(rotateMatrix(arr[arr.length - 1], 1));
    ROTATIONS[t] = arr;
  }

  // ---------- SETTINGS ----------
  const DEFAULTS = {
    bindings: {
      moveLeft:'ArrowLeft', moveRight:'ArrowRight',
      softDrop:'ArrowDown', hardDrop:'Space',
      rotateCW:'ArrowUp', rotateCCW:'KeyZ', rotate180:'KeyA',
      hold:'KeyC', pause:'KeyP', reset:'KeyR',
    },
    handling: { das:150, arr:40, sdf:20, gravity:1000, lockDelay:500 },
    audio: { bgm:true, se:true, bgmVolume:32, seVolume:55 },
    display: { ghost:true, grid:true, glow:true, stars:true, particles:true, shake:true, popups:true, flash:true, impact:true, vignette:true },
    cpu: { difficulty:'normal', autoRestart:true, showTarget:true },
    gamepadBindings: { moveLeft:14, moveRight:15, softDrop:13, hardDrop:5, rotateCW:0, rotateCCW:1, rotate180:3, hold:2, pause:9, reset:8 },
  };
  const ACTION_LABELS = [
    ['moveLeft','移動: 左'], ['moveRight','移動: 右'],
    ['softDrop','ソフトドロップ'], ['hardDrop','ハードドロップ'],
    ['rotateCW','右回転'], ['rotateCCW','左回転'], ['rotate180','180度回転'],
    ['hold','ホールド'], ['pause','一時停止'], ['reset','リスタート'],
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
  const PAD_BUTTON_LABELS = {
    0:'A / ✕', 1:'B / ○', 2:'X / □', 3:'Y / △',
    4:'LB / L1', 5:'RB / R1', 6:'LT / L2', 7:'RT / R2',
    8:'Back', 9:'Start',
    10:'LS Press', 11:'RS Press',
    12:'D-Pad ↑', 13:'D-Pad ↓', 14:'D-Pad ←', 15:'D-Pad →',
    16:'Home',
  };
  function padLabel(v) { if (v == null) return '—'; return PAD_BUTTON_LABELS[v] ?? ('Btn ' + v); }

  function deepMerge(def, val) {
    if (val === null || typeof val !== 'object' || Array.isArray(val)) return def;
    const out = {};
    for (const k in def) {
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) out[k] = deepMerge(def[k], val[k] ?? {});
      else out[k] = (val[k] !== undefined) ? val[k] : def[k];
    }
    return out;
  }
  let settings;
  function loadSettings() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return deepMerge(DEFAULTS, JSON.parse(raw)); } catch {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  function saveSettings() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {} }
  settings = loadSettings();

  // ---------- BLOCK RENDERING (cached sprites) ----------
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
    const col = COLORS[type]; if (!col) return;
    const s = size, inset = 1, bevel = Math.max(2, Math.floor(s * 0.18));
    const grad = c.createLinearGradient(px, py, px, py + s);
    grad.addColorStop(0, col.light); grad.addColorStop(0.45, col.base); grad.addColorStop(1, col.dark);
    c.fillStyle = grad; c.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);

    c.fillStyle = col.light;
    c.beginPath();
    c.moveTo(px + inset, py + inset); c.lineTo(px + s - inset, py + inset);
    c.lineTo(px + s - inset - bevel, py + inset + bevel); c.lineTo(px + inset + bevel, py + inset + bevel);
    c.closePath(); c.fill();

    c.fillStyle = withAlpha(col.light, 0.75);
    c.beginPath();
    c.moveTo(px + inset, py + inset); c.lineTo(px + inset + bevel, py + inset + bevel);
    c.lineTo(px + inset + bevel, py + s - inset - bevel); c.lineTo(px + inset, py + s - inset);
    c.closePath(); c.fill();

    c.fillStyle = col.dark;
    c.beginPath();
    c.moveTo(px + s - inset, py + inset); c.lineTo(px + s - inset, py + s - inset);
    c.lineTo(px + s - inset - bevel, py + s - inset - bevel); c.lineTo(px + s - inset - bevel, py + inset + bevel);
    c.closePath(); c.fill();

    c.fillStyle = shade(col.dark, -0.2);
    c.beginPath();
    c.moveTo(px + inset, py + s - inset); c.lineTo(px + s - inset, py + s - inset);
    c.lineTo(px + s - inset - bevel, py + s - inset - bevel); c.lineTo(px + inset + bevel, py + s - inset - bevel);
    c.closePath(); c.fill();

    const gloss = c.createLinearGradient(px + inset + bevel, py + inset + bevel, px + s - inset - bevel, py + s - inset - bevel);
    gloss.addColorStop(0, 'rgba(255,255,255,0.32)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gloss;
    c.fillRect(px + inset + bevel, py + inset + bevel, s - (inset + bevel) * 2, s - (inset + bevel) * 2);

    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }
  function drawBlock(c, x, y, size, type) { drawBlockAbs(c, x * size, y * size, size, type); }
  function drawFlashBlock(c, x, y, size, phase) {
    const px = x * size, py = y * size, s = size, a = 1 - phase * 0.8;
    c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(px + 1, py + 1, s - 2, s - 2);
    c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  }
  function drawGhostBlock(c, x, y, size, type) {
    const col = COLORS[type], px = x * size, py = y * size;
    c.fillStyle = withAlpha(col.base, 0.10); c.fillRect(px + 2, py + 2, size - 4, size - 4);
    c.strokeStyle = withAlpha(col.light, 0.55); c.setLineDash([4, 3]); c.lineWidth = 1.5;
    c.strokeRect(px + 2, py + 2, size - 4, size - 4); c.setLineDash([]);
  }
  function drawLockDimBlock(c, x, y, size, type, dim) {
    drawBlock(c, x, y, size, type);
    c.fillStyle = `rgba(255,255,255,${dim * 0.35})`;
    c.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  }
  function drawCpuTargetBlock(c, x, y, size) {
    const px = x * size, py = y * size;
    c.fillStyle = 'rgba(255,180,60,0.10)'; c.fillRect(px + 2, py + 2, size - 4, size - 4);
    c.strokeStyle = 'rgba(255,210,100,0.8)'; c.setLineDash([3, 3]); c.lineWidth = 1.5;
    c.strokeRect(px + 2, py + 2, size - 4, size - 4); c.setLineDash([]);
  }
  function withAlpha(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; }
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
  }
  function hexToRgb(hex) {
    const h = hex.replace('#', ''); const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---------- BOARD ----------
  function createBoard(cfg) {
    return {
      id: cfg.id,
      isCPU: !!cfg.isCPU,
      canvas: cfg.canvas,
      ctx: cfg.canvas.getContext('2d'),
      nextCanvas: cfg.nextCanvas,
      nctx: cfg.nextCanvas ? cfg.nextCanvas.getContext('2d') : null,
      holdCanvas: cfg.holdCanvas,
      hctx: cfg.holdCanvas ? cfg.holdCanvas.getContext('2d') : null,
      holdPanel: cfg.holdPanel,
      popupLayer: cfg.popupLayer,
      overlay: cfg.overlay,
      overlayTitle: cfg.overlayTitle,
      overlaySub: cfg.overlaySub,
      scoreEl: cfg.scoreEl,
      linesEl: cfg.linesEl,
      levelEl: cfg.levelEl,
      goalEl: cfg.goalEl,
      pointsEl: cfg.pointsEl,
      garbageEl: cfg.garbageEl,
      grid: null,
      current: null,
      queue: [],
      bag: [],
      hold: null,
      holdLocked: false,
      score: 0,
      scoreDisplay: 0,
      lines: 0,
      level: 1,
      goal: 10,
      dropInterval: 1000,
      dropTimer: 0,
      flashing: null,
      particles: [],
      lastActionWasRotate: false,
      combo: -1,
      b2b: 0,
      lockDelay: { active: false, timer: 0, resets: 0 },
      gameOver: false,
      pendingGarbage: 0,
      cpuTarget: null,
      cpuActionTimer: 0,
      opponent: null,
    };
  }

  function createGrid() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  function nextFromBag(b) {
    if (b.bag.length === 0) {
      b.bag = TYPES.slice();
      for (let i = b.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b.bag[i], b.bag[j]] = [b.bag[j], b.bag[i]];
      }
    }
    return b.bag.pop();
  }
  function refillQueue(b) { while (b.queue.length < NEXT_QUEUE + 1) b.queue.push(nextFromBag(b)); }
  function makePiece(type) {
    const matrix = SHAPES[type].map(r => r.slice());
    return { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: type === 'I' ? -1 : 0, rotation: 0, rotateCount: 0 };
  }
  function spawn(b, typeOverride) {
    refillQueue(b);
    const type = typeOverride ?? b.queue.shift();
    refillQueue(b);
    // Apply any pending garbage before the piece appears
    if (b.pendingGarbage > 0) applyPendingGarbage(b);
    b.current = makePiece(type);
    b.holdLocked = false;
    if (b.holdPanel) b.holdPanel.classList.remove('locked');
    b.lockDelay.active = false; b.lockDelay.timer = 0; b.lockDelay.resets = 0;
    b.lastActionWasRotate = false;
    b.cpuTarget = null; b.cpuActionTimer = 0;
    if (collides(b.current, b.grid)) {
      if (mode === 'infinity') {
        infinityRescue(b);
        b.current = makePiece(type);
        if (collides(b.current, b.grid)) b.grid = createGrid();
      } else if (mode === 'cpu') {
        // VS mode top-out
        b.gameOver = true;
        showOverlay(b, b.isCPU ? 'YOU WIN' : 'CPU WINS', 'Press R to rematch', b.isCPU ? 'win' : 'lose');
        // notify opponent side too
        if (b.opponent && !b.opponent.gameOver) {
          showOverlay(b.opponent, b.isCPU ? 'YOU WIN' : 'CPU WINS', 'Press R to rematch', b.isCPU ? 'win' : 'lose');
        }
        window.audio.stopBGM();
        window.audio.playSE(b.isCPU ? 'tetris' : 'gameOver');
      } else {
        b.gameOver = true;
        showOverlay(b, 'GAME OVER', 'Press R to restart');
        window.audio.stopBGM();
        window.audio.playSE('gameOver');
      }
    }
    drawNext(b);
  }
  function collides(piece, grid) {
    const { matrix, x, y } = piece;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && grid[ny][nx]) return true;
      }
    }
    return false;
  }
  function mergePiece(piece, grid) {
    piece.matrix.forEach((row, r) => row.forEach((v, c) => {
      if (v) {
        const ny = piece.y + r, nx = piece.x + c;
        if (ny >= 0) grid[ny][nx] = piece.type;
      }
    }));
  }
  // Full SRS wall-kick tables (engine convention: +y is DOWN).
  // Keys are `${fromRot}${toRot}`. Enables classic T-Spin "hole" rotations.
  const KICK_JLSTZ = {
    '01': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '10': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '12': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '21': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '23': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '32': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '30': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '03': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  };
  const KICK_I = {
    '01': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '10': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '12': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
    '21': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '23': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '32': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '30': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '03': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  };
  function tryRotate(b, dir) {
    if (!b.current || b.gameOver || paused || b.flashing) return false;
    if (b.current.type === 'O') return false; // O piece: no visual rotation
    const rotated = rotateMatrix(b.current.matrix, dir);
    const fromRot = b.current.rotation || 0;
    const toRot = (fromRot + (dir > 0 ? 1 : 3)) % 4;
    const table = b.current.type === 'I' ? KICK_I : KICK_JLSTZ;
    const kicks = table[`${fromRot}${toRot}`] || [[0,0]];
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      const test = { ...b.current, matrix: rotated, x: b.current.x + kx, y: b.current.y + ky };
      if (!collides(test, b.grid)) {
        b.current = test;
        b.current.rotation = toRot;
        b.current.rotateCount = (b.current.rotateCount || 0) + 1;
        b.lastActionWasRotate = true;
        b.lastKickIndex = i;
        consumeLockReset(b);
        if (!b.isCPU) window.audio.playSE('rotate');
        if (b.current.rotateCount >= 15) { spawnPopup(b, 'FORCED DROP', 'popup-b2b'); hardDrop(b); }
        return true;
      }
    }
    return false;
  }
  function move(b, dx) {
    if (!b.current || b.gameOver || paused || b.flashing) return false;
    const test = { ...b.current, x: b.current.x + dx };
    if (!collides(test, b.grid)) { b.current = test; b.lastActionWasRotate = false; consumeLockReset(b); return true; }
    return false;
  }
  function stepDown(b, userTriggered) {
    if (!b.current || b.gameOver || paused || b.flashing) return false;
    const test = { ...b.current, y: b.current.y + 1 };
    if (!collides(test, b.grid)) {
      b.current = test;
      if (userTriggered) b.score += 1;
      b.lastActionWasRotate = false;
      return true;
    }
    return false;
  }
  function hardDrop(b) {
    if (!b.current || b.gameOver || paused || b.flashing) return;
    let drop = 0;
    while (!collides({ ...b.current, y: b.current.y + 1 }, b.grid)) { b.current.y++; drop++; }
    b.score += drop * 2;
    // Only clear the rotation flag if we actually moved. Rotating into a slot
    // then hard-dropping should still count as a T-Spin (山岳積み etc.).
    if (drop > 0) b.lastActionWasRotate = false;
    if (!b.isCPU) {
      if (settings.display.shake) shake(6 + Math.min(6, drop * 0.4));
      if (settings.display.particles) emitLockParticles(b, b.current, true);
      window.audio.playSE('hardDrop');
    } else {
      if (settings.display.particles) emitLockParticles(b, b.current, true);
    }
    lockPiece(b);
  }
  function isOnGround(b) { return collides({ ...b.current, y: b.current.y + 1 }, b.grid); }
  function consumeLockReset(b) {
    if (b.lockDelay.active && b.lockDelay.resets < LOCK_RESETS_MAX) { b.lockDelay.timer = 0; b.lockDelay.resets++; }
  }
  function detectTSpin(b) {
    if (!b.current || b.current.type !== 'T' || !b.lastActionWasRotate) return null;
    const cx = b.current.x + 1, cy = b.current.y + 1;
    const corners = [[cx-1,cy-1],[cx+1,cy-1],[cx-1,cy+1],[cx+1,cy+1]];
    let blocked = 0;
    for (const [x, y] of corners) {
      if (x < 0 || x >= COLS || y >= ROWS || y < 0) { blocked++; continue; }
      if (b.grid[y][x]) blocked++;
    }
    return blocked >= 3 ? 'tspin' : null;
  }
  function lockPiece(b) {
    if (!b.current) return;
    mergePiece(b.current, b.grid);
    if (settings.display.particles && !b.flashing) emitLockParticles(b, b.current, false);
    if (!b.isCPU) window.audio.playSE('lock');
    const tspin = detectTSpin(b);
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) if (b.grid[r].every(cell => cell)) fullRows.push(r);
    if (fullRows.length > 0) {
      b.flashing = { rows: fullRows, timer: 0, tspin };
    } else {
      if (tspin) applyScoreAndFx(b, 0, tspin);
      b.combo = -1;
      b.current = null;
      updateHud(b);
      spawn(b);
    }
  }
  function completeLineClear(b) {
    if (!b.flashing) return;
    const { rows, tspin } = b.flashing;
    if (settings.display.particles) {
      for (const r of rows) {
        for (let c = 0; c < COLS; c++) {
          const type = b.grid[r][c];
          if (type) emitClearParticles(b, c, r, type);
        }
      }
    }
    // 光の帯: each cleared row gets a horizontal beam.
    if (!b.isCPU) { for (const r of rows) spawnLineBeam(b, r); }
    const rowSet = new Set(rows);
    const kept = b.grid.filter((_, r) => !rowSet.has(r));
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++) b.grid[r] = kept[r];
    applyScoreAndFx(b, rows.length, tspin);
    if (rows.length === 4 && !b.isCPU && settings.display.shake) shake(12);
    b.flashing = null;
    b.current = null;
    spawn(b);
  }
  function applyScoreAndFx(b, cleared, tspin) {
    let base = 0, label = '', popupClass = '', isDifficult = false;
    if (tspin) {
      base = [400, 800, 1200, 1600][cleared] || 400;
      label = cleared === 0 ? 'T-SPIN' : cleared === 1 ? 'T-SPIN SINGLE' : cleared === 2 ? 'T-SPIN DOUBLE' : cleared === 3 ? 'T-SPIN TRIPLE' : 'T-SPIN';
      popupClass = 'popup-tspin';
      isDifficult = cleared > 0;
      if (!b.isCPU) {
        window.audio.playSE('tspin');
        if (settings.display.flash) triggerFlash('tspin');
        // Impact FX: T-Spin gets stronger hit-stop and full board treatment.
        hitStop(cleared > 0 ? 160 : 90);
        pulseBoardWrap(b);
        flashBoardWrap(b);
        chromaBoardWrap(b);
        boostVignette();
        if (settings.display.shake) shake(cleared > 0 ? 10 + cleared * 2 : 6);
      }
    } else if (cleared > 0) {
      base = [0, 100, 300, 500, 800][cleared];
      label = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][cleared];
      popupClass = cleared === 4 ? 'popup-tetris' : cleared === 3 ? 'popup-triple' : cleared === 2 ? 'popup-double' : 'popup-single';
      isDifficult = cleared === 4;
      if (!b.isCPU) {
        if (cleared === 4) { window.audio.playSE('tetris'); if (settings.display.flash) triggerFlash('tetris'); }
        else window.audio.playSE('line' + cleared);
        // Impact FX escalation: bigger clears = stronger response
        if (cleared === 4) {
          hitStop(120); pulseBoardWrap(b); flashBoardWrap(b); chromaBoardWrap(b); boostVignette();
          if (settings.display.shake) shake(14);
        } else if (cleared === 3) {
          hitStop(60); pulseBoardWrap(b); flashBoardWrap(b);
          if (settings.display.shake) shake(8);
        } else if (cleared === 2) {
          pulseBoardWrap(b);
          if (settings.display.shake) shake(5);
        } else {
          pulseBoardWrap(b);
        }
      }
    }
    let b2bBonus = 0;
    if (cleared > 0) {
      if (isDifficult) {
        b.b2b++;
        if (b.b2b > 1) {
          b2bBonus = Math.floor(base * 0.5);
          spawnPopup(b, `B2B x${b.b2b}`, 'popup-b2b');
          if (!b.isCPU) window.audio.playSE('b2b');
        }
      } else b.b2b = 0;
    }
    let comboBonus = 0;
    if (cleared > 0) {
      b.combo++;
      if (b.combo > 0) {
        comboBonus = 50 * b.combo * b.level;
        spawnPopup(b, `COMBO x${b.combo}`, 'popup-combo');
        if (!b.isCPU) window.audio.playSE('combo');
      }
    }
    const total = base * b.level + b2bBonus + comboBonus;
    if (total > 0) b.score += total;
    if (cleared > 0) {
      b.lines += cleared;
      const linesPerLevel = mode === 'infinity' ? 5 : 10;
      const newLevel = Math.floor(b.lines / linesPerLevel) + 1;
      b.goal = Math.max(0, newLevel * linesPerLevel - b.lines);
      if (newLevel !== b.level) {
        b.level = newLevel; recalcDropInterval(b);
        spawnPopup(b, `LEVEL ${b.level}`, 'popup-levelup');
        if (!b.isCPU) { window.audio.playSE('levelUp'); if (settings.display.flash) triggerFlash('level'); }
      }
      // Garbage send (VS). T-Spin bonus is 3x per line (T-Spin single = 3,
      // double = 6, triple = 9) so risky setups pay off.
      if (mode === 'cpu' && b.opponent && !b.opponent.gameOver) {
        let g = tspin ? Math.max(2, cleared * 3) : GARBAGE_BY_LINES[cleared] || 0;
        if (b.b2b > 1) g += 1;
        if (b.combo > 0) g += Math.floor(b.combo / 2);
        if (g > 0) sendGarbage(b, g);
      }
    }
    if (label) spawnPopup(b, label, popupClass);
    if (total > 0) spawnPopup(b, `+${total}`, 'popup-points');
    if (b.scoreEl) bumpDigi(b.scoreEl);
    if (cleared > 0 && b.linesEl) bumpDigi(b.linesEl);
    updateHud(b);
  }
  function recalcDropInterval(b) {
    const base = settings.handling.gravity;
    const drop = mode === 'infinity' ? 120 : 80;
    b.dropInterval = Math.max(60, base - (b.level - 1) * drop);
  }
  function doHold(b) {
    if (!b.current || b.gameOver || paused || b.holdLocked || b.flashing) return;
    const cur = b.current.type;
    if (b.hold) { const s = b.hold; b.hold = cur; spawn(b, s); }
    else { b.hold = cur; spawn(b); }
    b.holdLocked = true;
    if (b.holdPanel) b.holdPanel.classList.add('locked');
    if (!b.isCPU) window.audio.playSE('hold');
    drawHold(b);
  }
  function getGhost(b) {
    if (!b.current) return null;
    const g = { ...b.current, matrix: b.current.matrix };
    while (!collides({ ...g, y: g.y + 1 }, b.grid)) g.y++;
    return g;
  }
  function infinityRescue(b) {
    for (let r = ROWS - INFINITY_CLEAR_ROWS; r < ROWS; r++) {
      if (r < 0) continue;
      for (let c = 0; c < COLS; c++) {
        const t = b.grid[r][c];
        if (t) emitClearParticles(b, c, r, t);
      }
    }
    for (let i = 0; i < INFINITY_CLEAR_ROWS; i++) {
      b.grid.splice(ROWS - 1, 1);
      b.grid.unshift(Array(COLS).fill(null));
    }
    spawnPopup(b, 'SURVIVE!', 'popup-tetris');
    shake(18);
    window.audio.playSE('tetris');
    if (settings.display.flash) triggerFlash('rescue');
  }

  // ---------- GARBAGE (VS) ----------
  function sendGarbage(fromBoard, amount) {
    const target = fromBoard.opponent;
    if (!target || target.gameOver) return;
    target.pendingGarbage += amount;
    if (target.garbageEl) target.garbageEl.textContent = target.pendingGarbage;
    spawnPopup(fromBoard, `+${amount} SEND`, 'popup-combo');
  }
  function applyPendingGarbage(b) {
    const n = b.pendingGarbage;
    if (n <= 0) return;
    // Shift board up by n; add n garbage rows at bottom, each with one random hole (persistent across the block of rows for classic feel)
    const hole = Math.floor(Math.random() * COLS);
    // Move rows up: rows [n .. ROWS-1] become [0 .. ROWS-1-n]; rows [ROWS-n .. ROWS-1] are new garbage
    for (let r = 0; r < ROWS - n; r++) {
      b.grid[r] = b.grid[r + n];
    }
    for (let r = ROWS - n; r < ROWS; r++) {
      const row = Array(COLS).fill('G');
      row[hole] = null;
      b.grid[r] = row;
    }
    b.pendingGarbage = 0;
    if (b.garbageEl) b.garbageEl.textContent = 0;
    spawnPopup(b, `-${n} GARBAGE`, 'popup-b2b');
    if (!b.isCPU && settings.display.shake) shake(6);
  }

  // ---------- PARTICLES ----------
  function emitLockParticles(b, piece, big) {
    if (!settings.display.particles) return;
    const col = COLORS[piece.type];
    const [r, g, bl] = hexToRgb(col.base);
    piece.matrix.forEach((row, rr) => row.forEach((v, cc) => {
      if (!v) return;
      const px = (piece.x + cc + 0.5) * CELL;
      const py = (piece.y + rr + 0.5) * CELL;
      const count = big ? 8 : 3;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * (big ? 3 : 1.4);
        b.particles.push({
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (big ? 1 : 0.2),
          life: 0.6 + Math.random() * 0.4, maxLife: 1,
          size: 2 + Math.random() * 2, gravity: 0.12, rgb: [r, g, bl],
        });
      }
    }));
  }
  function emitClearParticles(b, cx, cy, type) {
    if (!settings.display.particles) return;
    const col = COLORS[type];
    const [r, g, bl] = hexToRgb(col.base);
    const [lr, lg, lb] = hexToRgb(col.light);
    const px = (cx + 0.5) * CELL, py = (cy + 0.5) * CELL;
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      const white = i % 3 === 0;
      b.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 - Math.random() * 1.5,
        life: 0.7 + Math.random() * 0.6, maxLife: 1.2,
        size: 2 + Math.random() * 3, gravity: 0.18,
        rgb: white ? [lr, lg, lb] : [r, g, bl],
      });
    }
  }
  function updateParticles(b, dt) {
    const dts = dt / 16.67;
    for (let i = b.particles.length - 1; i >= 0; i--) {
      const p = b.particles[i];
      p.x += p.vx * dts; p.y += p.vy * dts; p.vy += p.gravity * dts;
      p.life -= dt / 1000;
      if (p.life <= 0 || p.y > ROWS * CELL + 20) b.particles.splice(i, 1);
    }
  }
  function drawParticles(b) {
    if (!settings.display.particles) return;
    for (const p of b.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      b.ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${a})`;
      b.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
  }

  // ---------- SHAKE / FX / POPUPS (global) ----------
  let shakeAmount = 0;
  let hitStopUntil = 0;
  function shake(amt) { shakeAmount = Math.max(shakeAmount, amt); }
  function applyShake() {
    if (shakeAmount <= 0.3) { if (shakeAmount !== 0) { gameFrame.style.transform = ''; if (cpuFrame) cpuFrame.style.transform = ''; shakeAmount = 0; } return; }
    const x = (Math.random() - 0.5) * shakeAmount;
    const y = (Math.random() - 0.5) * shakeAmount;
    gameFrame.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    shakeAmount *= 0.86;
  }
  function hitStop(ms) {
    if (!settings.display.impact) return;
    hitStopUntil = Math.max(hitStopUntil, performance.now() + ms);
  }
  function pulseBoardWrap(b) {
    if (!settings.display.impact) return;
    const wrap = b.canvas ? b.canvas.closest('.board-wrap') : null;
    if (!wrap) return;
    wrap.classList.remove('impact-pulse');
    void wrap.offsetWidth;
    wrap.classList.add('impact-pulse');
    setTimeout(() => wrap.classList.remove('impact-pulse'), 450);
  }
  function flashBoardWrap(b) {
    if (!settings.display.impact) return;
    const wrap = b.canvas ? b.canvas.closest('.board-wrap') : null;
    if (!wrap) return;
    wrap.classList.remove('impact-flash');
    void wrap.offsetWidth;
    wrap.classList.add('impact-flash');
    setTimeout(() => wrap.classList.remove('impact-flash'), 550);
  }
  function chromaBoardWrap(b) {
    if (!settings.display.impact) return;
    const wrap = b.canvas ? b.canvas.closest('.board-wrap') : null;
    if (!wrap) return;
    wrap.classList.remove('impact-chroma');
    void wrap.offsetWidth;
    wrap.classList.add('impact-chroma');
    setTimeout(() => wrap.classList.remove('impact-chroma'), 500);
  }
  function boostVignette() {
    if (!settings.display.impact) return;
    document.body.classList.remove('vignette-boost');
    void document.body.offsetWidth;
    document.body.classList.add('vignette-boost');
    setTimeout(() => document.body.classList.remove('vignette-boost'), 700);
  }
  function spawnLineBeam(b, row) {
    if (!settings.display.impact || !b.popupLayer) return;
    const beam = document.createElement('div');
    beam.className = 'line-beam';
    beam.style.top = `${row * CELL}px`;
    b.popupLayer.appendChild(beam);
    setTimeout(() => beam.remove(), 600);
  }
  function spawnPopup(b, text, cls) {
    if (!settings.display.popups) return;
    if (!b.popupLayer) return;
    const el = document.createElement('div');
    el.className = 'popup ' + cls;
    el.textContent = text;
    // Combo escalation: pop grows and shifts color with streak length
    if (cls === 'popup-combo' && b.combo > 2) {
      const size = Math.min(48, 22 + b.combo * 2.5);
      el.style.fontSize = `${size}px`;
      el.style.color = b.combo > 8 ? '#ff3ea5' : b.combo > 5 ? '#ffb400' : '#6df0ff';
      el.style.textShadow = `0 0 ${16 + b.combo * 2}px currentColor, 0 2px 4px rgba(0,0,0,0.7)`;
    }
    b.popupLayer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  function bumpDigi(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function triggerFlash(kind) {
    const el = document.createElement('div');
    el.className = `fx-flash fx-flash-${kind}`;
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
    const ring = document.createElement('div');
    ring.className = 'fx-ring';
    fxLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 1100);
  }

  // ---------- DRAWING ----------
  function drawGrid(b) {
    b.ctx.fillStyle = '#0a0014';
    b.ctx.fillRect(0, 0, b.canvas.width, b.canvas.height);
    if (!settings.display.grid) return;
    b.ctx.strokeStyle = 'rgba(120, 220, 255, 0.10)';
    b.ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      b.ctx.beginPath();
      b.ctx.moveTo(x * CELL + 0.5, 0); b.ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
      b.ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      b.ctx.beginPath();
      b.ctx.moveTo(0, y * CELL + 0.5); b.ctx.lineTo(COLS * CELL, y * CELL + 0.5);
      b.ctx.stroke();
    }
  }
  function drawBoard(b) {
    drawGrid(b);
    const flashRows = b.flashing ? new Set(b.flashing.rows) : null;
    const flashPhase = b.flashing ? Math.min(1, b.flashing.timer / LINE_FLASH_MS) : 0;
    for (let r = 0; r < ROWS; r++) {
      const isFlash = flashRows && flashRows.has(r);
      for (let c = 0; c < COLS; c++) {
        const t = b.grid[r][c]; if (!t) continue;
        if (isFlash) drawFlashBlock(b.ctx, c, r, CELL, flashPhase);
        else drawBlock(b.ctx, c, r, CELL, t);
      }
    }
    if (b.current && !b.gameOver && !b.flashing) {
      if (b.isCPU && b.cpuTarget && settings.cpu.showTarget) {
        b.cpuTarget.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (!v) return;
          const ny = b.cpuTarget.y + r, nx = b.cpuTarget.x + c;
          if (ny >= 0) drawCpuTargetBlock(b.ctx, nx, ny, CELL);
        }));
      }
      if (settings.display.ghost) {
        const ghost = getGhost(b);
        ghost.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (!v) return;
          const ny = ghost.y + r, nx = ghost.x + c;
          if (ny >= 0) drawGhostBlock(b.ctx, nx, ny, CELL, ghost.type);
        }));
      }
      let dim = 0;
      if (b.lockDelay.active && settings.handling.lockDelay > 0) dim = Math.min(1, b.lockDelay.timer / settings.handling.lockDelay);
      b.current.matrix.forEach((row, r) => row.forEach((v, c) => {
        if (!v) return;
        const ny = b.current.y + r, nx = b.current.x + c;
        if (ny >= 0) {
          if (dim > 0.1) drawLockDimBlock(b.ctx, nx, ny, CELL, b.current.type, dim);
          else drawBlock(b.ctx, nx, ny, CELL, b.current.type);
        }
      }));
    }
    drawParticles(b);
  }
  function drawPieceCentered(ctx, canvas, type, cell) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const m = SHAPES[type];
    let minR = m.length, maxR = -1, minC = m[0].length, maxC = -1;
    for (let r = 0; r < m.length; r++) for (let cc = 0; cc < m[0].length; cc++) {
      if (m[r][cc]) { if (r<minR) minR=r; if (r>maxR) maxR=r; if (cc<minC) minC=cc; if (cc>maxC) maxC=cc; }
    }
    const w = (maxC-minC+1)*cell, h = (maxR-minR+1)*cell;
    const offX = (canvas.width - w)/2 - minC*cell;
    const offY = (canvas.height - h)/2 - minR*cell;
    for (let r = minR; r <= maxR; r++) for (let cc = minC; cc <= maxC; cc++)
      if (m[r][cc]) drawBlockAbs(ctx, offX + cc*cell, offY + r*cell, cell, type);
  }
  function drawNext(b) {
    if (!b.nctx) return;
    b.nctx.clearRect(0, 0, b.nextCanvas.width, b.nextCanvas.height);
    const slotH = b.nextCanvas.height / NEXT_QUEUE;
    const cell = 16;
    for (let i = 0; i < NEXT_QUEUE; i++) {
      const type = b.queue[i]; if (!type) continue;
      const m = SHAPES[type];
      let minR = m.length, maxR = -1, minC = m[0].length, maxC = -1;
      for (let r = 0; r < m.length; r++) for (let cc = 0; cc < m[0].length; cc++) {
        if (m[r][cc]) { if (r<minR) minR=r; if (r>maxR) maxR=r; if (cc<minC) minC=cc; if (cc>maxC) maxC=cc; }
      }
      const w = (maxC-minC+1)*cell, h = (maxR-minR+1)*cell;
      const offX = (b.nextCanvas.width - w)/2 - minC*cell;
      const offY = i*slotH + (slotH - h)/2 - minR*cell;
      for (let r = minR; r <= maxR; r++) for (let cc = minC; cc <= maxC; cc++)
        if (m[r][cc]) drawBlockAbs(b.nctx, offX + cc*cell, offY + r*cell, cell, type);
      if (i < NEXT_QUEUE - 1) {
        b.nctx.strokeStyle = 'rgba(140, 240, 255, 0.18)'; b.nctx.lineWidth = 1;
        b.nctx.beginPath();
        b.nctx.moveTo(8, (i+1)*slotH + 0.5); b.nctx.lineTo(b.nextCanvas.width - 8, (i+1)*slotH + 0.5);
        b.nctx.stroke();
      }
    }
  }
  function drawHold(b) { if (b.hctx) drawPieceCentered(b.hctx, b.holdCanvas, b.hold, 14); }

  // ---------- HUD ----------
  function fmtTime(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const sec = totalSec % 60, min = Math.floor(totalSec / 60);
    const pad = (n, w=2) => String(n).padStart(w, '0');
    return `${pad(min)}:${pad(sec)}:${pad(cs)}`;
  }
  function updateHud(b) {
    if (b.linesEl) b.linesEl.textContent = String(b.lines).padStart(3, '0');
    if (b.levelEl) b.levelEl.textContent = b.level;
    if (b.goalEl)  b.goalEl.textContent  = mode === 'infinity' ? '∞' : b.goal;
    if (b.pointsEl) b.pointsEl.textContent = `x${b.level}`;
    if (b.garbageEl) b.garbageEl.textContent = b.pendingGarbage;
  }
  function tickScoreDisplay(b) {
    const diff = b.score - b.scoreDisplay;
    if (Math.abs(diff) < 0.5) b.scoreDisplay = b.score;
    else b.scoreDisplay += diff * 0.14;
    if (b.scoreEl) b.scoreEl.textContent = String(Math.round(b.scoreDisplay)).padStart(4, '0');
  }
  function updateTime(now) {
    if (!startTime) return;
    let elapsed;
    if (paused && pauseStarted) elapsed = pauseStarted - startTime - pausedTotal;
    else elapsed = now - startTime - pausedTotal;
    timeEl.textContent = fmtTime(Math.max(0, elapsed));
  }
  function showOverlay(b, title, sub, cls) {
    if (!b.overlay) return;
    b.overlayTitle.textContent = title;
    b.overlaySub.textContent = sub;
    b.overlayTitle.className = cls || '';
    b.overlay.classList.remove('hidden');
  }
  function hideOverlay(b) { if (b.overlay) b.overlay.classList.add('hidden'); }
  function hideAllOverlays() { for (const b of activeBoards) hideOverlay(b); }

  // ---------- CPU AI ----------
  function evaluateGrid(g) {
    const heights = new Array(COLS).fill(0);
    let holes = 0;
    for (let c = 0; c < COLS; c++) {
      let firstBlock = -1;
      for (let r = 0; r < ROWS; r++) {
        if (g[r][c]) { if (firstBlock === -1) { firstBlock = r; heights[c] = ROWS - r; } }
        else if (firstBlock !== -1) holes++;
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
  // Difficulty presets — control both action speed and eval noise.
  // Higher noise = worse choice; longer speed = slower moves.
  const CPU_PRESETS = {
    easy:   { speed: 700, noise: 5.0, missChance: 0.35 },
    normal: { speed: 180, noise: 1.2, missChance: 0.08 },
    hard:   { speed: 60,  noise: 0.2, missChance: 0    },
    expert: { speed: 15,  noise: 0,   missChance: 0    },
  };
  function cpuPreset() { return CPU_PRESETS[settings.cpu.difficulty] || CPU_PRESETS.normal; }

  function findBestMove(piece, snapshot, noise = 0, missChance = 0) {
    const candidates = [];
    const shapes = ROTATIONS[piece.type];
    for (let rot = 0; rot < shapes.length; rot++) {
      const matrix = shapes[rot];
      for (let x = -matrix.length; x <= COLS; x++) {
        let ok = true;
        for (let r = 0; r < matrix.length && ok; r++) {
          for (let c = 0; c < matrix[r].length && ok; c++) {
            if (matrix[r][c]) { const nx = x + c; if (nx < 0 || nx >= COLS) ok = false; }
          }
        }
        if (!ok) continue;
        let y = -3;
        const testPiece = { type: piece.type, matrix, x, y };
        if (collides({ ...testPiece }, snapshot)) continue;
        while (!collides({ ...testPiece, y: y + 1 }, snapshot)) { y++; if (y >= ROWS) break; }
        if (y < 0) continue;
        testPiece.y = y;
        const simGrid = snapshot.map(r => r.slice());
        mergePiece(testPiece, simGrid);
        let s = evaluateGrid(simGrid);
        if (noise > 0) s += (Math.random() - 0.5) * 2 * noise;
        candidates.push({ score: s, x, y, rotation: rot, matrix });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    // Occasional "miss": pick from top-3 instead of the very best
    if (missChance > 0 && Math.random() < missChance && candidates.length > 1) {
      const idx = 1 + Math.floor(Math.random() * Math.min(2, candidates.length - 1));
      return candidates[idx];
    }
    return candidates[0];
  }
  function cpuStep(b, dt) {
    if (!b.current || b.gameOver || paused || b.flashing) return;
    const preset = cpuPreset();
    b.cpuActionTimer += dt;
    if (b.cpuActionTimer < preset.speed) return;
    b.cpuActionTimer = 0;
    if (!b.cpuTarget) {
      b.cpuTarget = findBestMove(b.current, b.grid, preset.noise, preset.missChance);
      if (!b.cpuTarget) { hardDrop(b); return; }
    }
    if (b.current.rotation !== b.cpuTarget.rotation) {
      if (!tryRotate(b, 1)) { if (b.current.x < b.cpuTarget.x) move(b, 1); else move(b, -1); }
      return;
    }
    if (b.current.x < b.cpuTarget.x) { move(b, 1); return; }
    if (b.current.x > b.cpuTarget.x) { move(b, -1); return; }
    hardDrop(b);
    b.cpuTarget = null;
  }

  // ---------- DOM references ----------
  const board1 = $('board'), next1 = $('next'), hold1 = $('hold'), holdPanel1 = hold1.parentElement;
  const board2 = $('board2'), next2 = $('next2'), hold2 = $('hold2'), holdPanel2 = hold2 ? hold2.parentElement : null;

  const timeEl = $('time');
  const overlay1 = $('overlay'), overlayTitle1 = $('overlay-title'), overlaySub1 = $('overlay-sub');
  const overlay2 = $('overlay2'), overlayTitle2 = $('overlay2-title'), overlaySub2 = $('overlay2-sub');
  const popupLayer1 = $('popupLayer'), popupLayer2 = $('popupLayer2');
  const fxLayer = $('fxLayer');
  const modeBadge = $('modeBadge'), modeBadge2 = $('modeBadge2');
  const modeNameEl = $('modeName');

  const pauseBtn = $('pauseBtn');
  const settingsBtn = $('settingsBtn');
  const modeBtn = $('modeBtn');
  const modeSettingsBtn = $('modeSettingsBtn');
  const gameFrame = $('gameFrame');
  const cpuFrame = $('cpuFrame');
  const modeSelect = $('modeSelect');
  const modeBgCanvas = $('modeBgCanvas');
  const mbctx = modeBgCanvas.getContext('2d');

  const modal = $('settingsModal');
  const bindingsGrid = $('bindingsGrid');
  const padBindingsGrid = $('padBindingsGrid');
  const closeSettings = $('closeSettings');
  const applyClose = $('applyClose');
  const resetDefaultsBtn = $('resetDefaults');

  const dasRange = $('dasRange'), arrRange = $('arrRange'), sdfRange = $('sdfRange'), gravRange = $('gravRange'), lockRange = $('lockRange');
  const dasVal = $('dasVal'), arrVal = $('arrVal'), sdfVal = $('sdfVal'), gravVal = $('gravVal'), lockVal = $('lockVal');
  const bgmRange = $('bgmRange'), seRange = $('seRange'), bgmVal = $('bgmVal'), seVal = $('seVal');
  const diffButtons = $('diffButtons');

  // ---------- BOARDS ----------
  const playerBoard = createBoard({
    id: 'player', isCPU: false,
    canvas: board1, nextCanvas: next1, holdCanvas: hold1, holdPanel: holdPanel1,
    popupLayer: popupLayer1, overlay: overlay1, overlayTitle: overlayTitle1, overlaySub: overlaySub1,
    scoreEl: $('score'), linesEl: $('lines'), levelEl: $('level'),
    goalEl: $('goal'), pointsEl: $('points'), garbageEl: $('garbage'),
  });
  const cpuBoard = createBoard({
    id: 'cpu', isCPU: true,
    canvas: board2, nextCanvas: next2, holdCanvas: hold2, holdPanel: holdPanel2,
    popupLayer: popupLayer2, overlay: overlay2, overlayTitle: overlayTitle2, overlaySub: overlaySub2,
    scoreEl: $('score2'), linesEl: $('lines2'), levelEl: $('level2'),
    garbageEl: $('garbage2'),
  });
  playerBoard.opponent = cpuBoard;
  cpuBoard.opponent = playerBoard;
  let activeBoards = [playerBoard];

  // ---------- GLOBAL STATE ----------
  let mode = null;
  let appState = 'menu';
  let paused = false;
  let startTime = 0, pausedTotal = 0, pauseStarted = 0, lastTime = 0;
  let modalOpen = false, rebinding = null, padRebinding = null, wasPausedBeforeModal = false;
  let bgmStartedOnce = false;
  const held = {};
  const padHeld = {};
  const padPressed = {};
  const padCapturePrev = {};
  let gamepadConnected = false;
  const bgPieces = [];
  let bgSpawnTimer = 0;
  let matchEnded = false;

  // ---------- CONTROLS ----------
  function triggerAction(action) {
    const b = playerBoard;
    if (b.gameOver && action !== 'reset') return;
    if (mode === 'cpu' && matchEnded && action !== 'reset') return;
    switch (action) {
      case 'moveLeft':  if (move(b, -1)) window.audio.playSE('move'); break;
      case 'moveRight': if (move(b, 1))  window.audio.playSE('move'); break;
      case 'softDrop':  if (stepDown(b, true)) { window.audio.playSE('softDrop'); b.dropTimer = 0; } break;
      case 'hardDrop':  hardDrop(b); break;
      case 'rotateCW':  tryRotate(b, 1); break;
      case 'rotateCCW': tryRotate(b, -1); break;
      case 'rotate180': tryRotate(b, 1); tryRotate(b, 1); break;
      case 'hold':      doHold(b); break;
      case 'pause':     togglePause(); break;
      case 'reset':     reset(); break;
    }
  }
  function findActionByCode(code) {
    for (const action in settings.bindings) if (settings.bindings[action] === code) return action;
    return null;
  }
  function processHeld(now) {
    if (paused || playerBoard.gameOver || playerBoard.flashing || matchEnded) return;
    const das = settings.handling.das, arr = settings.handling.arr;
    const b = playerBoard;
    for (const action of ['moveLeft', 'moveRight']) {
      for (const source of [held, padHeld]) {
        const state = source[action]; if (!state) continue;
        if (now - state.since < das) continue;
        if (arr === 0) {
          let safety = COLS;
          while (safety-- > 0) if (action === 'moveLeft' ? !move(b, -1) : !move(b, 1)) break;
          state.lastTrigger = now;
        } else {
          while (state.lastTrigger + arr <= now) { triggerAction(action); state.lastTrigger += arr; }
        }
      }
    }
  }

  // ---------- GAMEPAD ----------
  window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    console.log('Gamepad connected:', e.gamepad.id);
    if (appState === 'playing') spawnPopup(playerBoard, 'PAD CONNECTED', 'popup-mode');
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
    if (padRebinding) {
      for (let i = 0; i < pad.buttons.length; i++) {
        const btn = pad.buttons[i];
        const pressed = !!(btn && (btn.pressed || btn.value > 0.5));
        if (pressed && !padCapturePrev[i]) { assignPadBinding(padRebinding, i); for (const k in padCapturePrev) delete padCapturePrev[k]; return; }
        padCapturePrev[i] = pressed;
      }
      return;
    }
    const active = {};
    const bindings = settings.gamepadBindings;
    for (const action in bindings) {
      const idx = bindings[action]; if (idx == null) continue;
      const btn = pad.buttons[idx];
      if (btn && (btn.pressed || btn.value > 0.5)) active[action] = true;
    }
    const T = 0.5;
    const stickX = pad.axes[0] || 0, stickY = pad.axes[1] || 0;
    if (stickX < -T) active.moveLeft = true;
    if (stickX >  T) active.moveRight = true;
    if (stickY >  T) active.softDrop = true;
    if (stickY < -T) active.hardDrop = true;
    for (const action in active) {
      if (!padPressed[action]) padPress(action, now);
      padPressed[action] = true;
    }
    for (const action of Object.keys(padPressed)) {
      if (!active[action]) { delete padPressed[action]; delete padHeld[action]; }
    }
  }
  function padPress(action, now) {
    window.audio.resume();
    if (!bgmStartedOnce && settings.audio.bgm && appState === 'playing') { window.audio.startBGM(); bgmStartedOnce = true; }
    if (appState === 'menu') {
      const cards = Array.from(document.querySelectorAll('.mode-card'));
      let idx = cards.findIndex(c => c === document.activeElement); if (idx === -1) idx = 1;
      if (action === 'moveLeft') cards[(idx + cards.length - 1) % cards.length].focus();
      else if (action === 'moveRight') cards[(idx + 1) % cards.length].focus();
      else if (action === 'rotateCW' || action === 'hardDrop') {
        const card = cards[idx === -1 ? 1 : idx]; if (card) chooseMode(card.dataset.mode, card);
      }
      return;
    }
    if (modalOpen) { if (action === 'pause' || action === 'rotateCCW') closeModal(); return; }
    if (!padHeld[action] && (action === 'moveLeft' || action === 'moveRight')) padHeld[action] = { since: now, lastTrigger: now };
    triggerAction(action);
  }

  document.addEventListener('keydown', (e) => {
    if (rebinding) { e.preventDefault(); if (e.code === 'Escape') { stopRebind(); return; } assignBinding(rebinding, e.code); return; }
    if (modalOpen) {
      if (e.code === 'Escape') { e.preventDefault(); if (padRebinding) stopPadRebind(); else closeModal(); }
      return;
    }
    if (appState === 'menu') {
      const cards = Array.from(document.querySelectorAll('.mode-card'));
      let idx = cards.findIndex(c => c === document.activeElement); if (idx === -1) idx = 1;
      if (e.code === 'ArrowLeft')  { cards[(idx + cards.length - 1) % cards.length].focus(); e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { cards[(idx + 1) % cards.length].focus(); e.preventDefault(); return; }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault(); window.audio.resume();
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
    if (!held[action]) { held[action] = { since: now, lastTrigger: now }; triggerAction(action); }
  });
  document.addEventListener('keyup', (e) => {
    const action = findActionByCode(e.code); if (action && held[action]) delete held[action];
  });
  window.addEventListener('blur', () => { for (const k in held) delete held[k]; });

  pauseBtn.addEventListener('click', () => { window.audio.resume(); if (!bgmStartedOnce && settings.audio.bgm) { window.audio.startBGM(); bgmStartedOnce = true; } togglePause(); pauseBtn.blur(); });
  settingsBtn.addEventListener('click', () => { window.audio.resume(); openModal(); });
  modeSettingsBtn.addEventListener('click', () => { window.audio.resume(); openModal(); });
  modeBtn.addEventListener('click', () => { window.audio.resume(); showModeSelect(); });

  // ---------- PAUSE ----------
  function togglePause() {
    if (playerBoard.gameOver || matchEnded) return;
    paused = !paused;
    const now = performance.now();
    if (paused) {
      pauseStarted = now;
      for (const b of activeBoards) showOverlay(b, 'PAUSED', 'Press P to resume');
      window.audio.stopBGM(); window.audio.playSE('pause');
    } else {
      if (pauseStarted) pausedTotal += now - pauseStarted; pauseStarted = 0;
      hideAllOverlays(); window.audio.startBGM(); window.audio.playSE('pause');
    }
    for (const k in held) delete held[k];
  }

  // ---------- MODE SELECT ----------
  const modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => { window.audio.resume(); chooseMode(card.dataset.mode, card); });
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - 0.5;
      const dy = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-6px) scale(1.03) rotateY(${dx*8}deg) rotateX(${-dy*8}deg)`;
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
      if (mode === 'cpu') {
        cpuFrame.classList.remove('hidden');
        activeBoards = [playerBoard, cpuBoard];
      } else {
        cpuFrame.classList.add('hidden');
        activeBoards = [playerBoard];
      }
      gameFrame.style.animation = 'none'; void gameFrame.offsetWidth; gameFrame.style.animation = '';
      reset();
      if (settings.audio.bgm) { window.audio.startBGM(); bgmStartedOnce = true; }
      updateModeBadge();
      spawnPopup(playerBoard, mode === 'cpu' ? 'VS CPU' : mode.toUpperCase(), 'popup-mode');
    }, 550);
  }
  function showModeSelect() {
    appState = 'menu'; mode = null;
    document.body.classList.remove('mode-marathon', 'mode-cpu', 'mode-infinity');
    window.audio.stopBGM();
    gameFrame.classList.add('hidden'); cpuFrame.classList.add('hidden');
    modeSelect.classList.remove('hidden'); modeBgCanvas.classList.add('visible');
    modeCards.forEach(c => { c.classList.remove('selecting', 'dismissing'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; c.style.transform = ''; });
  }
  function updateModeBadge() {
    if (mode === 'marathon') { modeBadge.classList.add('hidden'); modeNameEl.textContent = 'MARATHON'; modeNameEl.className = 'mini-value'; }
    else if (mode === 'cpu') {
      modeBadge.classList.remove('hidden');
      modeBadge.classList.add('mode-cpu'); modeBadge.classList.remove('mode-infinity');
      modeBadge.textContent = 'YOU';
      modeNameEl.textContent = 'VS CPU'; modeNameEl.className = 'mini-value mode-cpu';
    } else if (mode === 'infinity') {
      modeBadge.classList.remove('hidden');
      modeBadge.classList.add('mode-infinity'); modeBadge.classList.remove('mode-cpu');
      modeBadge.textContent = 'INFINITY ∞';
      modeNameEl.textContent = 'INFINITY'; modeNameEl.className = 'mini-value mode-infinity';
    }
  }

  // ---------- MODE BG ----------
  function resizeModeBg() { modeBgCanvas.width = window.innerWidth; modeBgCanvas.height = window.innerHeight; }
  window.addEventListener('resize', resizeModeBg); resizeModeBg();
  function spawnBgPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const size = 14 + Math.random() * 22;
    bgPieces.push({ type, size, x: Math.random()*modeBgCanvas.width, y: -80 - Math.random()*100, vy: 0.4 + Math.random()*1.3, rotation: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.015, alpha: 0.10 + Math.random()*0.22 });
  }
  function updateModeBg(dt) {
    if (appState !== 'menu') return;
    bgSpawnTimer += dt;
    if (bgSpawnTimer > 550 && bgPieces.length < 10) { bgSpawnTimer = 0; spawnBgPiece(); }
    mbctx.clearRect(0, 0, modeBgCanvas.width, modeBgCanvas.height);
    const dts = dt / 16.67;
    for (let i = bgPieces.length - 1; i >= 0; i--) {
      const p = bgPieces[i];
      p.y += p.vy * dts; p.rotation += p.vr * dts;
      if (p.y > modeBgCanvas.height + 100) { bgPieces.splice(i, 1); continue; }
      mbctx.save(); mbctx.translate(p.x, p.y); mbctx.rotate(p.rotation); mbctx.globalAlpha = p.alpha;
      const m = SHAPES[p.type];
      const halfW = m[0].length * p.size / 2, halfH = m.length * p.size / 2;
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++)
        if (m[r][c]) drawBlockAbs(mbctx, c*p.size - halfW, r*p.size - halfH, p.size, p.type);
      mbctx.restore();
    }
  }
  for (let i = 0; i < 4; i++) { spawnBgPiece(); bgPieces[bgPieces.length - 1].y = Math.random() * modeBgCanvas.height; }
  modeBgCanvas.classList.add('visible');

  // ---------- SETTINGS MODAL ----------
  function buildBindingRows() {
    bindingsGrid.innerHTML = '';
    for (const [action, label] of ACTION_LABELS) {
      const row = document.createElement('div'); row.className = 'binding-row';
      const lab = document.createElement('span'); lab.className = 'binding-label'; lab.textContent = label;
      const btn = document.createElement('button'); btn.className = 'binding-key'; btn.dataset.action = action;
      btn.textContent = labelForCode(settings.bindings[action]);
      btn.addEventListener('click', () => startRebind(action));
      row.appendChild(lab); row.appendChild(btn); bindingsGrid.appendChild(row);
    }
  }
  function refreshBindingButtons() {
    const codes = Object.values(settings.bindings);
    const dup = new Set(codes.filter((c, i) => codes.indexOf(c) !== i));
    bindingsGrid.querySelectorAll('.binding-key').forEach(btn => {
      const action = btn.dataset.action; const code = settings.bindings[action];
      btn.textContent = btn.classList.contains('listening') ? 'press key…' : labelForCode(code);
      btn.classList.toggle('duplicate', dup.has(code));
    });
  }
  function startRebind(action) { stopRebind(); rebinding = action; const btn = bindingsGrid.querySelector(`.binding-key[data-action="${action}"]`); if (btn) { btn.classList.add('listening'); btn.textContent = 'press key…'; } }
  function stopRebind() { if (!rebinding) return; const btn = bindingsGrid.querySelector(`.binding-key[data-action="${rebinding}"]`); if (btn) btn.classList.remove('listening'); rebinding = null; refreshBindingButtons(); }
  function assignBinding(action, code) {
    let conflict = null;
    for (const a in settings.bindings) if (a !== action && settings.bindings[a] === code) { conflict = a; break; }
    if (conflict) settings.bindings[conflict] = settings.bindings[action];
    settings.bindings[action] = code; stopRebind(); saveSettings(); refreshBindingButtons();
  }
  function buildPadBindingRows() {
    if (!padBindingsGrid) return;
    padBindingsGrid.innerHTML = '';
    for (const [action, label] of ACTION_LABELS) {
      const row = document.createElement('div'); row.className = 'binding-row';
      const lab = document.createElement('span'); lab.className = 'binding-label'; lab.textContent = label;
      const btn = document.createElement('button'); btn.className = 'binding-key'; btn.dataset.padAction = action;
      btn.textContent = padLabel(settings.gamepadBindings[action]);
      btn.addEventListener('click', () => startPadRebind(action));
      row.appendChild(lab); row.appendChild(btn); padBindingsGrid.appendChild(row);
    }
  }
  function refreshPadBindingButtons() {
    if (!padBindingsGrid) return;
    const codes = Object.values(settings.gamepadBindings).filter(v => v != null);
    const dup = new Set(codes.filter((c, i) => codes.indexOf(c) !== i));
    padBindingsGrid.querySelectorAll('.binding-key').forEach(btn => {
      const action = btn.dataset.padAction; const code = settings.gamepadBindings[action];
      btn.textContent = btn.classList.contains('listening') ? 'press pad btn…' : padLabel(code);
      btn.classList.toggle('duplicate', code != null && dup.has(code));
    });
  }
  function startPadRebind(action) {
    stopPadRebind(); padRebinding = action;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (p && p.connected) {
        for (let i = 0; i < p.buttons.length; i++) { const bt = p.buttons[i]; padCapturePrev[i] = !!(bt && (bt.pressed || bt.value > 0.5)); }
        break;
      }
    }
    const btn = padBindingsGrid.querySelector(`.binding-key[data-pad-action="${action}"]`); if (btn) { btn.classList.add('listening'); btn.textContent = 'press pad btn…'; }
  }
  function stopPadRebind() {
    if (!padRebinding) return;
    const btn = padBindingsGrid.querySelector(`.binding-key[data-pad-action="${padRebinding}"]`); if (btn) btn.classList.remove('listening');
    padRebinding = null;
    for (const k in padCapturePrev) delete padCapturePrev[k];
    refreshPadBindingButtons();
  }
  function assignPadBinding(action, idx) {
    let conflict = null;
    for (const a in settings.gamepadBindings) if (a !== action && settings.gamepadBindings[a] === idx) { conflict = a; break; }
    if (conflict) settings.gamepadBindings[conflict] = settings.gamepadBindings[action];
    settings.gamepadBindings[action] = idx; stopPadRebind(); saveSettings(); refreshPadBindingButtons();
  }

  function syncSlidersFromSettings() {
    dasRange.value = settings.handling.das; arrRange.value = settings.handling.arr;
    sdfRange.value = settings.handling.sdf; gravRange.value = settings.handling.gravity;
    lockRange.value = settings.handling.lockDelay;
    dasVal.textContent = `${settings.handling.das} ms`;
    arrVal.textContent = settings.handling.arr === 0 ? '0 ms (instant)' : `${settings.handling.arr} ms`;
    sdfVal.textContent = `x${settings.handling.sdf}`;
    gravVal.textContent = `${settings.handling.gravity} ms`;
    lockVal.textContent = settings.handling.lockDelay === 0 ? 'OFF' : `${settings.handling.lockDelay} ms`;
    bgmRange.value = settings.audio.bgmVolume; seRange.value = settings.audio.seVolume;
    bgmVal.textContent = `${settings.audio.bgmVolume}%`; seVal.textContent = `${settings.audio.seVolume}%`;
    // Sync difficulty preset buttons
    if (diffButtons) {
      const cur = settings.cpu.difficulty || 'normal';
      diffButtons.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === cur);
      });
    }
  }
  function syncTogglesFromSettings() {
    modal.querySelectorAll('[data-toggle-display]').forEach(t => t.setAttribute('aria-pressed', settings.display[t.dataset.toggleDisplay] ? 'true' : 'false'));
    modal.querySelectorAll('[data-toggle-audio]').forEach(t => t.setAttribute('aria-pressed', settings.audio[t.dataset.toggleAudio] ? 'true' : 'false'));
    modal.querySelectorAll('[data-toggle-cpu]').forEach(t => t.setAttribute('aria-pressed', settings.cpu[t.dataset.toggleCpu] ? 'true' : 'false'));
    applyDisplaySettings(); applyAudioSettings();
  }
  function applyDisplaySettings() {
    document.body.classList.toggle('no-glow', !settings.display.glow);
    document.body.classList.toggle('no-stars', !settings.display.stars);
    document.body.classList.toggle('no-vignette', !settings.display.vignette);
  }
  function applyAudioSettings() {
    window.audio.setBgmVolume(settings.audio.bgmVolume / 100);
    window.audio.setSeVolume(settings.audio.seVolume / 100);
    window.audio.setBgmEnabled(settings.audio.bgm);
    window.audio.setSeEnabled(settings.audio.se);
  }

  dasRange.addEventListener('input', () => { settings.handling.das = +dasRange.value; dasVal.textContent = `${settings.handling.das} ms`; saveSettings(); });
  arrRange.addEventListener('input', () => { settings.handling.arr = +arrRange.value; arrVal.textContent = settings.handling.arr === 0 ? '0 ms (instant)' : `${settings.handling.arr} ms`; saveSettings(); });
  sdfRange.addEventListener('input', () => { settings.handling.sdf = +sdfRange.value; sdfVal.textContent = `x${settings.handling.sdf}`; saveSettings(); });
  gravRange.addEventListener('input', () => { settings.handling.gravity = +gravRange.value; gravVal.textContent = `${settings.handling.gravity} ms`; for (const b of activeBoards) recalcDropInterval(b); saveSettings(); });
  lockRange.addEventListener('input', () => { settings.handling.lockDelay = +lockRange.value; lockVal.textContent = settings.handling.lockDelay === 0 ? 'OFF' : `${settings.handling.lockDelay} ms`; saveSettings(); });
  bgmRange.addEventListener('input', () => { settings.audio.bgmVolume = +bgmRange.value; bgmVal.textContent = `${settings.audio.bgmVolume}%`; window.audio.setBgmVolume(settings.audio.bgmVolume/100); saveSettings(); });
  seRange.addEventListener('input', () => { settings.audio.seVolume = +seRange.value; seVal.textContent = `${settings.audio.seVolume}%`; window.audio.setSeVolume(settings.audio.seVolume/100); saveSettings(); });
  if (diffButtons) {
    diffButtons.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.cpu.difficulty = btn.dataset.diff;
        diffButtons.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b === btn));
        saveSettings();
        // reset CPU target so next tick uses the new noise/miss settings immediately
        if (cpuBoard) { cpuBoard.cpuTarget = null; cpuBoard.cpuActionTimer = 0; }
      });
    });
  }

  modal.querySelectorAll('[data-toggle-display]').forEach(t => t.addEventListener('click', () => {
    const key = t.dataset.toggleDisplay;
    settings.display[key] = !settings.display[key];
    t.setAttribute('aria-pressed', settings.display[key] ? 'true' : 'false');
    applyDisplaySettings(); saveSettings();
  }));
  modal.querySelectorAll('[data-toggle-audio]').forEach(t => t.addEventListener('click', () => {
    const key = t.dataset.toggleAudio;
    settings.audio[key] = !settings.audio[key];
    t.setAttribute('aria-pressed', settings.audio[key] ? 'true' : 'false');
    applyAudioSettings();
    if (key === 'bgm' && settings.audio.bgm && !paused && !playerBoard.gameOver && appState === 'playing') { window.audio.resume(); window.audio.startBGM(); bgmStartedOnce = true; }
    if (key === 'se' && settings.audio.se) window.audio.playSE('move');
    saveSettings();
  }));
  modal.querySelectorAll('[data-toggle-cpu]').forEach(t => t.addEventListener('click', () => {
    const key = t.dataset.toggleCpu;
    settings.cpu[key] = !settings.cpu[key];
    t.setAttribute('aria-pressed', settings.cpu[key] ? 'true' : 'false');
    saveSettings();
  }));

  function openModal() {
    if (modalOpen) return;
    wasPausedBeforeModal = paused;
    if (appState === 'playing' && !paused && !playerBoard.gameOver && !matchEnded) togglePause();
    modalOpen = true;
    buildBindingRows(); refreshBindingButtons();
    buildPadBindingRows(); refreshPadBindingButtons();
    syncSlidersFromSettings(); syncTogglesFromSettings();
    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false');
    for (const k in held) delete held[k];
  }
  function closeModal() {
    if (!modalOpen) return;
    stopRebind(); stopPadRebind();
    modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); modalOpen = false;
    if (appState === 'playing' && !wasPausedBeforeModal && paused && !playerBoard.gameOver && !matchEnded) togglePause();
  }
  closeSettings.addEventListener('click', closeModal);
  applyClose.addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  resetDefaultsBtn.addEventListener('click', () => {
    settings = JSON.parse(JSON.stringify(DEFAULTS)); saveSettings();
    buildBindingRows(); refreshBindingButtons();
    buildPadBindingRows(); refreshPadBindingButtons();
    syncSlidersFromSettings(); syncTogglesFromSettings();
    for (const b of activeBoards) recalcDropInterval(b);
  });

  // ---------- RESET ----------
  function resetBoard(b) {
    b.grid = createGrid();
    b.score = 0; b.scoreDisplay = 0;
    b.lines = 0; b.level = 1;
    b.goal = mode === 'infinity' ? 5 : 10;
    b.combo = -1; b.b2b = 0;
    recalcDropInterval(b);
    b.dropTimer = 0;
    b.gameOver = false;
    b.bag = []; b.queue = [];
    b.hold = null; b.holdLocked = false;
    if (b.holdPanel) b.holdPanel.classList.remove('locked');
    b.flashing = null;
    b.particles.length = 0;
    b.current = null;
    b.pendingGarbage = 0;
    b.cpuTarget = null; b.cpuActionTimer = 0;
    if (b.popupLayer) b.popupLayer.innerHTML = '';
    hideOverlay(b);
    refillQueue(b);
    spawn(b);
    updateHud(b);
    drawHold(b);
  }
  function reset() {
    matchEnded = false;
    paused = false;
    startTime = performance.now(); pausedTotal = 0; pauseStarted = 0;
    shakeAmount = 0;
    gameFrame.style.transform = ''; if (cpuFrame) cpuFrame.style.transform = '';
    for (const k in held) delete held[k];
    fxLayer.innerHTML = '';
    for (const b of activeBoards) resetBoard(b);
    window.audio.stopBGM();
    if (settings.audio.bgm && bgmStartedOnce) window.audio.startBGM();
  }

  // ---------- MATCH END (VS) ----------
  function checkMatchEnd() {
    if (mode !== 'cpu' || matchEnded) return;
    if (playerBoard.gameOver || cpuBoard.gameOver) matchEnded = true;
  }

  // ---------- GAME LOOP ----------
  function updateBoardTick(b, dt, t) {
    if (b.gameOver) return;
    if (b.flashing) {
      b.flashing.timer += dt;
      if (b.flashing.timer >= LINE_FLASH_MS) completeLineClear(b);
      return;
    }
    if (b.isCPU) cpuStep(b, dt);
    else processHeld(t);
    const isSoft = !b.isCPU && (!!held.softDrop || !!padHeld.softDrop);
    const interval = isSoft ? Math.max(16, b.dropInterval / settings.handling.sdf) : b.dropInterval;
    const ground = b.current ? isOnGround(b) : false;
    if (!ground) {
      b.lockDelay.active = false; b.lockDelay.timer = 0; b.lockDelay.resets = 0;
      b.dropTimer += dt;
      let safety = 30;
      while (b.dropTimer >= interval && safety-- > 0) {
        b.dropTimer -= interval;
        if (!stepDown(b, isSoft)) break;
        if (b.gameOver || b.flashing) break;
      }
    } else {
      b.dropTimer = 0;
      if (settings.handling.lockDelay <= 0 || b.isCPU) lockPiece(b);
      else {
        if (!b.lockDelay.active) { b.lockDelay.active = true; b.lockDelay.timer = 0; b.lockDelay.resets = 0; }
        b.lockDelay.timer += dt;
        if (b.lockDelay.timer >= settings.handling.lockDelay) lockPiece(b);
      }
    }
  }

  function loop(t) {
    try {
      const dt = Math.min(100, t - lastTime); lastTime = t;
      // Hit-stop: freeze gameplay update on impactful clears, but keep
      // particles and shake rendering so the frozen moment still feels alive.
      const frozen = t < hitStopUntil;
      pollGamepad(t);
      if (appState === 'menu') updateModeBg(dt);
      else if (appState === 'playing') {
        if (!paused && !matchEnded && !frozen) for (const b of activeBoards) updateBoardTick(b, dt, t);
        checkMatchEnd();
        for (const b of activeBoards) {
          updateParticles(b, dt);
          drawBoard(b);
          tickScoreDisplay(b);
        }
        applyShake();
        updateTime(t);
      }
    } catch (e) {
      // Don't let a single-frame error freeze the whole loop
      console.error('loop error:', e);
    }
    requestAnimationFrame(loop);
  }

  applyDisplaySettings();
  applyAudioSettings();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();

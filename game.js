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

  const $ = (id) => document.getElementById(id);  // ---------- CUSTOMIZATION SYSTEM & PALETTES (20 Skins & 10 Backgrounds) ----------
  const SKINS = {
    classic: { name: 'CLASSIC (標準)', desc: '普通のブロック' },
    neon: { name: 'NEON (発光)', desc: 'サイバーで鮮やかなブロック' },
    pastel: { name: 'PASTEL (パステル)', desc: '柔らかいお菓子のような色合い' },
    retro: { name: 'RETRO (レトロ)', desc: '懐かしのファミコン風ドット' },
    monochrome: { name: 'MONO (モノクロ)', desc: '白黒グレーのシックなパレット' },
    gold: { name: 'GOLD (ゴールド)', desc: '豪華絢爛な黄金色の輝き' },
    ruby: { name: 'RUBY (ルビー)', desc: '情熱的なルビーレッド' },
    sapphire: { name: 'SAPPHIRE (サファイア)', desc: '深海のようなロイヤルブルー' },
    emerald: { name: 'EMERALD (エメラルド)', desc: '神秘的なエメラルドグリーン' },
    topaz: { name: 'TOPAZ (トパーズ)', desc: '温かみのあるトパーズオレンジ' },
    amethyst: { name: 'AMETHYST (アメジスト)', desc: '高貴なアメジストパープル' },
    mint: { name: 'MINT (ミントチョコ)', desc: '爽やかなミント＆ブラウンチョコ' },
    cherry: { name: 'CHERRY (サクラ)', desc: '華やかなチェリーピンク' },
    banana: { name: 'BANANA (バナナ)', desc: 'ポップなトロピカルバナナイエロー' },
    soda: { name: 'SODA (ラムネ)', desc: 'シュワッとするラムネブルー' },
    toy: { name: 'TOY (おもちゃ)', desc: '子供部屋のようなカラフルカラー' },
    chalk: { name: 'CHALK (チョーク)', desc: '黒板に描いたようなマット色' },
    metal: { name: 'METAL (鉄鋼)', desc: '冷たく重厚なシルバーメタル' },
    wood: { name: 'WOOD (木目)', desc: '温かみのあるナチュラルブラウン' },
    glass: { name: 'GLASS (硝子)', desc: '透明感のある涼しげなクリアカラー' }
  };

  const BACKGROUNDS = {
    default: { name: 'DEFAULT (宇宙)', desc: '深宇宙のグラデーション' },
    sky: { name: 'SKY BLUE (青空)', desc: '爽やかで晴れ渡るスカイブルー' },
    pink: { name: 'SWEET PINK (ピンク)', desc: '甘くて可愛いファンシーピンク' },
    mint: { name: 'MINT GREEN (ミント)', desc: 'シンプルで落ち着くミントグリーン' },
    lavender: { name: 'LAVENDER (スミレ)', desc: '可憐なラベンダーパープル' },
    sunset: { name: 'SUNSET (夕焼け)', desc: '黄金色に染まる夕焼け空' },
    night: { name: 'DARK NIGHT (常闇)', desc: '静寂に包まれたミッドナイトブルー' },
    snow: { name: 'SNOW WHITE (純白)', desc: '降り積もる新雪のようなクリーンホワイト' },
    golddust: { name: 'GOLD DUST (砂金)', desc: 'ゴージャスに光り輝くゴールドダスト' },
    forest: { name: 'DEEP FOREST (深緑)', desc: '自然を感じる深い森のグリーン' },
    ghoul: { name: 'SECRET (喰種)', desc: '赤と黒の狂気的な隻眼の少年' },
    kaiju: { name: 'SECRET (怪獣)', desc: '闇を照らす脅威の怪獣8号' }
  };

  // Helper to generate single-color theme pallete
  function makeThemeColors(base, light, dark, puyoBase, puyoLight, puyoDark) {
    const c = {};
    const t = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'G'];
    t.forEach(k => {
      c[k] = { base: k === 'G' ? '#6b7280' : base, light: k === 'G' ? '#9ca3af' : light, dark: k === 'G' ? '#374151' : dark };
    });
    const pt = ['R', 'B', 'G_puyo', 'Y', 'P', 'O_puyo'];
    pt.forEach(k => {
      c[k] = { base: k === 'O_puyo' ? '#9ca3af' : puyoBase, light: k === 'O_puyo' ? '#f3f4f6' : puyoLight, dark: k === 'O_puyo' ? '#4b5563' : puyoDark };
    });
    return c;
  }

  const SKIN_COLORS = {
    classic: {
      I: { base:'#22d3ee', light:'#a5f3fc', dark:'#0e7490' },
      J: { base:'#3b82f6', light:'#93c5fd', dark:'#1e3a8a' },
      L: { base:'#f97316', light:'#fdba74', dark:'#9a3412' },
      O: { base:'#facc15', light:'#fde68a', dark:'#a16207' },
      S: { base:'#22c55e', light:'#86efac', dark:'#166534' },
      T: { base:'#a855f7', light:'#d8b4fe', dark:'#6b21a8' },
      Z: { base:'#ef4444', light:'#fca5a5', dark:'#7f1d1d' },
      G: { base:'#6b7280', light:'#9ca3af', dark:'#374151' },
      R: { base:'#ef4444', light:'#fca5a5', dark:'#b91c1c' },
      B: { base:'#3b82f6', light:'#93c5fd', dark:'#1d4ed8' },
      G_puyo: { base:'#22c55e', light:'#86efac', dark:'#15803d' },
      Y: { base:'#eab308', light:'#fef08a', dark:'#a16207' },
      P: { base:'#a855f7', light:'#d8b4fe', dark:'#7e22ce' },
      O_puyo: { base:'#9ca3af', light:'#f3f4f6', dark:'#4b5563' }
    },
    neon: {
      I: { base:'#00ffff', light:'#d8ffff', dark:'#008b8b' },
      J: { base:'#0000ff', light:'#b0b0ff', dark:'#00008b' },
      L: { base:'#ffaa00', light:'#ffeed0', dark:'#aa5500' },
      O: { base:'#ffff00', light:'#ffffe0', dark:'#8b8b00' },
      S: { base:'#00ff00', light:'#d0ffd0', dark:'#008b00' },
      T: { base:'#ff00ff', light:'#ffd0ff', dark:'#8b008b' },
      Z: { base:'#ff0000', light:'#ffd0d0', dark:'#8b0000' },
      G: { base:'#888888', light:'#dddddd', dark:'#444444' },
      R: { base:'#ff3333', light:'#ff9999', dark:'#aa0000' },
      B: { base:'#3333ff', light:'#9999ff', dark:'#0000aa' },
      G_puyo: { base:'#33ff33', light:'#99ff99', dark:'#00aa00' },
      Y: { base:'#ffff33', light:'#ffff99', dark:'#aaaa00' },
      P: { base:'#ff33ff', light:'#ff99ff', dark:'#aa00aa' },
      O_puyo: { base:'#888888', light:'#cccccc', dark:'#444444' }
    },
    pastel: {
      I: { base:'#7dd3fc', light:'#e0f2fe', dark:'#0369a1' },
      J: { base:'#93c5fd', light:'#eff6ff', dark:'#1d4ed8' },
      L: { base:'#fdba74', light:'#fff7ed', dark:'#c2410c' },
      O: { base:'#fef08a', light:'#fefce8', dark:'#a16207' },
      S: { base:'#86efac', light:'#f0fdf4', dark:'#15803d' },
      T: { base:'#d8b4fe', light:'#faf5ff', dark:'#7e22ce' },
      Z: { base:'#fca5a5', light:'#fef2f2', dark:'#b91c1c' },
      G: { base:'#d1d5db', light:'#f3f4f6', dark:'#4b5563' },
      R: { base:'#fca5a5', light:'#fef2f2', dark:'#b91c1c' },
      B: { base:'#93c5fd', light:'#eff6ff', dark:'#1d4ed8' },
      G_puyo: { base:'#86efac', light:'#f0fdf4', dark:'#15803d' },
      Y: { base:'#fef08a', light:'#fefce8', dark:'#a16207' },
      P: { base:'#d8b4fe', light:'#faf5ff', dark:'#7e22ce' },
      O_puyo: { base:'#d1d5db', light:'#f3f4f6', dark:'#4b5563' }
    },
    retro: {
      I: { base:'#ff4500', light:'#ff7f50', dark:'#8b0000' },
      J: { base:'#1e90ff', light:'#87cefa', dark:'#00008b' },
      L: { base:'#ff8c00', light:'#ffa500', dark:'#8b4500' },
      O: { base:'#ffd700', light:'#fff8dc', dark:'#b8860b' },
      S: { base:'#32cd32', light:'#98fb98', dark:'#006400' },
      T: { base:'#ba55d3', light:'#dda0dd', dark:'#4b0082' },
      Z: { base:'#dc143c', light:'#ff69b4', dark:'#8b0000' },
      G: { base:'#778899', light:'#b0c4de', dark:'#2f4f4f' },
      R: { base:'#dc143c', light:'#ff69b4', dark:'#8b0000' },
      B: { base:'#1e90ff', light:'#87cefa', dark:'#00008b' },
      G_puyo: { base:'#32cd32', light:'#98fb98', dark:'#006400' },
      Y: { base:'#ffd700', light:'#fff8dc', dark:'#b8860b' },
      P: { base:'#ba55d3', light:'#dda0dd', dark:'#4b0082' },
      O_puyo: { base:'#778899', light:'#b0c4de', dark:'#2f4f4f' }
    },
    monochrome: makeThemeColors('#6b7280', '#e5e7eb', '#374151', '#9ca3af', '#f3f4f6', '#4b5563'),
    gold: makeThemeColors('#fbbf24', '#fef3c7', '#78350f', '#fbbf24', '#fef3c7', '#78350f'),
    ruby: makeThemeColors('#ef4444', '#fee2e2', '#991b1b', '#ef4444', '#fee2e2', '#991b1b'),
    sapphire: makeThemeColors('#2563eb', '#dbeafe', '#1e40af', '#2563eb', '#dbeafe', '#1e40af'),
    emerald: makeThemeColors('#059669', '#d1fae5', '#065f46', '#059669', '#d1fae5', '#065f46'),
    topaz: makeThemeColors('#d97706', '#fef3c7', '#78350f', '#d97706', '#fef3c7', '#78350f'),
    amethyst: makeThemeColors('#7c3aed', '#ede9fe', '#5b21b6', '#7c3aed', '#ede9fe', '#5b21b6'),
    mint: makeThemeColors('#a7f3d0', '#f0fdf4', '#064e3b', '#78350f', '#fef3c7', '#451a03'),
    cherry: makeThemeColors('#ec4899', '#fce7f3', '#9d174d', '#ec4899', '#fce7f3', '#9d174d'),
    banana: makeThemeColors('#eab308', '#fef9c3', '#854d0e', '#eab308', '#fef9c3', '#854d0e'),
    soda: makeThemeColors('#0ea5e9', '#e0f2fe', '#075985', '#0ea5e9', '#e0f2fe', '#075985'),
    toy: {
      I: { base:'#ff0055', light:'#ff88aa', dark:'#990033' },
      J: { base:'#00aaff', light:'#88ddff', dark:'#005599' },
      L: { base:'#ffaa00', light:'#ffd588', dark:'#996600' },
      O: { base:'#aaff00', light:'#ddff88', dark:'#559900' },
      S: { base:'#00ffaa', light:'#88ffdd', dark:'#009955' },
      T: { base:'#aa00ff', light:'#dd88ff', dark:'#550099' },
      Z: { base:'#ff5500', light:'#ffaa88', dark:'#993300' },
      G: { base:'#88aaff', light:'#ccddee', dark:'#445599' },
      R: { base:'#ff0055', light:'#ff88aa', dark:'#990033' },
      B: { base:'#00aaff', light:'#88ddff', dark:'#005599' },
      G_puyo: { base:'#00ffaa', light:'#88ffdd', dark:'#009955' },
      Y: { base:'#ffaa00', light:'#ffd588', dark:'#996600' },
      P: { base:'#aa00ff', light:'#dd88ff', dark:'#550099' },
      O_puyo: { base:'#88aaff', light:'#ccddee', dark:'#445599' }
    },
    chalk: makeThemeColors('#94a3b8', '#cbd5e1', '#475569', '#cbd5e1', '#f1f5f9', '#64748b'),
    metal: makeThemeColors('#94a3b8', '#cbd5e1', '#334155', '#475569', '#94a3b8', '#1e293b'),
    wood: makeThemeColors('#854d0e', '#fef9c3', '#451a03', '#a16207', '#fef08a', '#78350f'),
    glass: makeThemeColors('#e2e8f0', '#ffffff', '#cbd5e1', '#ffffff', '#ffffff', '#e2e8f0'),
    retro: {
      I: { base:'#ff4500', light:'#ff7f50', dark:'#8b0000' },
      J: { base:'#1e90ff', light:'#87cefa', dark:'#00008b' },
      L: { base:'#ff8c00', light:'#ffa500', dark:'#8b4500' },
      O: { base:'#ffd700', light:'#fff8dc', dark:'#b8860b' },
      S: { base:'#32cd32', light:'#98fb98', dark:'#006400' },
      T: { base:'#ba55d3', light:'#dda0dd', dark:'#4b0082' },
      Z: { base:'#dc143c', light:'#ff69b4', dark:'#8b0000' },
      G: { base:'#778899', light:'#b0c4de', dark:'#2f4f4f' },
      R: { base:'#dc143c', light:'#ff69b4', dark:'#8b0000' },
      B: { base:'#1e90ff', light:'#87cefa', dark:'#00008b' },
      G_puyo: { base:'#32cd32', light:'#98fb98', dark:'#006400' },
      Y: { base:'#ffd700', light:'#fff8dc', dark:'#b8860b' },
      P: { base:'#ba55d3', light:'#dda0dd', dark:'#4b0082' },
      O_puyo: { base:'#778899', light:'#b0c4de', dark:'#2f4f4f' }
    }
  };

  let userCoins = 0;
  try {
    userCoins = parseInt(localStorage.getItem('puyotetris_coins') || '0');
    if (isNaN(userCoins)) userCoins = 0;
  } catch (e) {
    userCoins = 0;
  }

  let ownedSkins = ["classic"];
  try {
    ownedSkins = JSON.parse(localStorage.getItem('puyotetris_owned_skins') || '["classic"]');
    if (!Array.isArray(ownedSkins)) ownedSkins = ["classic"];
  } catch (e) {
    ownedSkins = ["classic"];
  }

  let ownedBgs = ["default"];
  try {
    ownedBgs = JSON.parse(localStorage.getItem('puyotetris_owned_bgs') || '["default"]');
    if (!Array.isArray(ownedBgs)) ownedBgs = ["default"];
  } catch (e) {
    ownedBgs = ["default"];
  }

  let activeSkin = 'classic';
  try {
    activeSkin = localStorage.getItem('puyotetris_active_skin') || 'classic';
  } catch (e) {
    activeSkin = 'classic';
  }

  let activeBg = 'default';
  try {
    activeBg = localStorage.getItem('puyotetris_active_bg') || 'default';
  } catch (e) {
    activeBg = 'default';
  }

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
    display: { renderMode:false, ghost:true, grid:true, glow:true, stars:true, particles:true, shake:true, popups:true, flash:true, impact:true, vignette:true },
    cpu: { difficulty:'normal', autoRestart:true, showTarget:true, hoikoSpeed:50 },
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

  // ---------- PUYO PUYO DEFINITIONS ----------
  const PUYO_COLORS = {
    R: { base:'#ef4444', light:'#fca5a5', dark:'#b91c1c' }, // Red
    B: { base:'#3b82f6', light:'#93c5fd', dark:'#1d4ed8' }, // Blue
    G: { base:'#22c55e', light:'#86efac', dark:'#15803d' }, // Green
    Y: { base:'#eab308', light:'#fef08a', dark:'#a16207' }, // Yellow
    P: { base:'#a855f7', light:'#d8b4fe', dark:'#7e22ce' }, // Purple
    O: { base:'#9ca3af', light:'#f3f4f6', dark:'#4b5563' }, // Garbage grey
  };
  const PUYO_TYPES = ['R', 'B', 'G', 'Y', 'P'];

  // One authentic Puyo white eye: big sclera with a sharp top point (splaying
  // outward) and a round bottom that converges to the center, so the pair meets
  // in the middle. Pupils are drawn separately (forward-facing) by the caller.
  function drawPuyoPointedEye(c, ex, ey, ew, eh, rot, dark) {
    c.save();
    c.translate(ex, ey);
    c.rotate(rot);
    c.beginPath();
    c.moveTo(0, -eh);                              // sharp top point
    c.bezierCurveTo(ew, -eh * 0.85, ew, eh * 0.55, 0, eh);   // outer side -> round bottom
    c.bezierCurveTo(-ew, eh * 0.55, -ew, -eh * 0.85, 0, -eh); // inner side -> back to point
    c.closePath();
    c.fillStyle = '#ffffff';
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = dark;
    c.globalAlpha = 0.3;
    c.stroke();
    c.globalAlpha = 1;
    c.restore();
  }

  function drawPuyo(c, x, y, size, type, grid, anim) {
    const px = x * size, py = y * size;
    const colors = PUYO_COLORS[type];
    if (!colors) return;

    // Connect check (guard rows so empty preview grids [] don't throw)
    let u = y > 0 && grid[y-1] && grid[y-1][x] === type;
    let d = y < ROWS - 1 && grid[y+1] && grid[y+1][x] === type;
    let l = x > 0 && grid[y] && grid[y][x-1] === type;
    let r = x < COLS - 1 && grid[y] && grid[y][x+1] === type;

    if (type === 'O') { u = d = l = r = false; } // Garbage Puyo doesn't connect

    const radius = size * 0.46;
    const cx = px + size / 2;
    const cy = py + size / 2;
    const s = size; // alias

    c.save();

    // ── Squash & stretch / jiggle transform ──
    // anim = { sx, sy, ox, oy, blink, flash }. Scaling anchors on the cell
    // bottom so a landing puyo squishes onto the floor like a gel blob.
    if (anim) {
      if (anim.ox || anim.oy) c.translate(anim.ox || 0, anim.oy || 0);
      if ((anim.sx && anim.sx !== 1) || (anim.sy && anim.sy !== 1)) {
        const ax = cx, ay = py + size;
        c.translate(ax, ay);
        c.scale(anim.sx || 1, anim.sy || 1);
        c.translate(-ax, -ay);
      }
    }

    // ── Body shape (rounded with connection flattening) ──
    const rT = u ? 0 : radius;
    const rB = d ? 0 : radius;
    const rL = l ? 0 : radius;
    const rR = r ? 0 : radius;
    
    c.beginPath();
    c.moveTo(cx, py + (u ? 0 : 2));
    c.arcTo(px + size - (r ? 0 : 2), py + (u ? 0 : 2), px + size - (r ? 0 : 2), cy, rR);
    c.arcTo(px + size - (r ? 0 : 2), py + size - (d ? 0 : 2), cx, py + size - (d ? 0 : 2), rB);
    c.arcTo(px + (l ? 0 : 2), py + size - (d ? 0 : 2), px + (l ? 0 : 2), cy, rL);
    c.arcTo(px + (l ? 0 : 2), py + (u ? 0 : 2), cx, py + (u ? 0 : 2), rT);
    c.closePath();

    // ── Radial gradient body fill (3D sphere look) ──
    const grad = c.createRadialGradient(cx - s * 0.15, cy - s * 0.18, s * 0.05, cx, cy, s * 0.52);
    grad.addColorStop(0, colors.light);
    grad.addColorStop(0.45, colors.base);
    grad.addColorStop(1, colors.dark);
    c.fillStyle = grad;
    c.fill();

    // ── Outline ──
    c.strokeStyle = colors.dark;
    c.lineWidth = 1.6;
    c.stroke();

    // ── Big soft glossy dome highlight (wet gel shine) ──
    const gloss = c.createRadialGradient(cx - s * 0.08, cy - s * 0.24, s * 0.02, cx - s * 0.04, cy - s * 0.16, s * 0.42);
    gloss.addColorStop(0, 'rgba(255,255,255,0.78)');
    gloss.addColorStop(0.55, 'rgba(255,255,255,0.20)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gloss;
    c.beginPath();
    c.ellipse(cx - s * 0.04, cy - s * 0.15, s * 0.32, s * 0.26, 0, 0, Math.PI * 2);
    c.fill();

    // ── EYES ──
    if (type === 'O') {
      // Garbage puyo: X-shaped eyes
      c.strokeStyle = '#374151';
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      // Left X
      c.beginPath(); c.moveTo(cx - 7, cy - 4); c.lineTo(cx - 2, cy + 1); c.stroke();
      c.beginPath(); c.moveTo(cx - 2, cy - 4); c.lineTo(cx - 7, cy + 1); c.stroke();
      // Right X
      c.beginPath(); c.moveTo(cx + 2, cy - 4); c.lineTo(cx + 7, cy + 1); c.stroke();
      c.beginPath(); c.moveTo(cx + 7, cy - 4); c.lineTo(cx + 2, cy + 1); c.stroke();
    } else if (anim && anim.blink) {
      // ── Blinking: closed, happy curved eyes (‿ ‿) ──
      const eyeCY = cy + s * 0.02;
      const eyeDX = s * 0.185;
      c.strokeStyle = colors.dark;
      c.lineWidth = Math.max(2, s * 0.06);
      c.lineCap = 'round';
      c.beginPath();
      c.arc(cx - eyeDX, eyeCY - s * 0.05, s * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
      c.beginPath();
      c.arc(cx + eyeDX, eyeCY - s * 0.05, s * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
    } else {
      const eyeCY = cy + s * 0.02;
      c.strokeStyle = colors.dark;
      c.lineCap = 'round';
      c.lineJoin = 'round';

      if (type === 'Y') {
        // ── Yellow Puyo: Happy arc closed eyes (⌒ ⌒) ──
        const eyeDX = s * 0.17;
        c.lineWidth = Math.max(2.5, s * 0.08);
        c.beginPath();
        c.arc(cx - eyeDX, eyeCY + s * 0.08, s * 0.15, 1.15 * Math.PI, 1.85 * Math.PI);
        c.stroke();
        c.beginPath();
        c.arc(cx + eyeDX, eyeCY + s * 0.08, s * 0.15, 1.15 * Math.PI, 1.85 * Math.PI);
        c.stroke();
      } 
      else if (type === 'R') {
        // ── Red Puyo: Angry eyes ──
        const drawAngryEye = (isLeft) => {
          c.save();
          const ex = cx + (isLeft ? -s * 0.16 : s * 0.16);
          c.translate(ex, eyeCY);
          if (!isLeft) c.scale(-1, 1);
          
          c.beginPath();
          c.moveTo(-s * 0.18, -s * 0.12); // outer-top
          c.lineTo(s * 0.15, -s * 0.02);  // inner-top (angry slant)
          c.bezierCurveTo(s * 0.18, s * 0.18, -s * 0.05, s * 0.22, -s * 0.18, s * 0.02); // round bottom
          c.closePath();
          c.fillStyle = '#ffffff';
          c.fill();
          c.lineWidth = 1.2;
          c.strokeStyle = colors.dark;
          c.stroke();

          // Angry pupil
          c.save();
          c.clip();
          c.fillStyle = '#111111';
          c.beginPath();
          c.arc(0, s * 0.08, s * 0.11, 0, Math.PI * 2);
          c.fill();
          // Sparkle highlight
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(-s * 0.03, s * 0.04, s * 0.04, 0, Math.PI * 2);
          c.fill();
          c.restore();
          c.restore();
        };
        drawAngryEye(true);
        drawAngryEye(false);
      }
      else if (type === 'B') {
        // ── Blue Puyo: Connected droopy eyes ──
        c.save();
        const drawBlueEyeSclera = (isLeft) => {
          const ex = cx + (isLeft ? -s * 0.155 : s * 0.155);
          c.save();
          c.translate(ex, eyeCY);
          if (!isLeft) c.scale(-1, 1);
          c.beginPath();
          c.moveTo(s * 0.02, -s * 0.08); // center connect point
          c.bezierCurveTo(-s * 0.08, -s * 0.18, -s * 0.22, -s * 0.12, -s * 0.22, s * 0.05); // outer curve
          c.bezierCurveTo(-s * 0.22, s * 0.22, s * 0.02, s * 0.22, s * 0.02, -s * 0.08); // bottom round
          c.closePath();
          c.fillStyle = '#ffffff';
          c.fill();
          c.lineWidth = 1.2;
          c.strokeStyle = colors.dark;
          c.stroke();
          c.restore();
        };
        drawBlueEyeSclera(true);
        drawBlueEyeSclera(false);

        // Pupils
        const drawBluePupil = (isLeft) => {
          const ex = cx + (isLeft ? -s * 0.12 : s * 0.12);
          c.save();
          c.translate(ex, eyeCY + s * 0.06);
          c.fillStyle = '#111111';
          c.beginPath();
          c.arc(0, 0, s * 0.11, 0, Math.PI * 2);
          c.fill();
          // Highlight
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(-s * 0.03, -s * 0.03, s * 0.04, 0, Math.PI * 2);
          c.fill();
          c.restore();
        };
        drawBluePupil(true);
        drawBluePupil(false);
        c.restore();
      }
      else if (type === 'P') {
        // ── Purple Puyo: Sleepy horizontal eyes ──
        const drawSleepyEye = (isLeft) => {
          c.save();
          const ex = cx + (isLeft ? -s * 0.17 : s * 0.17);
          c.translate(ex, eyeCY);
          if (!isLeft) c.scale(-1, 1);
          
          c.beginPath();
          c.ellipse(0, 0, s * 0.18, s * 0.12, 0.1, 0, Math.PI * 2);
          c.fillStyle = '#ffffff';
          c.fill();
          c.lineWidth = 1.2;
          c.strokeStyle = colors.dark;
          c.stroke();

          // Sleepy pupil
          c.save();
          c.clip();
          c.fillStyle = '#111111';
          c.beginPath();
          c.ellipse(-s * 0.02, s * 0.04, s * 0.13, s * 0.09, 0, 0, Math.PI * 2);
          c.fill();
          // Highlight
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(-s * 0.05, s * 0.01, s * 0.035, 0, Math.PI * 2);
          c.fill();
          c.restore();
          c.restore();
        };
        drawSleepyEye(true);
        drawSleepyEye(false);
      }
      else {
        // ── Green Puyo & Default: Big round cute eyes (寄り目) ──
        const drawGreenEye = (isLeft) => {
          c.save();
          const ex = cx + (isLeft ? -s * 0.155 : s * 0.155);
          c.translate(ex, eyeCY);
          c.beginPath();
          c.ellipse(0, 0, s * 0.17, s * 0.19, 0, 0, Math.PI * 2);
          c.fillStyle = '#ffffff';
          c.fill();
          c.lineWidth = 1.2;
          c.strokeStyle = colors.dark;
          c.stroke();
          c.restore();
        };
        drawGreenEye(true);
        drawGreenEye(false);

        // Pupils
        const drawGreenPupil = (isLeft) => {
          c.save();
          const ex = cx + (isLeft ? -s * 0.105 : s * 0.105);
          c.translate(ex, eyeCY + s * 0.04);
          c.fillStyle = '#111111';
          c.beginPath();
          c.arc(0, 0, s * 0.11, 0, Math.PI * 2);
          c.fill();
          // Sparkle highlights
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(-s * 0.03, -s * 0.03, s * 0.04, 0, Math.PI * 2);
          c.fill();
          c.restore();
        };
        drawGreenPupil(true);
        drawGreenPupil(false);
      }
    }

    // ── Pre-pop white flash overlay (about to burst) ──
    if (anim && anim.flash > 0) {
      c.fillStyle = `rgba(255,255,255,${Math.min(0.85, anim.flash)})`;
      c.beginPath();
      c.ellipse(cx, cy, radius * 1.05, radius * 1.05, 0, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }

  function updateWarningQueue(b) {
    const queueEl = b.id === 'player' ? $('warningQueue') : $('warningQueue2');
    if (!queueEl) return;
    queueEl.innerHTML = '';
    let g = b.pendingGarbage;
    if (g <= 0) return;
    
    // Comet: 720, Moon: 360, Star: 180, Rock: 30, Big: 6, Small: 1
    const icons = [
      { name: 'comet', val: 720, char: '☄️' },
      { name: 'moon', val: 360, char: '🌙' },
      { name: 'star', val: 180, char: '⭐' },
      { name: 'rock', val: 30, char: '🪨' },
      { name: 'big', val: 6, char: '🔴' },
      { name: 'small', val: 1, char: '⚫' }
    ];
    
    for (const icon of icons) {
      const count = Math.floor(g / icon.val);
      g %= icon.val;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = `warning-icon warning-${icon.name}`;
        el.textContent = icon.char;
        queueEl.appendChild(el);
        if (queueEl.children.length >= 10) break;
      }
      if (queueEl.children.length >= 10) break;
    }
  }

  function triggerCutIn(text) {
    if (!settings.display.popups) return;
    const layer = $('cutInLayer');
    if (!layer) return;
    layer.innerHTML = '';
    const cutIn = document.createElement('div');
    cutIn.className = 'cut-in';
    const cutInText = document.createElement('div');
    cutInText.className = 'cut-in-text';
    cutInText.textContent = text;
    cutIn.appendChild(cutInText);
    layer.appendChild(cutIn);
    setTimeout(() => cutIn.remove(), 1000);
  }
  window.triggerCutIn = triggerCutIn;

  function init3D(b) {
    if (b.canvas3D) return;
    
    const c3d = document.createElement('canvas');
    c3d.className = b.canvas.className + ' canvas-3d';
    c3d.width = b.canvas.width;
    c3d.height = b.canvas.height;
    b.canvas.parentNode.insertBefore(c3d, b.canvas);
    b.canvas3D = c3d;

    b.scene = new THREE.Scene();
    
    b.renderer = new THREE.WebGLRenderer({ canvas: c3d, antialias: true, alpha: true });
    b.renderer.setSize(c3d.width, c3d.height);
    b.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    b.renderer.shadowMap.enabled = true;

    b.camera = new THREE.PerspectiveCamera(45, c3d.width / c3d.height, 0.1, 1000);
    b.camera.position.set(4.5, 9.5, 23.5);
    b.camera.lookAt(4.5, 9.5, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    b.scene.add(ambient);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 25, 12);
    dirLight.castShadow = true;
    b.scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0xff3ea5, 0x22e6ff);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(4.5, 9.5, -0.5);
    gridHelper.material.opacity = 0.12;
    gridHelper.material.transparent = true;
    b.scene.add(gridHelper);

    const borderGeom = new THREE.BoxGeometry(10.2, 20.2, 0.2);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x0a0014,
      roughness: 0.4,
      metalness: 0.9,
      transparent: true,
      opacity: 0.6
    });
    const borderMesh = new THREE.Mesh(borderGeom, borderMat);
    borderMesh.position.set(4.5, 9.5, -0.6);
    b.scene.add(borderMesh);
  }

  // ---------- BOARD ----------
  function createBoard(cfg) {
    const b = {
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
      type: 'tetris', // 'tetris' or 'puyo'
      puyoChain: 0,
      puyoBounce: new Map(), // key "r,c" -> land timestamp, for squash&stretch bounce

      // Three.js instances
      scene: null,
      camera: null,
      renderer: null,
      canvas3D: null,
    };
    
    if (settings.display.renderMode) {
      init3D(b);
      b.canvas.style.display = 'none';
      if (b.canvas3D) b.canvas3D.style.display = 'block';
    } else {
      b.canvas.style.display = 'block';
    }
    return b;
  }

  function createGrid() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  function nextFromBag(b) {
    if (b.type === 'puyo') {
      const p1 = PUYO_TYPES[Math.floor(Math.random() * PUYO_TYPES.length)];
      const p2 = PUYO_TYPES[Math.floor(Math.random() * PUYO_TYPES.length)];
      return { p1, p2 };
    }
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
  function makePiece(b, type) {
    if (b.type === 'puyo') {
      return { type: 'puyo', p1: type.p1, p2: type.p2, x: 4, y: 1, rotation: 0, rotateCount: 0 };
    }
    const matrix = SHAPES[type].map(r => r.slice());
    return { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: type === 'I' ? -1 : 0, rotation: 0, rotateCount: 0 };
  }
  function puyoCollides(x, y, rotation, grid) {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && grid[y][x]) return true;
    let p2x = x, p2y = y;
    if (rotation === 0) p2y--;
    else if (rotation === 1) p2x++;
    else if (rotation === 2) p2y++;
    else if (rotation === 3) p2x--;
    if (p2x < 0 || p2x >= COLS || p2y >= ROWS) return true;
    if (p2y >= 0 && grid[p2y][p2x]) return true;
    return false;
  }
  function spawn(b, typeOverride) {
    refillQueue(b);
    const type = typeOverride ?? b.queue.shift();
    refillQueue(b);
    if (b.pendingGarbage > 0) applyPendingGarbage(b);
    b.current = makePiece(b, type);
    b.holdLocked = false;
    if (b.holdPanel) b.holdPanel.classList.remove('locked');
    b.lockDelay.active = false; b.lockDelay.timer = 0; b.lockDelay.resets = 0;
    b.lastActionWasRotate = false;
    b.cpuTarget = null; b.cpuActionTimer = 0;
    
    const collided = b.type === 'puyo' 
      ? puyoCollides(b.current.x, b.current.y, b.current.rotation, b.grid)
      : collides(b.current, b.grid);
      
    if (collided) {
      if (mode === 'infinity') {
        infinityRescue(b);
        b.current = makePiece(b, type);
        const colVal = b.type === 'puyo'
          ? puyoCollides(b.current.x, b.current.y, b.current.rotation, b.grid)
          : collides(b.current, b.grid);
        if (colVal) b.grid = createGrid();
      } else if (mode === 'cpu') {
        b.gameOver = true;
        showOverlay(b, b.isCPU ? 'YOU WIN' : 'CPU WINS', 'Press R to rematch', b.isCPU ? 'win' : 'lose');
        if (b.opponent && !b.opponent.gameOver) {
          showOverlay(b.opponent, b.isCPU ? 'YOU WIN' : 'CPU WINS', 'Press R to rematch', b.isCPU ? 'win' : 'lose');
        }
        window.audio.stopBGM();
        window.audio.playSE(b.isCPU ? 'tetris' : 'gameOver');
        
        // Reward coins
        const coinsGained = Math.floor(playerBoard.score / 100);
        userCoins += coinsGained;
        localStorage.setItem('puyotetris_coins', userCoins);
        spawnPopup(playerBoard, `+${coinsGained} COINS`, 'popup-points');
      } else if (mode === 'online') {
        b.gameOver = true;
        if (p2pConn && p2pConn.open) {
          p2pConn.send({ type: 'state', gameOver: true, boardType: playerBoard.type, grid: playerBoard.grid, score: playerBoard.score });
        }
        showOverlay(playerBoard, 'YOU LOSE', 'Press R to rematch', 'lose');
        if (b.opponent) showOverlay(b.opponent, 'YOU WIN', 'Opponent topped out', 'win');
        window.audio.stopBGM();
        window.audio.playSE('gameOver');

        // Reward coins
        const coinsGained = Math.floor(playerBoard.score / 100);
        userCoins += coinsGained;
        localStorage.setItem('puyotetris_coins', userCoins);
        spawnPopup(playerBoard, `+${coinsGained} COINS`, 'popup-points');
      } else {
        b.gameOver = true;
        showOverlay(b, 'GAME OVER', 'Press R to restart');
        window.audio.stopBGM();
        window.audio.playSE('gameOver');

        // Reward coins
        const coinsGained = Math.floor(playerBoard.score / 100);
        userCoins += coinsGained;
        localStorage.setItem('puyotetris_coins', userCoins);
        spawnPopup(playerBoard, `+${coinsGained} COINS`, 'popup-points');
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
    if (b.type === 'puyo') {
      const fromRot = b.current.rotation || 0;
      const toRot = (fromRot + (dir > 0 ? 1 : 3)) % 4;
      // Kick: try current pos, then left, then right
      const tries = [[0, 0], [-1, 0], [1, 0]];
      // If we are rotating vertical -> vertical in tight space, try quickturn
      for (const [kx, ky] of tries) {
        if (!puyoCollides(b.current.x + kx, b.current.y + ky, toRot, b.grid)) {
          b.current.x += kx;
          b.current.y += ky;
          b.current.rotation = toRot;
          if (!b.isCPU) window.audio.playSE('puyoRotate');
          consumeLockReset(b);
          return true;
        }
      }
      // Quickturn (180 degree flip in narrow vertical channel)
      const oppositeRot = (fromRot + 2) % 4;
      if (!puyoCollides(b.current.x, b.current.y, oppositeRot, b.grid)) {
        b.current.rotation = oppositeRot;
        // Swap colors for intuitive visual flip
        const tmp = b.current.p1; b.current.p1 = b.current.p2; b.current.p2 = tmp;
        if (!b.isCPU) window.audio.playSE('puyoRotate');
        consumeLockReset(b);
        return true;
      }
      return false;
    }
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
    if (b.type === 'puyo') {
      if (!puyoCollides(b.current.x + dx, b.current.y, b.current.rotation, b.grid)) {
        b.current.x += dx;
        consumeLockReset(b);
        if (!b.isCPU) window.audio.playSE('puyoMove');
        return true;
      }
      return false;
    }
    const test = { ...b.current, x: b.current.x + dx };
    if (!collides(test, b.grid)) { b.current = test; b.lastActionWasRotate = false; consumeLockReset(b); if (!b.isCPU) window.audio.playSE('move'); return true; }
    return false;
  }
  function stepDown(b, userTriggered) {
    if (!b.current || b.gameOver || paused || b.flashing) return false;
    if (b.type === 'puyo') {
      if (!puyoCollides(b.current.x, b.current.y + 1, b.current.rotation, b.grid)) {
        b.current.y++;
        if (userTriggered) b.score += 1;
        return true;
      }
      return false;
    }
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
    if (b.type === 'puyo') {
      while (!puyoCollides(b.current.x, b.current.y + 1, b.current.rotation, b.grid)) {
        b.current.y++;
        drop++;
      }
      b.score += drop * 2;
      if (!b.isCPU) {
        if (settings.display.shake) shake(5 + Math.min(4, drop * 0.3));
        window.audio.playSE('puyoPlace');
      }
      lockPiece(b);
      return;
    }
    while (!collides({ ...b.current, y: b.current.y + 1 }, b.grid)) { b.current.y++; drop++; }
    b.score += drop * 2;
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
  function isOnGround(b) {
    if (b.type === 'puyo') return puyoCollides(b.current.x, b.current.y + 1, b.current.rotation, b.grid);
    return collides({ ...b.current, y: b.current.y + 1 }, b.grid);
  }
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
    if (b.type === 'puyo') {
      const { p1, p2, x, y, rotation } = b.current;
      if (y >= 0 && y < ROWS) b.grid[y][x] = p1;
      let p2x = x, p2y = y;
      if (rotation === 0) p2y--;
      else if (rotation === 1) p2x++;
      else if (rotation === 2) p2y++;
      else if (rotation === 3) p2x--;
      if (p2y >= 0 && p2y < ROWS && p2x >= 0 && p2x < COLS) b.grid[p2y][p2x] = p2;

      // Landing bounce for the placed pair (gravity below may re-register if they fall further).
      if (!b.puyoBounce) b.puyoBounce = new Map();
      const lt = performance.now();
      if (y >= 0 && y < ROWS) b.puyoBounce.set(`${y},${x}`, lt);
      if (p2y >= 0 && p2y < ROWS && p2x >= 0 && p2x < COLS) b.puyoBounce.set(`${p2y},${p2x}`, lt);

      b.current = null;
      b.puyoChain = 0;
      checkPuyoChains(b, () => {
        spawn(b);
      });
      return;
    }
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

  function checkPuyoChains(b, onComplete) {
    let dropped = false;
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 2; r >= 0; r--) {
        if (b.grid[r][c] && !b.grid[r+1][c]) {
          let targetY = r;
          while (targetY + 1 < ROWS && !b.grid[targetY+1][c]) targetY++;
          b.grid[targetY][c] = b.grid[r][c];
          b.grid[r][c] = null;
          if (targetY !== r) { if (!b.puyoBounce) b.puyoBounce = new Map(); b.puyoBounce.set(`${targetY},${c}`, performance.now()); }
          dropped = true;
        }
      }
    }
    if (dropped) {
      setTimeout(() => checkPuyoChains(b, onComplete), 70);
      return;
    }

    const toClear = [];
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = b.grid[r][c];
        if (type && type !== 'O' && !visited[r][c]) {
          const group = [];
          const queue = [[r, c]];
          visited[r][c] = true;
          while (queue.length > 0) {
            const [cr, cc] = queue.shift();
            group.push([cr, cc]);
            const neighbors = [[cr-1, cc], [cr+1, cc], [cr, cc-1], [cr, cc+1]];
            for (const [nr, nc] of neighbors) {
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (b.grid[nr][nc] === type && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }
          if (group.length >= 4) toClear.push(...group);
        }
      }
    }

    if (toClear.length > 0) {
      const oClear = [];
      const clearSet = new Set(toClear.map(([r, c]) => `${r},${c}`));
      for (const [cr, cc] of toClear) {
        const neighbors = [[cr-1, cc], [cr+1, cc], [cr, cc-1], [cr, cc+1]];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (b.grid[nr][nc] === 'O' && !clearSet.has(`${nr},${nc}`)) {
              oClear.push([nr, nc]);
              clearSet.add(`${nr},${nc}`);
            }
          }
        }
      }
      toClear.push(...oClear);

      b.flashing = { puyos: toClear, timer: 0, start: performance.now() };
      if (b.puyoChain === undefined) b.puyoChain = 0;
      b.puyoChain++;

      if (!b.isCPU) {
        window.audio.playSE('puyoPop');
        window.audio.playSE('puyoChain', b.puyoChain);
        const spells = ["FIRE!", "ICE STORM!", "DIACUTE!", "BRAIN DAMNED!", "JUGEM!", "BAYOEN!"];
        const spell = spells[Math.min(spells.length, b.puyoChain) - 1];
        triggerCutIn(`${b.puyoChain} CHAIN: ${spell}`);
        spawnPopup(b, `${b.puyoChain} CHAIN!`, 'popup-combo');
      }

      setTimeout(() => {
        for (const [r, c] of toClear) {
          if (settings.display.particles) emitClearParticles(b, c, r, b.grid[r][c]);
          b.grid[r][c] = null;
        }
        b.flashing = null;
        applyPuyoScoreAndFx(b, toClear.length);
        checkPuyoChains(b, onComplete);
      }, 250);
    } else {
      onComplete();
    }
  }

  function applyPuyoScoreAndFx(b, clearedCount) {
    const chainBonus = [0, 8, 18, 38, 78, 120, 180, 250, 320][b.puyoChain] || 400;
    const points = clearedCount * 12 * b.level + chainBonus;
    b.score += points;
    b.lines += Math.floor(clearedCount / 4);
    const linesPerLevel = mode === 'infinity' ? 5 : 10;
    const newLevel = Math.floor(b.lines / linesPerLevel) + 1;
    b.goal = Math.max(0, newLevel * linesPerLevel - b.lines);
    if (newLevel !== b.level) {
      b.level = newLevel; recalcDropInterval(b);
      spawnPopup(b, `LEVEL ${b.level}`, 'popup-levelup');
      if (!b.isCPU) { window.audio.playSE('levelUp'); if (settings.display.flash) triggerFlash('level'); }
    }
    spawnPopup(b, `+${points}`, 'popup-points');
    if (b.scoreEl) bumpDigi(b.scoreEl);
    updateHud(b);

    if (mode === 'cpu' && b.opponent && !b.opponent.gameOver) {
      let g = 0;
      if (b.puyoChain >= 1) {
        // Send: 1 chain = 1, 2 chain = 6, 3 chain = 12, 4 chain = 24, 5 chain = 48, 6 chain = 72
        const puyoG = [0, 1, 6, 12, 24, 48, 72, 96, 120][b.puyoChain] || 150;
        g = puyoG;
        if (b.opponent.type === 'tetris') {
          // Convert Puyo garbage (e.g. 6 puyos = 1 line)
          g = Math.max(1, Math.floor(puyoG / 6));
        }
        if (g > 0) sendGarbage(b, g);
      }
    }
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
    if (b.type === 'puyo') {
      const cur = { p1: b.current.p1, p2: b.current.p2 };
      if (b.hold) {
        const s = b.hold;
        b.hold = cur;
        spawn(b, s);
      } else {
        b.hold = cur;
        spawn(b);
      }
      b.holdLocked = true;
      if (b.holdPanel) b.holdPanel.classList.add('locked');
      if (!b.isCPU) window.audio.playSE('hold');
      drawHold(b);
      return;
    }
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
    if (mode === 'online') {
      if (p2pConn && p2pConn.open) {
        p2pConn.send({ type: 'garbage', amount: amount });
        spawnPopup(fromBoard, `+${amount} SEND`, 'popup-combo');
      }
      return;
    }
    const target = fromBoard.opponent;
    if (!target || target.gameOver) return;
    target.pendingGarbage += amount;
    if (target.garbageEl) target.garbageEl.textContent = target.pendingGarbage;
    updateWarningQueue(target);
    spawnPopup(fromBoard, `+${amount} SEND`, 'popup-combo');
  }
  function applyPendingGarbage(b) {
    const n = b.pendingGarbage;
    if (n <= 0) return;
    
    if (b.type === 'puyo') {
      let count = n;
      const cols = Array.from({ length: COLS }, (_, i) => i);
      while (count > 0) {
        cols.sort(() => Math.random() - 0.5);
        let placedAny = false;
        for (const c of cols) {
          if (count <= 0) break;
          if (!b.grid[0][c]) {
            b.grid[0][c] = 'O';
            count--;
            placedAny = true;
          }
        }
        if (!placedAny) {
          b.gameOver = true;
          break;
        }
      }
      b.pendingGarbage = 0;
      updateWarningQueue(b);
      checkPuyoChains(b, () => {});
      if (b.gameOver) {
        showOverlay(b, b.isCPU ? 'YOU WIN' : 'CPU WINS', 'Press R to rematch', b.isCPU ? 'win' : 'lose');
        if (b.opponent && !b.opponent.gameOver) {
          showOverlay(b.opponent, b.isCPU ? 'YOU WIN' : 'CPU WINS', 'Press R to rematch', b.isCPU ? 'win' : 'lose');
        }
        window.audio.stopBGM();
        window.audio.playSE(b.isCPU ? 'tetris' : 'gameOver');
      }
      return;
    }
    
    const hole = Math.floor(Math.random() * COLS);
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
    updateWarningQueue(b);
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
    // Puyo colors (R/B/G/Y/P/O) live in PUYO_COLORS; tetris colors in COLORS.
    const col = PUYO_COLORS[type] || COLORS[type] || { base: '#ffffff', light: '#ffffff' };
    const [r, g, bl] = hexToRgb(col.base);
    const [lr, lg, lb] = hexToRgb(col.light || col.base);
    const px = (cx + 0.5) * CELL, py = (cy + 0.5) * CELL;
    // Radial shard burst — "はじけて消える".
    const N = 20;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.6 + Math.random() * 4;
      const white = i % 4 === 0;
      b.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5 - Math.random() * 1.5,
        life: 0.5 + Math.random() * 0.5, maxLife: 1.0,
        size: 2 + Math.random() * 3, gravity: 0.16,
        rgb: white ? [lr, lg, lb] : [r, g, bl],
      });
    }
    // Expanding pop ring.
    b.particles.push({
      ring: true, x: px, y: py, r0: CELL * 0.28, grow: CELL * 1.3,
      life: 0.32, maxLife: 0.32, gravity: 0, vx: 0, vy: 0, size: 0,
      rgb: [lr, lg, lb],
    });
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

  // ---------- 2D GRAPHICS RENDERERS ----------
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

  function drawBlock(ctx, x, y, cell, type) {
    const col = COLORS[type];
    if (!col) return;
    ctx.fillStyle = col.base;
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    ctx.fillStyle = col.light;
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, 3);
    ctx.fillRect(x * cell + 1, y * cell + 1, 3, cell - 2);
    ctx.fillStyle = col.dark;
    ctx.fillRect(x * cell + 1, y * cell + cell - 4, cell - 2, 3);
    ctx.fillRect(x * cell + cell - 4, y * cell + 1, 3, cell - 2);
  }

  function drawGhostBlock(ctx, x, y, cell, type) {
    const col = COLORS[type];
    if (!col) return;
    ctx.strokeStyle = col.base;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * cell + 2.5, y * cell + 2.5, cell - 5, cell - 5);
  }

  function drawFlashBlock(ctx, x, y, cell, phase) {
    ctx.fillStyle = `rgba(255, 255, 255, ${1.0 - phase})`;
    ctx.fillRect(x * cell, y * cell, cell, cell);
  }

  function drawCpuTargetBlock(ctx, x, y, cell) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(x * cell + 3.5, y * cell + 3.5, cell - 7, cell - 7);
  }

  function drawLockDimBlock(ctx, x, y, cell, type, dim) {
    drawBlock(ctx, x, y, cell, type);
    ctx.fillStyle = `rgba(0, 0, 0, ${dim * 0.4})`;
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }

  // NOTE: the authentic, cute drawPuyo (gradient body, big eyes, iris/pupil,
  // glossy highlight, smile) is defined earlier in this file. This older, plain
  // version used to shadow it (JS keeps the last function declaration), which is
  // why puyos rendered flat and "didn't feel like Puyo". Removed on purpose.

  function drawParticles2D(b) {
    if (!settings.display.particles) return;
    for (const p of b.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      if (p.ring) {
        // Expanding pop ring — the "burst" when a group clears.
        const prog = 1 - a;
        const rad = p.r0 + p.grow * prog;
        b.ctx.save();
        b.ctx.globalAlpha = a;
        b.ctx.strokeStyle = `rgb(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]})`;
        b.ctx.lineWidth = Math.max(1, 4 * a);
        b.ctx.beginPath();
        b.ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        b.ctx.stroke();
        b.ctx.restore();
        continue;
      }
      b.ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${a})`;
      b.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
  }

  // Per-cell puyo animation: landing squash&stretch bounce + idle blinking.
  const PUYO_BOUNCE_MS = 340;
  function puyoCellAnim(b, r, c, now) {
    let sx = 1, sy = 1;
    const bt = b.puyoBounce ? b.puyoBounce.get(`${r},${c}`) : undefined;
    if (bt !== undefined) {
      const el = now - bt;
      if (el >= 0 && el < PUYO_BOUNCE_MS) {
        const t = el / PUYO_BOUNCE_MS;
        // Decaying bounce: starts flattened on impact, overshoots, settles.
        const sq = Math.exp(-t * 5) * Math.cos(t * Math.PI * 3) * 0.26;
        sy = 1 - sq;
        sx = 1 + sq * 0.65;
      }
    }
    // Idle blink, staggered per cell so the field doesn't blink in unison.
    const period = 3400;
    const phase = ((c * 7 + r * 13) % 21) / 21;
    const blink = (((now / period) + phase) % 1) < 0.05;
    return { sx, sy, ox: 0, oy: 0, blink, flash: 0 };
  }

  function drawBoard2D(b) {
    drawGrid(b);

    if (b.type === 'puyo') {
      const now = performance.now();
      const flashPuyos = (b.flashing && b.flashing.puyos) ? new Set(b.flashing.puyos.map(([r, c]) => `${r},${c}`)) : null;
      const flashEl = (b.flashing && b.flashing.start) ? now - b.flashing.start : 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = b.grid[r][c]; if (!t) continue;
          if (flashPuyos && flashPuyos.has(`${r},${c}`)) {
            // Pre-pop プルプル: rapid wobble + swelling white flash before bursting.
            const pulse = 0.5 + 0.5 * Math.sin(flashEl * 0.05);
            drawPuyo(b.ctx, c, r, CELL, t, b.grid, {
              sx: 1 - 0.07 * pulse,
              sy: 1 + 0.07 * pulse,
              ox: Math.sin(flashEl * 0.045 + (c + r)) * CELL * 0.05,
              oy: 0,
              blink: false,
              flash: 0.2 + 0.5 * pulse,
            });
          } else {
            drawPuyo(b.ctx, c, r, CELL, t, b.grid, puyoCellAnim(b, r, c, now));
          }
        }
      }
      if (b.current && !b.gameOver && !b.flashing) {
        if (b.isCPU && b.cpuTarget && settings.cpu.showTarget) {
          const tx = b.cpuTarget.x, ty = b.cpuTarget.y, trot = b.cpuTarget.rotation;
          drawCpuTargetBlock(b.ctx, tx, ty, CELL);
          let tp2x = tx, tp2y = ty;
          if (trot === 0) tp2y--;
          else if (trot === 1) tp2x++;
          else if (trot === 2) tp2y++;
          else if (trot === 3) tp2x--;
          if (tp2y >= 0) drawCpuTargetBlock(b.ctx, tp2x, tp2y, CELL);
        }
        if (settings.display.ghost) {
          const ghost = getPuyoGhost(b);
          if (ghost) {
            const gx = ghost.x, gy = ghost.y, grot = ghost.rotation;
            b.ctx.save(); b.ctx.globalAlpha = 0.35;
            drawPuyo(b.ctx, gx, gy, CELL, b.current.p1, b.grid);
            let gp2x = gx, gp2y = gy;
            if (grot === 0) gp2y--;
            else if (grot === 1) gp2x++;
            else if (grot === 2) gp2y++;
            else if (grot === 3) gp2x--;
            if (gp2y >= 0) drawPuyo(b.ctx, gp2x, gp2y, CELL, b.current.p2, b.grid);
            b.ctx.restore();
          }
        }
        const { p1, p2, x, y, rotation } = b.current;
        if (y >= 0) drawPuyo(b.ctx, x, y, CELL, p1, b.grid);
        let p2x = x, p2y = y;
        if (rotation === 0) p2y--;
        else if (rotation === 1) p2x++;
        else if (rotation === 2) p2y++;
        else if (rotation === 3) p2x--;
        if (p2y >= 0) drawPuyo(b.ctx, p2x, p2y, CELL, p2, b.grid);
      }
      drawParticles2D(b);
      return;
    }

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
    drawParticles2D(b);
    if (b === playerBoard && mode === 'online') {
      p2pSendTimer = (p2pSendTimer + 1) % 3;
      if (p2pSendTimer === 0) sendP2PData();
    }
  }

  // ---------- 3D GEOMETRIES & MATERIALS CACHE ----------
  const geomBox = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  const geomSphere = new THREE.SphereGeometry(0.48, 20, 20);
  const geomPuyoEye = new THREE.SphereGeometry(0.12, 10, 10);
  const geomPuyoPupil = new THREE.SphereGeometry(0.06, 8, 8);
  const geomParticle = new THREE.BoxGeometry(0.15, 0.15, 0.15);

  const materialsCache = {};
  function getMaterial(colorHex, metal = 0.5, rough = 0.3, opacity = 1.0) {
    const key = `${colorHex}_${metal}_${rough}_${opacity}`;
    if (!materialsCache[key]) {
      materialsCache[key] = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: metal,
        roughness: rough,
        transparent: opacity < 1.0,
        opacity: opacity
      });
    }
    return materialsCache[key];
  }

  function create3DPuyoMesh(type) {
    const group = new THREE.Group();
    const colors = PUYO_COLORS[type] || COLORS[type];
    if (!colors) return group;

    const bodyMat = getMaterial(colors.base, 0.1, 0.1);
    const body = new THREE.Mesh(geomSphere, bodyMat);
    group.add(body);

    if (type !== 'O') {
      const eyeMat = getMaterial('#ffffff', 0.0, 0.9);
      const pupilMat = getMaterial('#000000', 0.0, 0.9);
      
      const leftEye = new THREE.Mesh(geomPuyoEye, eyeMat);
      leftEye.position.set(-0.16, 0.05, 0.38);
      leftEye.scale.set(1, 1.2, 0.3);
      group.add(leftEye);

      const rightEye = leftEye.clone();
      rightEye.position.x = 0.16;
      group.add(rightEye);

      const leftPupil = new THREE.Mesh(geomPuyoPupil, pupilMat);
      leftPupil.position.set(-0.16, 0.05, 0.42);
      leftPupil.scale.set(1, 1, 0.3);
      group.add(leftPupil);

      const rightPupil = leftPupil.clone();
      rightPupil.position.x = 0.16;
      group.add(rightPupil);
    } else {
      const crossMat = getMaterial('#374151', 0.0, 0.9);
      const crossGeom = new THREE.BoxGeometry(0.18, 0.04, 0.04);
      
      const leftEye1 = new THREE.Mesh(crossGeom, crossMat); leftEye1.rotation.z = Math.PI / 4; leftEye1.position.set(-0.16, 0.05, 0.42);
      const leftEye2 = new THREE.Mesh(crossGeom, crossMat); leftEye2.rotation.z = -Math.PI / 4; leftEye2.position.set(-0.16, 0.05, 0.42);
      group.add(leftEye1); group.add(leftEye2);

      const rightEye1 = leftEye1.clone(); rightEye1.position.x = 0.16;
      const rightEye2 = leftEye2.clone(); rightEye2.position.x = 0.16;
      group.add(rightEye1); group.add(rightEye2);
    }
    return group;
  }

  function getPuyoGhost(b) {
    if (!b.current) return null;
    let gy = b.current.y;
    while (!puyoCollides(b.current.x, gy + 1, b.current.rotation, b.grid)) gy++;
    return { x: b.current.x, y: gy, rotation: b.current.rotation };
  }

  function applyDisplaySettings() {
    for (const b of activeBoards) {
      if (settings.display.renderMode) {
        init3D(b);
        b.canvas.style.display = 'none';
        if (b.canvas3D) b.canvas3D.style.display = 'block';
      } else {
        b.canvas.style.display = 'block';
        if (b.canvas3D) b.canvas3D.style.display = 'none';
      }
    }
  }

  function drawBoard(b) {
    if (!settings.display.renderMode) {
      drawBoard2D(b);
      return;
    }
    if (!b.scene || !b.renderer) return;

    // Clean old dynamic meshes
    for (let i = b.scene.children.length - 1; i >= 0; i--) {
      const child = b.scene.children[i];
      if (child.name === "static" || child.isLight || child.isGridHelper) continue;
      if (child.geometry && child.geometry.type === "BoxGeometry" && child.position.z === -0.6) continue;
      b.scene.remove(child);
    }

    const flashRows = b.flashing && b.flashing.rows ? new Set(b.flashing.rows) : null;
    const flashPuyos = b.flashing && b.flashing.puyos ? new Set(b.flashing.puyos.map(([r, c]) => `${r},${c}`)) : null;

    // 1. Grid static content
    for (let r = 0; r < ROWS; r++) {
      const isFlashRow = flashRows && flashRows.has(r);
      for (let c = 0; c < COLS; c++) {
        const t = b.grid[r][c]; if (!t) continue;
        const isFlashPuyo = flashPuyos && flashPuyos.has(`${r},${c}`);
        
        let mesh;
        if (b.type === 'puyo') {
          if (isFlashPuyo) {
            mesh = new THREE.Mesh(geomSphere, getMaterial('#ffffff', 0, 1.0));
          } else {
            mesh = create3DPuyoMesh(t);
          }
        } else {
          const col = COLORS[t];
          if (isFlashRow) {
            mesh = new THREE.Mesh(geomBox, getMaterial('#ffffff', 0, 1.0));
          } else {
            mesh = new THREE.Mesh(geomBox, getMaterial(col.base, 0.7, 0.2));
          }
        }
        mesh.position.set(c, ROWS - 1 - r, 0);
        b.scene.add(mesh);
      }
    }

    // 2. Active Piece
    if (b.current && !b.gameOver && !b.flashing) {
      if (b.type === 'puyo') {
        const { p1, p2, x, y, rotation } = b.current;
        let p2x = x, p2y = y;
        if (rotation === 0) p2y--;
        else if (rotation === 1) p2x++;
        else if (rotation === 2) p2y++;
        else if (rotation === 3) p2x--;

        if (y >= 0) {
          const m1 = create3DPuyoMesh(p1);
          m1.position.set(x, ROWS - 1 - y, 0);
          b.scene.add(m1);
        }
        if (p2y >= 0) {
          const m2 = create3DPuyoMesh(p2);
          m2.position.set(p2x, ROWS - 1 - p2y, 0);
          b.scene.add(m2);
        }

        // Ghost
        if (settings.display.ghost) {
          const ghost = getPuyoGhost(b);
          if (ghost) {
            let gp2x = ghost.x, gp2y = ghost.y;
            if (ghost.rotation === 0) gp2y--;
            else if (ghost.rotation === 1) gp2x++;
            else if (ghost.rotation === 2) gp2y++;
            else if (ghost.rotation === 3) gp2x--;

            if (ghost.y >= 0) {
              const gm1 = create3DPuyoMesh(p1);
              gm1.position.set(ghost.x, ROWS - 1 - ghost.y, 0);
              gm1.children.forEach(c => { if (c.material) c.material = getMaterial(PUYO_COLORS[p1].base, 0, 0, 0.22); });
              b.scene.add(gm1);
            }
            if (gp2y >= 0) {
              const gm2 = create3DPuyoMesh(p2);
              gm2.position.set(gp2x, ROWS - 1 - gp2y, 0);
              gm2.children.forEach(c => { if (c.material) c.material = getMaterial(PUYO_COLORS[p2].base, 0, 0, 0.22); });
              b.scene.add(gm2);
            }
          }
        }
      } else {
        const col = COLORS[b.current.type];
        let dim = 0;
        if (b.lockDelay.active && settings.handling.lockDelay > 0) dim = Math.min(1, b.lockDelay.timer / settings.handling.lockDelay);
        const mat = getMaterial(col.base, 0.7, 0.2, 1.0 - dim * 0.35);

        b.current.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (!v) return;
          const ny = b.current.y + r, nx = b.current.x + c;
          if (ny >= 0) {
            const mesh = new THREE.Mesh(geomBox, mat);
            mesh.position.set(nx, ROWS - 1 - ny, 0);
            b.scene.add(mesh);
          }
        }));

        // Ghost
        if (settings.display.ghost) {
          const ghost = getGhost(b);
          const gMat = getMaterial(col.base, 0.3, 0.5, 0.22);
          ghost.matrix.forEach((row, r) => row.forEach((v, c) => {
            if (!v) return;
            const ny = ghost.y + r, nx = ghost.x + c;
            if (ny >= 0) {
              const mesh = new THREE.Mesh(geomBox, gMat);
              mesh.position.set(nx, ROWS - 1 - ny, 0);
              b.scene.add(mesh);
            }
          }));
        }
      }
    }

    // 3. Particles
    if (settings.display.particles && b.particles.length > 0) {
      for (const p of b.particles) {
        if (p.ring) continue; // ring pop is a 2D-only effect
        const a = Math.max(0, p.life / p.maxLife);
        const hex = `rgb(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]})`;
        const pMat = getMaterial(hex, 0.2, 0.6, a);
        const pMesh = new THREE.Mesh(geomParticle, pMat);
        
        const cx = p.x / CELL - 0.5;
        const cy = ROWS - p.y / CELL + 0.5;
        pMesh.position.set(cx, cy, 0.2);
        b.scene.add(pMesh);
      }
    }

    b.renderer.render(b.scene, b.camera);
    if (b === playerBoard && mode === 'online') {
      p2pSendTimer = (p2pSendTimer + 1) % 3;
      if (p2pSendTimer === 0) sendP2PData();
    }
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
    const cell = b.type === 'puyo' ? 22 : 16;
    
    for (let i = 0; i < NEXT_QUEUE; i++) {
      const type = b.queue[i]; if (!type) continue;
      if (b.type === 'puyo') {
        const offX = (b.nextCanvas.width - cell) / 2;
        const offY = i * slotH + (slotH - cell * 2.2) / 2;
        // Draw p2 (top) and p1 (bottom) vertically
        drawPuyo(b.nctx, offX / cell, offY / cell, cell, type.p2, []);
        drawPuyo(b.nctx, offX / cell, (offY + cell * 1.1) / cell, cell, type.p1, []);
      } else {
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
      }
      if (i < NEXT_QUEUE - 1) {
        b.nctx.strokeStyle = 'rgba(140, 240, 255, 0.18)'; b.nctx.lineWidth = 1;
        b.nctx.beginPath();
        b.nctx.moveTo(8, (i+1)*slotH + 0.5); b.nctx.lineTo(b.nextCanvas.width - 8, (i+1)*slotH + 0.5);
        b.nctx.stroke();
      }
    }
  }
  function drawHold(b) {
    if (!b.hctx) return;
    b.hctx.clearRect(0, 0, b.holdCanvas.width, b.holdCanvas.height);
    if (!b.hold) return;
    
    if (b.type === 'puyo') {
      const cell = 20;
      const offX = (b.holdCanvas.width - cell) / 2;
      const offY = (b.holdCanvas.height - cell * 2.2) / 2;
      drawPuyo(b.hctx, offX / cell, offY / cell, cell, b.hold.p2, []);
      drawPuyo(b.hctx, offX / cell, (offY + cell * 1.1) / cell, cell, b.hold.p1, []);
    } else {
      drawPieceCentered(b.hctx, b.holdCanvas, b.hold, 14);
    }
  }

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
  function evaluateGridPuyo(g) {
    let score = 0;
    const heights = new Array(COLS).fill(0);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (g[r][c]) { heights[c] = ROWS - r; break; }
      }
    }
    const maxH = Math.max(...heights);
    const avgH = heights.reduce((a, b) => a + b, 0) / COLS;
    const centerH = Math.max(heights[3], heights[4], heights[5]);
    score -= centerH * 3.2;
    score -= maxH * 1.6;
    score -= avgH * 0.9;

    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = g[r][c];
        if (type && type !== 'O' && !visited[r][c]) {
          const group = [];
          const queue = [[r, c]];
          visited[r][c] = true;
          while (queue.length > 0) {
            const [cr, cc] = queue.shift();
            group.push([cr, cc]);
            const neighbors = [[cr-1, cc], [cr+1, cc], [cr, cc-1], [cr, cc+1]];
            for (const [nr, nc] of neighbors) {
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (g[nr][nc] === type && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }
          if (group.length === 2) score += 4.0;
          else if (group.length === 3) score += 11.0;
          else if (group.length >= 4) {
            score += 40.0 + (group.length - 4) * 10;
          }
        }
      }
    }
    return score;
  }

  function findBestMovePuyo(piece, snapshot, noise = 0, missChance = 0) {
    const candidates = [];
    const p1 = piece.p1, p2 = piece.p2;
    for (let rot = 0; rot < 4; rot++) {
      let minX = 0, maxX = COLS - 1;
      if (rot === 1) maxX = COLS - 2;
      else if (rot === 3) minX = 1;
      for (let x = minX; x <= maxX; x++) {
        let y = 1;
        if (puyoCollides(x, y, rot, snapshot)) continue;
        while (!puyoCollides(x, y + 1, rot, snapshot)) y++;
        const simGrid = snapshot.map(r => r.slice());
        simGrid[y][x] = p1;
        let p2x = x, p2y = y;
        if (rot === 0) p2y--;
        else if (rot === 1) p2x++;
        else if (rot === 2) p2y++;
        else if (rot === 3) p2x--;
        if (p2y >= 0 && p2y < ROWS && p2x >= 0 && p2x < COLS) simGrid[p2y][p2x] = p2;
        // Gravity sim
        for (let c = 0; c < COLS; c++) {
          for (let r = ROWS - 2; r >= 0; r--) {
            if (simGrid[r][c] && !simGrid[r+1][c]) {
              let targetY = r;
              while (targetY + 1 < ROWS && !simGrid[targetY+1][c]) targetY++;
              simGrid[targetY][c] = simGrid[r][c];
              simGrid[r][c] = null;
            }
          }
        }
        let score = evaluateGridPuyo(simGrid);
        if (noise > 0) score += (Math.random() - 0.5) * 2 * noise;
        candidates.push({ score, x, y, rotation: rot });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    if (missChance > 0 && Math.random() < missChance && candidates.length > 1) {
      const idx = 1 + Math.floor(Math.random() * Math.min(2, candidates.length - 1));
      return candidates[idx];
    }
    return candidates[0];
  }

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
    hoiko:  { speed: 0,   noise: 0,   missChance: 0    },
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
    
    if (settings.cpu.difficulty === 'hoiko' && window.Hoiko) {
      // hoikoSpeed value: 0 to 100
      // 100 = 0ms delay (instant teleport)
      // 0 = 2000ms delay
      // linear mapping: delay = (100 - hoikoSpeed) * 20 ms
      const hoikoSpeed = settings.cpu.hoikoSpeed !== undefined ? settings.cpu.hoikoSpeed : 50;
      const delay = (100 - hoikoSpeed) * 20;
      
      b.cpuActionTimer += dt;
      if (b.cpuActionTimer < delay) return;
      b.cpuActionTimer = 0;
      
      window.Hoiko.step(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS, puyoCollides);
      return;
    }

    const preset = cpuPreset();
    b.cpuActionTimer += dt;
    if (b.cpuActionTimer < preset.speed) return;
    b.cpuActionTimer = 0;
    if (!b.cpuTarget) {
      b.cpuTarget = b.type === 'puyo'
        ? findBestMovePuyo(b.current, b.grid, preset.noise, preset.missChance)
        : findBestMove(b.current, b.grid, preset.noise, preset.missChance);
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
  const hoikoSpeedRange = $('hoikoSpeedRange'), hoikoSpeedVal = $('hoikoSpeedVal'), hoikoSpeedRow = $('hoikoSpeedRow');

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
  // Pinch state — how close the player is to topping out (0..1).
  // Smoothed toward the raw stack-height reading so BGM tempo/layers
  // ramp up and down gradually instead of jumping on every lock.
  let pinchSmoothed = 0;

  function computePinchLevel(b) {
    if (!b || !b.grid) return 0;
    for (let r = 0; r < ROWS; r++) {
      if (b.grid[r].some(cell => cell !== null)) {
        // Top block at row 15 → 0. Row 3 or higher → 1.
        return Math.max(0, Math.min(1, (15 - r) / 12));
      }
    }
    return 0;
  }

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

  // ---------- ONLINE P2P MULTIPLAYER ----------
  let p2pPeer = null;
  let p2pConn = null;
  let p2pIsHost = false;
  let p2pMyReady = false;
  let p2pOpponentReady = false;
  let p2pSendTimer = 0;

  function initOnline() {
    p2pMyReady = false;
    p2pOpponentReady = false;
    if (p2pPeer) { p2pPeer.destroy(); p2pPeer = null; }
    if (p2pConn) { p2pConn.close(); p2pConn = null; }

    const statusEl = $('onlineStatus');
    statusEl.textContent = '接続IDを取得中...';
    statusEl.style.color = '#22e6ff';

    // Initialize PeerJS
    p2pPeer = new Peer();

    p2pPeer.on('open', (id) => {
      p2pIsHost = true;
      $('hostPeerIdDisplay').textContent = id;
      statusEl.textContent = '対戦相手の接続を待っています...';
      initMQTT(id);
      
      const publishCheck = $('publishRoomCheck');
      if (publishCheck && publishCheck.checked) {
        publishMyRoom(id, $('publishRoomNameInput').value);
      }
    });

    p2pPeer.on('error', (err) => {
      console.error(err);
      statusEl.textContent = 'エラーが発生しました: ' + err.type;
      statusEl.style.color = '#ef4444';
      if (p2pPeer) publishMyRoom(p2pPeer.id, '', true);
    });

    // Host connection receiver
    p2pPeer.on('connection', (conn) => {
      p2pIsHost = true;
      setupP2PConnection(conn);
    });
  }

  function setupP2PConnection(conn) {
    p2pConn = conn;
    const statusEl = $('onlineStatus');
    statusEl.textContent = '接続完了！データ同期を開始します...';
    statusEl.style.color = '#4ade80';

    conn.on('open', () => {
      if (p2pPeer) publishMyRoom(p2pPeer.id, '', true);
      setTimeout(() => {
        $('onlineLobby').classList.add('hidden');
        typeSelect.classList.remove('hidden');
        cpuTypeBox.style.display = 'none'; // Guest style choice is selected by themselves
        window.audio.playSE('tetris');
      }, 1000);
    });

    conn.on('data', (data) => {
      handleP2PMessage(data);
    });

    conn.on('close', () => {
      statusEl.textContent = '対戦相手が切断しました。';
      statusEl.style.color = '#ef4444';
      if (appState === 'playing') {
        showOverlay(playerBoard, 'DISCONNECTED', 'Opponent left the match');
        matchEnded = true;
      }
    });
  }

  // Client connection initiator
  $('onlineConnectBtn').addEventListener('click', () => {
    const id = $('joinPeerIdInput').value.trim();
    if (!id) return;
    p2pIsHost = false;
    const statusEl = $('onlineStatus');
    statusEl.textContent = 'ホストに接続中...';
    
    if (p2pPeer) {
      const conn = p2pPeer.connect(id);
      setupP2PConnection(conn);
    }
  });

  $('onlineBackBtn').addEventListener('click', () => {
    if (p2pPeer) {
      publishMyRoom(p2pPeer.id, '', true);
      p2pPeer.destroy(); p2pPeer = null;
    }
    if (p2pConn) { p2pConn.close(); p2pConn = null; }
    $('onlineLobby').classList.add('hidden');
    showModeSelect();
  });

  function handleP2PMessage(data) {
    if (data.type === 'ready') {
      p2pOpponentReady = true;
      cpuBoard.type = data.boardType;
      checkOnlineStart();
    }
    else if (data.type === 'state') {
      cpuBoard.type = data.boardType;
      cpuBoard.grid = data.grid;
      cpuBoard.current = data.current;
      cpuBoard.score = data.score;
      cpuBoard.lines = data.lines;
      cpuBoard.level = data.level;
      cpuBoard.flashing = data.flashing;
      cpuBoard.particles = data.particles;
      cpuBoard.gameOver = data.gameOver;
      cpuBoard.puyoChain = data.puyoChain;

      if (data.gameOver && !playerBoard.gameOver) {
        showOverlay(playerBoard, 'YOU WIN', 'Opponent topped out!', 'win');
        matchEnded = true;
        window.audio.stopBGM();
      }
    }
    else if (data.type === 'garbage') {
      playerBoard.pendingGarbage += data.amount;
      updateWarningQueue(playerBoard);
    }
    else if (data.type === 'rematch') {
      p2pOpponentReady = true;
      spawnPopup(playerBoard, 'OPPONENT WANTS REMATCH', 'popup-mode');
      if (p2pMyReady) {
        p2pMyReady = false; p2pOpponentReady = false;
        reset();
      }
    }
  }

  function sendP2PData() {
    if (mode !== 'online' || !p2pConn || !p2pConn.open) return;
    p2pConn.send({
      type: 'state',
      boardType: playerBoard.type,
      grid: playerBoard.grid,
      current: playerBoard.current,
      score: playerBoard.score,
      lines: playerBoard.lines,
      level: playerBoard.level,
      flashing: playerBoard.flashing,
      particles: playerBoard.particles,
      gameOver: playerBoard.gameOver,
      puyoChain: playerBoard.puyoChain
    });
  }

  function applyActiveSkin() {
    const skin = SKIN_COLORS[activeSkin] || SKIN_COLORS.classic;
    for (const key in COLORS) {
      if (skin[key]) {
        COLORS[key].base = skin[key].base;
        COLORS[key].light = skin[key].light;
        COLORS[key].dark = skin[key].dark;
      }
    }
    for (const key in PUYO_COLORS) {
      const skinKey = key === 'G' ? 'G_puyo' : (key === 'O' ? 'O_puyo' : key);
      if (skin[skinKey]) {
        PUYO_COLORS[key].base = skin[skinKey].base;
        PUYO_COLORS[key].light = skin[skinKey].light;
        PUYO_COLORS[key].dark = skin[skinKey].dark;
      }
    }
    for (const key in blockCache) delete blockCache[key];
  }

  const BG_COLORS = {
    default: 'radial-gradient(circle at 50% 50%, #f8fafc 0%, #e2e8f0 100%)',
    sky: 'linear-gradient(180deg, #bae6fd 0%, #38bdf8 100%)',
    pink: 'linear-gradient(180deg, #fbcfe8 0%, #f472b6 100%)',
    mint: 'linear-gradient(180deg, #a7f3d0 0%, #34d399 100%)',
    lavender: 'linear-gradient(180deg, #e0e7ff 0%, #a5b4fc 100%)',
    sunset: 'linear-gradient(180deg, #ffedd5 0%, #fdba74 100%)',
    night: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    snow: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
    golddust: 'linear-gradient(180deg, #fef3c7 0%, #fcd34d 100%)',
    forest: 'linear-gradient(180deg, #d1fae5 0%, #10b981 100%)',
    ghoul: 'url("C:/Users/syunp/.gemini/antigravity-ide/brain/7f6613b8-6a49-4623-8ad3-53cb27b69c2d/media__1783231180078.png")',
    kaiju: 'url("C:/Users/syunp/.gemini/antigravity-ide/brain/7f6613b8-6a49-4623-8ad3-53cb27b69c2d/media__1783231237554.jpg")'
  };
  function applyActiveBg() {
    const bgStyle = BG_COLORS[activeBg] || BG_COLORS.default;
    const stage = document.querySelector('.stage');
    if (stage) {
      stage.style.background = bgStyle;
      if (activeBg === 'ghoul' || activeBg === 'kaiju') {
        stage.style.backgroundSize = 'cover';
        stage.style.backgroundPosition = 'center';
      } else {
        stage.style.backgroundSize = '';
        stage.style.backgroundPosition = '';
      }
    }
  }

  function playGachaAnimation(itemType, itemKey, isNew) {
    const overlay = $('gachaOverlay');
    const capsule = $('gachaCapsule');
    const card = $('gachaResultCard');
    const rings = $('gachaRings');
    const glowBack = $('gachaGlowBack');
    const particlesContainer = $('gachaParticles');
    const secretAlert = $('gachaSecretAlert');
    const isSecret = (itemKey === 'ghoul' || itemKey === 'kaiju');

    // Reset everything
    overlay.classList.remove('hidden');
    card.classList.add('hidden');
    card.classList.remove('gacha-card-secret');
    secretAlert.classList.add('hidden');
    secretAlert.style.opacity = '0';
    capsule.style.display = 'block';
    capsule.textContent = itemType === 'skin' ? '🎁' : '🖼️';
    rings.style.transform = 'scale(0.6) rotate(0deg)';
    rings.style.opacity = '0';
    glowBack.style.transform = 'scale(0.5) rotate(0deg)';
    glowBack.style.opacity = '0';
    particlesContainer.innerHTML = '';
    overlay.style.background = 'rgba(15,23,42,0.95)';

    window.audio.playSE('hold');
    const tl = gsap.timeline();

    // ── Phase 1: Magic circle + shake (shared) ──
    tl.to(rings, { duration: 0.8, scale: 1.1, opacity: 0.8, ease: "back.out(1.2)" }, 0)
      .to(rings, { duration: 3, rotation: 360, ease: "none", repeat: -1 }, 0);
    tl.to(capsule, { duration: 0.1, x: -8, yoyo: true, repeat: 5 }, 0.2)
      .to(capsule, { duration: 0.08, x: 15, scale: 1.1, yoyo: true, repeat: 8, onStart: () => {
        window.audio.playSE('rotate');
      }}, 0.7)
      .to(capsule, { duration: 0.05, x: -25, y: -20, scale: 1.25, yoyo: true, repeat: 12, onStart: () => {
        window.audio.playSE('combo');
        if (settings.display.flash) triggerFlash('impact');
      }}, 1.4);

    if (isSecret) {
      // ══════════════════════════════════════════
      //  SECRET CONFIRMED — LEGENDARY SEQUENCE
      // ══════════════════════════════════════════

      // Phase 2S: Sudden freeze — capsule stops, everything goes pitch black
      tl.to(capsule, { duration: 0.15, scale: 1.0, x: 0, y: 0, ease: "power4.out" }, 2.1)
        .to(rings, { duration: 0.3, opacity: 0, scale: 0.3, ease: "power2.in" }, 2.1)
        .to(overlay, { duration: 0.5, background: 'rgba(0,0,0,1)', ease: "power2.in" }, 2.1);

      // Phase 3S: WARNING flash — screen goes blood red, text slams in
      tl.add(() => {
        secretAlert.classList.remove('hidden');
        window.audio.playSE('danger');
      }, 2.8);
      tl.to(secretAlert, { duration: 0.08, opacity: 1, ease: "none" }, 2.8)
        .to(secretAlert, { duration: 0.1, opacity: 0, ease: "none" }, 2.95)
        .to(secretAlert, { duration: 0.08, opacity: 1, ease: "none" }, 3.1)
        .to(secretAlert, { duration: 0.1, opacity: 0, ease: "none" }, 3.25)
        .to(secretAlert, { duration: 0.15, opacity: 1, ease: "none" }, 3.4);

      // Phase 4S: Screen flashes white then shifts to deep crimson aura
      tl.to(overlay, { duration: 0.06, background: 'rgba(255,255,255,0.9)', ease: "none" }, 3.7)
        .to(overlay, { duration: 0.5, background: 'radial-gradient(circle, rgba(127,29,29,0.98) 0%, rgba(0,0,0,0.99) 70%)', ease: "power2.out", onStart: () => {
          window.audio.playSE('allClear');
          secretAlert.classList.add('hidden');
          secretAlert.style.opacity = '0';
        }}, 3.8);

      // Phase 5S: Capsule transforms to golden and vibrates violently
      tl.to(capsule, { duration: 0.01, onComplete: () => {
        capsule.textContent = '🌟';
        capsule.style.filter = 'drop-shadow(0 0 30px rgba(251,191,36,0.9))';
      }}, 3.9);
      tl.fromTo(capsule, { scale: 0.1, opacity: 0 }, { duration: 0.4, scale: 1.4, opacity: 1, ease: "elastic.out(1.2, 0.4)" }, 3.9)
        .to(capsule, { duration: 0.04, x: -20, yoyo: true, repeat: 30, ease: "none", onStart: () => {
          window.audio.playSE('combo');
        }}, 4.4);

      // Phase 6S: Triple explosion waves
      tl.add(() => {
        capsule.style.display = 'none';
        capsule.style.opacity = 1;
        capsule.style.transform = '';
        capsule.style.filter = '';

        // Wave 1 — golden sparks
        spawnExplosion(particlesContainer, ['#fbbf24', '#f59e0b', '#fcd34d', '#fff'], 30, 200);
        window.audio.playSE('levelUp');
      }, 5.8);
      tl.add(() => {
        // Wave 2 — crimson + white
        spawnExplosion(particlesContainer, ['#ef4444', '#dc2626', '#ffffff', '#fca5a5'], 35, 300);
        window.audio.playSE('tetris');
        if (settings.display.flash) triggerFlash('impact');
      }, 6.2);
      tl.add(() => {
        // Wave 3 — rainbow
        spawnExplosion(particlesContainer, ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#fff'], 50, 400);
        window.audio.playSE('allClear');
      }, 6.6);

      // Phase 7S: Crimson glow aura behind card
      tl.fromTo(glowBack,
        { scale: 0.2, opacity: 0, rotation: 0 },
        { duration: 1.5, scale: 2.0, opacity: 1, rotation: 180, ease: "power2.out",
          onStart: () => {
            glowBack.style.background = 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, rgba(251,191,36,0.15) 40%, rgba(0,0,0,0) 70%)';
          }
        }, 6.8);
      tl.to(glowBack, { duration: 8, rotation: 720, repeat: -1, ease: "none" }, 6.8);

      // Phase 8S: Persistent golden particle rain
      tl.add(() => {
        startSecretParticleRain(particlesContainer);
      }, 7.0);

      // Phase 9S: Card reveal — dramatic slow rotation with rainbow border
      tl.add(() => {
        fillResultCard(itemType, itemKey, isNew, true);
        card.classList.remove('hidden');
        card.classList.add('gacha-card-secret');
      }, 7.3);
      tl.fromTo(card,
        { scale: 0.2, opacity: 0, rotationY: -360, y: 150 },
        { duration: 1.2, scale: 1, opacity: 1, rotationY: 0, y: 0, ease: "back.out(1.2)" }, 7.3);

    } else {
      // ══════════════════════════════════════════
      //  NORMAL GACHA — Standard sequence
      // ══════════════════════════════════════════
      tl.to(capsule, { duration: 0.2, scale: 2.2, opacity: 0, ease: "power3.in", onComplete: () => {
        capsule.style.display = 'none';
        capsule.style.opacity = 1;
        capsule.style.transform = '';

        window.audio.playSE('levelUp');

        gsap.fromTo(glowBack,
          { scale: 0.2, opacity: 0, rotation: 0 },
          { duration: 1.2, scale: 1.6, opacity: 1, rotation: 180, ease: "power2.out" }
        );
        gsap.to(glowBack, { duration: 6, rotation: 360, repeat: -1, ease: "none" });

        spawnExplosion(particlesContainer, ['#ff0055', '#00aaff', '#aaff00', '#ffaa00', '#aa00ff', '#ffffff'], 40, 250);

        fillResultCard(itemType, itemKey, isNew, false);
        card.classList.remove('hidden');
        gsap.fromTo(card,
          { scale: 0.4, opacity: 0, rotationY: -180, y: 100 },
          { duration: 0.8, scale: 1, opacity: 1, rotationY: 0, y: 0, ease: "back.out(1.4)" }
        );
        window.audio.playSE('tetris');
      }}, 2.3);
    }
  }

  // ── Helper: fill the result card content ──
  function fillResultCard(itemType, itemKey, isNew, isSecret) {
    const item = itemType === 'skin' ? SKINS[itemKey] : BACKGROUNDS[itemKey];
    const rarity = $('gachaItemRarity');

    if (isSecret) {
      rarity.textContent = '★ LEGENDARY SECRET ★';
      rarity.style.color = '#ef4444';
      rarity.style.textShadow = '0 0 12px rgba(239,68,68,0.8), 0 0 30px rgba(239,68,68,0.4)';
    } else {
      rarity.textContent = isNew ? 'NEW ITEM GET!' : 'DUPLICATE! (+50🪙)';
      rarity.style.color = isNew ? '#0ea5e9' : '#db2777';
      rarity.style.textShadow = '';
    }

    $('gachaItemName').textContent = item.name;
    $('gachaItemDesc').textContent = item.desc;

    const preview = $('gachaItemPreview');
    preview.innerHTML = '';
    if (itemType === 'skin') {
      const col = SKIN_COLORS[itemKey] || SKIN_COLORS.classic;
      const block = document.createElement('div');
      block.style.cssText = `width:38px;height:38px;background:${col.I.base};border:3.5px solid ${col.I.light};border-radius:8px;box-shadow:inset 0 0 6px ${col.I.dark}, 0 4px 12px ${col.I.base};`;
      preview.appendChild(block);
    } else {
      const bg = BG_COLORS[itemKey] || BG_COLORS.default;
      const bgBox = document.createElement('div');
      bgBox.style.cssText = `width:120px;height:56px;background:${bg};border-radius:10px;border:2px solid var(--border-color);`;
      if (itemKey === 'ghoul' || itemKey === 'kaiju') {
        bgBox.style.backgroundSize = 'cover';
        bgBox.style.backgroundPosition = 'center';
      }
      preview.appendChild(bgBox);
    }
  }

  // ── Helper: spawn radial explosion particles ──
  function spawnExplosion(container, colors, count, maxRadius) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 12 + 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};left:50%;top:50%;transform:translate(-50%,-50%);box-shadow:0 0 ${size}px ${color};pointer-events:none;`;
      container.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * maxRadius + 80;
      gsap.to(p, {
        duration: Math.random() * 1.0 + 0.5,
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        scale: 0.05,
        opacity: 0,
        ease: "power2.out",
        onComplete: () => p.remove()
      });
    }
  }

  // ── Helper: persistent golden particle rain for secret ──
  let _secretRainInterval = null;
  function startSecretParticleRain(container) {
    stopSecretParticleRain();
    const rainColors = ['#fbbf24', '#f59e0b', '#fcd34d', '#ef4444', '#ffffff'];
    _secretRainInterval = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 6 + 3;
        const color = rainColors[Math.floor(Math.random() * rainColors.length)];
        const startX = Math.random() * 100;
        p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};left:${startX}%;top:-5%;opacity:0.8;box-shadow:0 0 8px ${color};pointer-events:none;`;
        container.appendChild(p);
        gsap.to(p, {
          duration: Math.random() * 2 + 1.5,
          y: window.innerHeight + 50,
          x: (Math.random() - 0.5) * 100,
          opacity: 0,
          ease: "none",
          onComplete: () => p.remove()
        });
      }
    }, 120);
  }
  function stopSecretParticleRain() {
    if (_secretRainInterval) { clearInterval(_secretRainInterval); _secretRainInterval = null; }
  }

  function pullGacha(type) {
    if (userCoins < 100) {
      window.audio.playSE('move');
      return;
    }
    userCoins -= 100;
    localStorage.setItem('puyotetris_coins', userCoins);
    
    let pulled = '';
    const owned = type === 'skin' ? ownedSkins : ownedBgs;

    if (type === 'skin') {
      const pool = Object.keys(SKINS);
      pulled = pool[Math.floor(Math.random() * pool.length)];
    } else {
      // 0.1% (0.001) chance for Secret backgrounds, otherwise pull normal backgrounds
      const isSecret = Math.random() < 0.001;
      if (isSecret) {
        const secrets = ['ghoul', 'kaiju'];
        pulled = secrets[Math.floor(Math.random() * secrets.length)];
      } else {
        const normalBgs = ['default', 'sky', 'pink', 'mint', 'lavender', 'sunset', 'night', 'snow', 'golddust', 'forest'];
        pulled = normalBgs[Math.floor(Math.random() * normalBgs.length)];
      }
    }
    
    const isNew = !owned.includes(pulled);
    
    if (isNew) {
      owned.push(pulled);
      if (type === 'skin') localStorage.setItem('puyotetris_owned_skins', JSON.stringify(owned));
      else localStorage.setItem('puyotetris_owned_bgs', JSON.stringify(owned));
    } else {
      userCoins += 50;
      localStorage.setItem('puyotetris_coins', userCoins);
    }
    
    playGachaAnimation(type, pulled, isNew);
  }

  $('pullSkinGachaBtn').addEventListener('click', () => pullGacha('skin'));
  $('pullBgGachaBtn').addEventListener('click', () => pullGacha('bg'));
  $('gachaOkBtn').addEventListener('click', () => {
    stopSecretParticleRain();
    gsap.killTweensOf([$('gachaRings'), $('gachaGlowBack'), $('gachaCapsule'), $('gachaResultCard')]);
    $('gachaResultCard').classList.remove('gacha-card-secret');
    $('gachaParticles').innerHTML = '';
    $('gachaOverlay').style.background = 'rgba(15,23,42,0.95)';
    $('gachaOverlay').classList.add('hidden');
    updateShopUI();
    updateCustomizeDropdowns();
  });

  function updateShopUI() {
    $('shopCoinsDisplay').textContent = userCoins;
    $('ownedSkinsCount').textContent = ownedSkins.length;
    $('ownedBgsCount').textContent = ownedBgs.length;
  }

  function updateCustomizeDropdowns() {
    const skinSelect = $('skinSelect');
    const bgSelect = $('bgSelect');
    if (!skinSelect || !bgSelect) return;
    
    skinSelect.innerHTML = '';
    ownedSkins.forEach(key => {
      if (!SKINS[key]) return;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = SKINS[key].name;
      opt.selected = activeSkin === key;
      skinSelect.appendChild(opt);
    });

    bgSelect.innerHTML = '';
    ownedBgs.forEach(key => {
      if (!BACKGROUNDS[key]) return;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = BACKGROUNDS[key].name;
      opt.selected = activeBg === key;
      bgSelect.appendChild(opt);
    });
  }

  $('skinSelect').addEventListener('change', (e) => {
    activeSkin = e.target.value;
    localStorage.setItem('puyotetris_active_skin', activeSkin);
    applyActiveSkin();
  });

  $('bgSelect').addEventListener('change', (e) => {
    activeBg = e.target.value;
    localStorage.setItem('puyotetris_active_bg', activeBg);
    applyActiveBg();
  });

  // ---------- MQTT MULTIPLAYER NETWORK ----------
  let mqttClient = null;
  let publicRooms = [];
  let friends = JSON.parse(localStorage.getItem('puyotetris_friends') || '[]');
  let friendsOnline = {};

  function initMQTT(peerId) {
    if (mqttClient) { mqttClient.end(); mqttClient = null; }

    mqttClient = mqtt.connect('wss://broker.hivemq.com:8000/mqtt');

    mqttClient.on('connect', () => {
      mqttClient.subscribe('puyotetris/rooms/public');
      mqttClient.subscribe(`puyotetris/friend/${peerId}`);
      
      // Broardcast online presence to friends
      friends.forEach(fId => {
        mqttClient.publish(`puyotetris/friend/${fId}`, JSON.stringify({ type: 'online', from: peerId }));
      });

      refreshPublicRooms();
      refreshFriendsList();
    });

    mqttClient.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === 'puyotetris/rooms/public') {
          if (data.action === 'add') {
            if (!publicRooms.some(r => r.id === data.id)) publicRooms.push(data);
          } else if (data.action === 'remove') {
            publicRooms = publicRooms.filter(r => r.id !== data.id);
          }
          refreshPublicRooms();
        } else if (topic === `puyotetris/friend/${peerId}`) {
          if (data.type === 'online') {
            friendsOnline[data.from] = true;
            refreshFriendsList();
            // Send back online acknowledgement
            mqttClient.publish(`puyotetris/friend/${data.from}`, JSON.stringify({ type: 'online_ack', from: peerId }));
          } else if (data.type === 'online_ack') {
            friendsOnline[data.from] = true;
            refreshFriendsList();
          } else if (data.type === 'invite') {
            spawnPopup(playerBoard, 'FRIEND INVITE RECEIVED', 'popup-mode');
            $('onlineStatus').textContent = `フレンド [${data.from}] から対戦申請が届きました。`;
            $('joinPeerIdInput').value = data.from;
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  function publishMyRoom(peerId, name, remove = false) {
    if (!mqttClient || !mqttClient.connected) return;
    mqttClient.publish('puyotetris/rooms/public', JSON.stringify({
      action: remove ? 'remove' : 'add',
      id: peerId,
      name: name || 'NO NAME'
    }));
  }

  function refreshPublicRooms() {
    const list = $('publicRoomsList');
    if (!list) return;
    list.innerHTML = '';
    if (publicRooms.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: #aaa; padding: 20px 0;">公開ルームが見つかりません。</div>';
      return;
    }
    publicRooms.forEach(room => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '8px 12px';
      div.style.background = 'rgba(255,255,255,0.06)';
      div.style.borderRadius = '8px';
      div.style.border = '1px solid rgba(255,255,255,0.08)';
      
      div.innerHTML = `
        <span style="font-weight:bold; color:#fff;">${room.name}</span>
        <button class="type-start-btn" style="margin:0; padding:6px 12px; font-size:0.8rem; border-radius:6px;" onclick="connectToRoom('${room.id}')">JOIN</button>
      `;
      list.appendChild(div);
    });
  }
  window.connectToRoom = (id) => {
    $('joinPeerIdInput').value = id;
    $('onlineConnectBtn').click();
  };

  function refreshFriendsList() {
    const list = $('friendsList');
    if (!list) return;
    list.innerHTML = '';
    if (friends.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: #aaa; padding: 15px 0;">フレンドが登録されていません。</div>';
      return;
    }
    friends.forEach(fId => {
      const isOnline = !!friendsOnline[fId];
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '8px 12px';
      div.style.background = 'rgba(255,255,255,0.06)';
      div.style.borderRadius = '8px';
      
      div.innerHTML = `
        <span style="font-weight:bold; color:${isOnline ? '#22e6ff' : '#888'};">${fId.slice(0,8)}... (${isOnline ? 'ONLINE' : 'OFFLINE'})</span>
        <div>
          ${isOnline ? `<button class="type-start-btn" style="margin:0; padding:4px 8px; font-size:0.75rem; border-radius:6px; background:#0ea5e9;" onclick="inviteFriend('${fId}')">対戦申請</button>` : ''}
          <button class="type-start-btn" style="margin:0; padding:4px 8px; font-size:0.75rem; border-radius:6px; background:#ef4444;" onclick="removeFriend('${fId}')">削除</button>
        </div>
      `;
      list.appendChild(div);
    });
  }
  window.inviteFriend = (fId) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(`puyotetris/friend/${fId}`, JSON.stringify({ type: 'invite', from: myPeerId }));
      $('onlineStatus').textContent = `フレンド [${fId.slice(0,8)}] に対戦申請を送信しました。`;
    }
  };
  window.removeFriend = (fId) => {
    friends = friends.filter(id => id !== fId);
    localStorage.setItem('puyotetris_friends', JSON.stringify(friends));
    refreshFriendsList();
  };

  $('addFriendBtn').addEventListener('click', () => {
    const id = $('friendIdInput').value.trim();
    if (id && id !== myPeerId && !friends.includes(id)) {
      friends.push(id);
      localStorage.setItem('puyotetris_friends', JSON.stringify(friends));
      $('friendIdInput').value = '';
      refreshFriendsList();
      if (mqttClient && mqttClient.connected) {
        mqttClient.publish(`puyotetris/friend/${id}`, JSON.stringify({ type: 'online', from: myPeerId }));
      }
    }
  });

  // Lobby Tabs handler
  document.querySelectorAll('.lobby-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lobby-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.color = '#aaa';
      });
      btn.classList.add('active');
      btn.style.color = '#fff';
      
      document.querySelectorAll('.lobby-tab-content').forEach(c => c.classList.add('hidden'));
      $(`${btn.dataset.tab}TabContent`).classList.remove('hidden');
    });
  });

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
  // ---------- TYPE & CHARACTER SELECT ----------
  const typeSelect = $('typeSelect');
  const playerTypeButtons = document.querySelectorAll('#playerTypeOptions .type-opt-btn');
  const cpuTypeButtons = document.querySelectorAll('#cpuTypeOptions .type-opt-btn');
  const cpuTypeBox = $('cpuTypeBox');

  playerTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playerTypeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.audio.playSE('move');
    });
  });

  cpuTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      cpuTypeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.audio.playSE('move');
    });
  });

  $('typeStartBtn').addEventListener('click', () => {
    window.audio.playSE('tetris');
    
    const pActive = document.querySelector('#playerTypeOptions .type-opt-btn.active');
    playerBoard.type = pActive ? pActive.dataset.type : 'tetris';

    if (mode === 'online') {
      p2pMyReady = true;
      if (p2pConn && p2pConn.open) {
        p2pConn.send({ type: 'ready', boardType: playerBoard.type });
      }
      typeSelect.classList.add('hidden');
      spawnPopup(playerBoard, 'WAITING FOR OPPONENT', 'popup-mode');
      checkOnlineStart();
    } else {
      typeSelect.classList.add('hidden');
      appState = 'playing';
      const cActive = document.querySelector('#cpuTypeOptions .type-opt-btn.active');
      cpuBoard.type = cActive ? cActive.dataset.type : 'puyo';

      document.body.classList.remove('mode-marathon', 'mode-cpu', 'mode-infinity', 'mode-online');
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
    }
  });

  function checkOnlineStart() {
    if (p2pMyReady && p2pOpponentReady) {
      appState = 'playing';
      document.body.classList.remove('mode-marathon', 'mode-cpu', 'mode-infinity', 'mode-online');
      document.body.classList.add(`mode-online`);
      
      cpuFrame.classList.remove('hidden'); // Opponent board visible
      activeBoards = [playerBoard, cpuBoard];
      cpuBoard.isCPU = false; // Disable AI for player two
      
      gameFrame.classList.remove('hidden');
      gameFrame.style.animation = 'none'; void gameFrame.offsetWidth; gameFrame.style.animation = '';
      reset();
      if (settings.audio.bgm) { window.audio.startBGM(); bgmStartedOnce = true; }
      updateModeBadge();
      spawnPopup(playerBoard, 'FIGHT!', 'popup-mode');
    }
  }

  $('typeBackBtn').addEventListener('click', () => {
    typeSelect.classList.add('hidden');
    if (mode === 'online') {
      if (p2pPeer) { p2pPeer.destroy(); p2pPeer = null; }
      if (p2pConn) { p2pConn.close(); p2pConn = null; }
    }
    showModeSelect();
  });

  $('shopBackBtn').addEventListener('click', () => {
    $('shopPanel').classList.add('hidden');
    showModeSelect();
  });

  function chooseMode(m, cardEl) {
    if (!m || appState !== 'menu') return;
    window.audio.playSE('tetris');
    if (cardEl) cardEl.classList.add('selecting');
    modeCards.forEach(c => { if (c !== cardEl) c.classList.add('dismissing'); });
    setTimeout(() => {
      mode = m;
      modeSelect.classList.add('hidden');
      modeBgCanvas.classList.remove('visible');
      if (mode === 'online') {
        $('onlineLobby').classList.remove('hidden');
        initOnline();
      } else if (mode === 'shop') {
        $('shopPanel').classList.remove('hidden');
        updateShopUI();
      } else {
        typeSelect.classList.remove('hidden');
        if (mode === 'cpu') {
          cpuTypeBox.style.display = 'block';
        } else {
          cpuTypeBox.style.display = 'none';
        }
      }
    }, 550);
  }
  function showModeSelect() {
    appState = 'menu'; mode = null;
    document.body.classList.remove('mode-marathon', 'mode-cpu', 'mode-infinity', 'mode-online');
    window.audio.stopBGM();
    gameFrame.classList.add('hidden'); cpuFrame.classList.add('hidden');
    typeSelect.classList.add('hidden');
    $('onlineLobby').classList.add('hidden');
    $('shopPanel').classList.add('hidden');
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
    
    // Sync hoikoSpeed
    const hSpeed = settings.cpu.hoikoSpeed !== undefined ? settings.cpu.hoikoSpeed : 50;
    if (hoikoSpeedRange) hoikoSpeedRange.value = hSpeed;
    if (hoikoSpeedVal) hoikoSpeedVal.textContent = hSpeed;
    
    // Sync difficulty preset buttons
    if (diffButtons) {
      const cur = settings.cpu.difficulty || 'normal';
      diffButtons.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === cur);
      });
      if (hoikoSpeedRow) {
        hoikoSpeedRow.style.display = cur === 'hoiko' ? 'flex' : 'none';
      }
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
  
  if (hoikoSpeedRange) {
    hoikoSpeedRange.addEventListener('input', () => {
      settings.cpu.hoikoSpeed = +hoikoSpeedRange.value;
      if (hoikoSpeedVal) hoikoSpeedVal.textContent = settings.cpu.hoikoSpeed;
      saveSettings();
    });
  }
  
  if (diffButtons) {
    diffButtons.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.cpu.difficulty = btn.dataset.diff;
        diffButtons.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (hoikoSpeedRow) {
          hoikoSpeedRow.style.display = btn.dataset.diff === 'hoiko' ? 'flex' : 'none';
        }
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
    if (b.puyoBounce) b.puyoBounce.clear();
    b.current = null;
    b.pendingGarbage = 0;
    updateWarningQueue(b);
    b.puyoChain = 0;
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
    hitStopUntil = 0;
    pinchSmoothed = 0;
    if (window.audio && window.audio.setPinchIntensity) window.audio.setPinchIntensity(0);
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
        // Feed pinch level to the audio engine. Slow lerp (~0.04) so the BGM
        // swells over roughly a second — no jarring jumps on every lock.
        if (!paused && !matchEnded) {
          const target = (playerBoard.gameOver || !playerBoard.grid) ? 0 : computePinchLevel(playerBoard);
          pinchSmoothed += (target - pinchSmoothed) * 0.04;
          if (window.audio && window.audio.setPinchIntensity) window.audio.setPinchIntensity(pinchSmoothed);
        }
      }
    } catch (e) {
      // Don't let a single-frame error freeze the whole loop
      console.error('loop error:', e);
    }
    requestAnimationFrame(loop);
  }

  applyDisplaySettings();
  applyAudioSettings();
  applyActiveSkin();
  applyActiveBg();
  updateCustomizeDropdowns();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();

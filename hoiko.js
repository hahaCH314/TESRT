// AI Hoiko Mode Logic for Tetris & Puyo Puyo
(() => {
  const Hoiko = {
    difficultyName: 'hoiko',
    
    // ほいこ専用の超鬼畜評価関数 (テトリス)
    // S4W(サイド4ワイド)、T-Spin用の溝作り、PC(パフェ)を高度にシミュレートし無駄な1ライン消去を避ける
    evaluateGrid: function(g) {
      const COLS = 10;
      const ROWS = 20;
      const heights = new Array(COLS).fill(0);
      let holes = 0;
      
      // S4Wの再現: 右端4列(col 6-9)は意図的に低く保ち、左側6列(col 0-5)で高く積んでREN用のタワーを作る
      for (let c = 0; c < COLS; c++) {
        let firstBlock = -1;
        for (let r = 0; r < ROWS; r++) {
          if (g[r][c]) {
            if (firstBlock === -1) {
              firstBlock = r;
              heights[c] = ROWS - r;
            }
          } else if (firstBlock !== -1) {
            holes++;
          }
        }
      }

      const leftH = heights.slice(0, 6);
      const rightH = heights.slice(6, 10);
      const maxLeftH = Math.max(...leftH);
      const maxRightH = Math.max(...rightH);
      
      let score = 0;
      
      // 1. S4W インセンティブ: 左側のタワーと右側の空きスペースのギャップ
      // 右側は平らで低く（高さ2以下が望ましい）、左側は高く積んでRENの準備
      const s4wGap = maxLeftH - maxRightH;
      if (s4wGap >= 3 && maxRightH <= 4) {
        score += 15.0; // S4Wの形ができている時の大きな加点
      }
      
      // 2. T-Spin用の溝(幅1、深さ2以上、かつ屋根がある等)の評価
      for (let c = 1; c < 9; c++) {
        if (heights[c-1] - heights[c] >= 2 && heights[c+1] - heights[c] >= 2) {
          score += 8.0; // T-Spin用の溝への加点
        }
      }

      // 3. 穴(Holes)に対する極めて厳しいペナルティ (ほいこは絶対に無駄な穴を作らない)
      score -= holes * 15.0;

      // 4. 高さ平準化ペナルティ (凹凸を避ける、ただしS4W用の左側と右側の境界は除く)
      let bump = 0;
      for (let i = 0; i < 5; i++) bump += Math.abs(heights[i] - heights[i+1]);
      for (let i = 6; i < 9; i++) bump += Math.abs(heights[i] - heights[i+1]);
      score -= bump * 0.5;

      // 5. 高さペナルティ (高すぎるとマイナス)
      const totalH = heights.reduce((a, b) => a + b, 0);
      score -= totalH * 0.20;
      
      // 6. ライン消去評価 (ほいこは無駄なシングルを消さない。RENかT-SpinかTetrisでのみ消す)
      let complete = 0;
      for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
      
      if (complete > 0) {
        if (complete === 4) score += 45.0; // テトリス(4列消し)大歓迎
        else if (complete >= 2) score += 15.0; // T-Spin Double等をシミュレート
        else score -= 12.0; // 無駄な1ライン消去(シングル)は減点して温存させる (相殺外し・REN維持のため)
      }

      return score;
    },

    // ほいこ専用の超鬼畜評価関数 (ぷよぷよ)
    // 徹底的に多段連鎖(GTR等の折り返しなど)のタネを作るように配置する
    evaluateGridPuyo: function(g) {
      const COLS = 10;
      const ROWS = 20;
      let score = 0;
      const heights = new Array(COLS).fill(0);
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (g[r][c]) { heights[c] = ROWS - r; break; }
        }
      }
      
      const maxH = Math.max(...heights);
      const centerH = Math.max(heights[3], heights[4], heights[5]);
      score -= centerH * 5.0; // 窒息防止(中央列を絶対高くしない)
      score -= maxH * 1.8;

      // 連鎖数・同色連結の評価
      const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      let groupsCount = 0;
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
            groupsCount++;
            // 連鎖準備(3連結のぷよをたくさん作らせる。4連結で即消しするより、3連結を隣接させて大連鎖を狙う)
            if (group.length === 3) score += 30.0; 
            else if (group.length === 2) score += 10.0;
            else if (group.length >= 4) {
              // 4連結以上。大加点するが、連鎖のために少し調整
              score += 20.0 + (group.length - 4) * 8;
            }
          }
        }
      }
      
      score -= groupsCount * 1.5;

      return score;
    },

    // ほいこ専用の最善手検索 (テトリス)
    findBestMove: function(piece, snapshot, ROTATIONS) {
      const COLS = 10;
      const ROWS = 20;
      const candidates = [];
      const shapes = ROTATIONS[piece.type];

      // game.js の mergePiece / collides をエミュレート/利用
      const checkCollide = (p, grid) => {
        for (let r = 0; r < p.matrix.length; r++) {
          for (let c = 0; c < p.matrix[r].length; c++) {
            if (p.matrix[r][c]) {
              const ny = p.y + r, nx = p.x + c;
              if (ny >= ROWS || nx < 0 || nx >= COLS) return true;
              if (ny >= 0 && grid[ny][nx]) return true;
            }
          }
        }
        return false;
      };

      const doMerge = (p, grid) => {
        p.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (v) {
            const ny = p.y + r, nx = p.x + c;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) grid[ny][nx] = p.type;
          }
        }));
      };

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
          if (checkCollide({ ...testPiece }, snapshot)) continue;
          while (!checkCollide({ ...testPiece, y: y + 1 }, snapshot)) { y++; if (y >= ROWS) break; }
          if (y < 0) continue;
          testPiece.y = y;
          const simGrid = snapshot.map(r => r.slice());
          doMerge(testPiece, simGrid);
          let s = this.evaluateGrid(simGrid);
          candidates.push({ score: s, x, y, rotation: rot, matrix });
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0];
    },

    // ほいこ専用の最善手検索 (ぷよぷよ)
    findBestMovePuyo: function(piece, snapshot, puyoCollides) {
      const COLS = 10;
      const ROWS = 20;
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
          let score = this.evaluateGridPuyo(simGrid);
          candidates.push({ score, x, y, rotation: rot });
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0];
    },
    
    // Executes Hoiko's instant teleportation & immediate hard drop
    step: function(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS, puyoCollides) {
      if (!b.current || b.gameOver || paused || b.flashing) return;

      // 1. Calculate the best move instantly with zero noise and zero delay
      if (!b.cpuTarget) {
        // Trigger Hoiko custom chat popup/cut-in occasionally to show off!
        if (Math.random() < 0.05 && window.triggerCutIn) {
          const lines = [
            "ホイコーローのお時間です！",
            "S4W構築完了、相殺外します！",
            "パフェ積みモード起動...",
            "TDアタック、行きます！"
          ];
          window.triggerCutIn(lines[Math.floor(Math.random() * lines.length)]);
        }

        b.cpuTarget = b.type === 'puyo'
          ? this.findBestMovePuyo(b.current, b.grid, puyoCollides)
          : this.findBestMove(b.current, b.grid, ROTATIONS);

        if (!b.cpuTarget) {
          hardDrop(b);
          return;
        }
      }

      // 2. Teleport to target position & rotation in the same frame
      b.current.rotation = b.cpuTarget.rotation;
      if (b.type === 'puyo') {
        // Puyo doesn't need shape matrix updates, just coordinates
      } else {
        b.current.matrix = ROTATIONS[b.current.type][b.cpuTarget.rotation];
      }
      b.current.x = b.cpuTarget.x;
      b.current.y = b.cpuTarget.y;

      // 3. Drop instantly
      hardDrop(b);
      b.cpuTarget = null;
    }
  };

  window.Hoiko = Hoiko;
})();

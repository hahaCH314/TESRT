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
      let totalBlocks = 0;
      
      for (let c = 0; c < COLS; c++) {
        let firstBlock = -1;
        for (let r = 0; r < ROWS; r++) {
          if (g[r][c]) {
            totalBlocks++;
            if (firstBlock === -1) {
              firstBlock = r;
              heights[c] = ROWS - r;
            }
          } else if (firstBlock !== -1) {
            holes++;
          }
        }
      }

      const maxH = Math.max(...heights);
      const minH = Math.min(...heights);
      const avgH = heights.reduce((a, b) => a + b, 0) / COLS;
      
      let bumpiness = 0;
      for (let i = 0; i < COLS - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i+1]);
      }

      let score = 0;

      // 1. STATE DETERMINATION (状況分析)
      const isPinch = (maxH >= 11); // ピンチ判定
      const isFlat = (bumpiness <= 3 && maxH <= 5); // 真っ平ら判定
      const isJagged = (bumpiness >= 6); // デコボコ判定

      // 2. STATE-BASED STRATEGY (状況ごとの戦略重み付け - 最強チューニング)
      if (isPinch) {
        // 【超攻撃・緊急回避防御】
        const leftH = heights.slice(0, 6);
        const rightH = heights.slice(6, 10);
        const maxLeftH = Math.max(...leftH);
        const maxRightH = Math.max(...rightH);
        const s4wGap = maxLeftH - maxRightH;
        
        if (s4wGap >= 3 && maxRightH <= 4) {
          score += 150.0; // ピンチ時ほどRENで瞬殺を狙う
        }
        
        score -= holes * 600.0; // 穴埋め最優先
        score -= maxH * 50.0;   // 全力で盤面を下げる
        
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          score += complete * 150.0; // 消せるだけ消してカウンター
        }
      } 
      else if (isFlat) {
        // 【超精密パフェ狙い】
        if (totalBlocks === 0) {
          score += 5000.0; // パフェ達成時は神レベルの超加点
        }
        
        score -= holes * 1000.0; // 穴は完全排除
        score -= bumpiness * 30.0; // フラットさの徹底
        score -= maxH * 10.0;
        
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          if (complete === 4) score += 500.0; // パフェ直前のテトリス大歓迎
          else score += 100.0;
        }
      } 
      else if (isJagged) {
        // 【超火力T-spin特化】
        let tspinGrooves = 0;
        for (let c = 1; c < 9; c++) {
          if (heights[c-1] - heights[c] >= 2 && heights[c+1] - heights[c] >= 2) {
            tspinGrooves++;
          }
        }
        score += tspinGrooves * 350.0; // T-spin用の溝構築へ圧倒的なインセンティブ
        
        score -= holes * 500.0;
        score -= maxH * 15.0;
        
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          if (complete === 2) score += 400.0; // T-spin Double
          else if (complete === 3) score += 600.0; // T-spin Triple
          else if (complete === 4) score += 800.0; // Tetris
          else score -= 80.0; // T-spinを邪魔するシングル消去は厳罰
        }
      } 
      else {
        // 【通常モード：完璧なS4W & テトリス構築】
        const leftH = heights.slice(0, 6);
        const rightH = heights.slice(6, 10);
        const maxLeftH = Math.max(...leftH);
        const maxRightH = Math.max(...rightH);
        const s4wGap = maxLeftH - maxRightH;
        
        if (maxLeftH < 12 && s4wGap >= 3 && maxRightH <= 4) {
          score += 250.0; // S4Wタワーの構築を強力に支援
        }
        
        score -= holes * 500.0;    // 穴は一切作らない
        score -= bumpiness * 25.0;  // 平坦度を保つ
        score -= maxH * 8.0;      // 常にスタックを低く
        
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          if (complete === 4) score += 800.0; // テトリス最優先
          else if (complete >= 2) score += 300.0;
          else score += 15.0; // 盤面整理のための1ライン消去も許容
        }
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
              if (ny >= 0 && grid[ny] && grid[ny][nx]) return true;
            }
          }
        }
        return false;
      };

      const doMerge = (p, grid) => {
        p.matrix.forEach((row, r) => row.forEach((v, c) => {
          if (v) {
            const ny = p.y + r, nx = p.x + c;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && grid[ny]) grid[ny][nx] = p.type;
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
          while (!checkCollide({ ...testPiece, y: y + 1 }, snapshot)) {
            y++;
            if (y >= ROWS) break;
          }
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
      if (!b.current || b.gameOver || b.flashing) return;

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

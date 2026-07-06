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
      
      // Calculate overall roughness (bumpiness)
      let bumpiness = 0;
      for (let i = 0; i < COLS - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i+1]);
      }

      let score = 0;

      // 1. STATE DETERMINATION (状況分析)
      const isPinch = (maxH >= 11); // ピンチ判定 (11段以上積まれている)
      const isFlat = (bumpiness <= 4 && maxH <= 6); // 平坦判定 (凹凸が少なく、高さが低い)
      const isJagged = (bumpiness >= 8); // デコボコ判定

      // 2. STATE-BASED STRATEGY (状況ごとの戦略重み付け)
      if (isPinch) {
        // 【ピンチモード：REN・相殺・緊急防御】
        // REN(コンボ)を繋ぎやすくするために右側を空けつつ、積極的に消しにかかる
        const leftH = heights.slice(0, 6);
        const rightH = heights.slice(6, 10);
        const maxLeftH = Math.max(...leftH);
        const maxRightH = Math.max(...rightH);
        const s4wGap = maxLeftH - maxRightH;
        
        // S4W(サイド4ワイド)のREN構築を支援
        if (s4wGap >= 3 && maxRightH <= 4) {
          score += 25.0; // ピンチ時はRENでの大逆転を狙い、S4Wの加点を高める
        }
        
        // 穴や高さへの超絶ペナルティ
        score -= holes * 60.0;
        score -= maxH * 8.0;
        
        // とにかくライン消去（シングルでも何でも歓迎して盤面を下げる）
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          score += complete * 25.0; // 消せば消すほど良い
        }
      } 
      else if (isFlat) {
        // 【平坦モード：パフェ（Perfect Clear / PC）狙い】
        // 盤面が完全に真っ平ら（ブロック数0）になるのを歓迎する
        if (totalBlocks === 0) {
          score += 150.0; // パフェ達成時の超絶加点
        }
        
        // 穴は絶対NG（パフェの妨げ）
        score -= holes * 80.0;
        
        // できるだけ平らに保つ
        score -= bumpiness * 5.0;
        score -= maxH * 1.5;
        
        // 消去時の加点
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          if (complete === 4) score += 40.0;
          else score += 10.0;
        }
      } 
      else if (isJagged) {
        // 【デコボコモード：T-spin 狙い】
        // 意図的に溝（T-spinの形）を作ってT-spinによる高火力を狙う
        let tspinGrooves = 0;
        for (let c = 1; c < 9; c++) {
          // 左右が高く、中央が2マス以上凹んでいるT-spin用の溝を検出
          if (heights[c-1] - heights[c] >= 2 && heights[c+1] - heights[c] >= 2) {
            tspinGrooves++;
          }
        }
        score += tspinGrooves * 30.0; // T-spin用の溝構築への超強力なインセンティブ
        
        // 穴は作らない
        score -= holes * 45.0;
        // 高さは緩やかに制御
        score -= maxH * 2.0;
        
        // T-spin Double (2ライン消去) や T-spin Triple などのマルチ消去を歓迎
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          if (complete === 2) score += 35.0; // T-spin Double想定の加点
          else if (complete === 3) score += 40.0;
          else if (complete === 4) score += 50.0;
          else score -= 15.0; // 単なる1ライン消去はT-spin用の溝を壊すのでペナルティ
        }
      } 
      else {
        // 【通常モード：バランスプレイ】
        // 安定したS4Wの構築と、安全な高さ維持
        const leftH = heights.slice(0, 6);
        const rightH = heights.slice(6, 10);
        const maxLeftH = Math.max(...leftH);
        const maxRightH = Math.max(...rightH);
        const s4wGap = maxLeftH - maxRightH;
        
        if (maxLeftH < 12 && s4wGap >= 3 && maxRightH <= 4) {
          score += 15.0; // S4Wのベース加点
        }
        
        score -= holes * 40.0;
        score -= bumpiness * 1.5;
        score -= totalH * 2.0;
        
        let complete = 0;
        for (let r = 0; r < ROWS; r++) if (g[r].every(cell => cell)) complete++;
        if (complete > 0) {
          if (complete === 4) score += 50.0;
          else if (complete >= 2) score += 20.0;
          else score -= 12.0; // 通常時の無駄なシングルは温存
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

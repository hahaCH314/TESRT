// TensorFlow.js Neural Network Powered AI Hoiko
(() => {
  const TFHoiko = {
    model: null,
    isTraining: false,
    isTrained: false,
    
    // Convert board grid state and piece state to neural network input vector
    // Input size: 200 (board grid cells) + 7 (one-hot encoded active piece type) = 207 features
    prepareInput: function(grid, pieceType) {
      const input = new Float32Array(200 + 7);
      
      // Fill board grid features (0 = empty, 1 = occupied)
      let idx = 0;
      for (let r = 0; r < 20; r++) {
        for (let c = 0; c < 10; c++) {
          input[idx++] = grid[r][c] ? 1.0 : 0.0;
        }
      }
      
      // One-hot encode piece type: I, J, L, O, S, T, Z
      const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
      const pIdx = types.indexOf(pieceType);
      if (pIdx !== -1) {
        input[200 + pIdx] = 1.0;
      }
      
      return input;
    },
    
    // Initialize the neural network model
    initModel: async function() {
      if (this.model) return;
      
      console.log("%c[TFHoiko] 超鬼畜ニューラルネットワークモデルを構築中...", "color: #ff0055; font-weight: bold;");
      const model = tf.sequential();
      
      // Input layer + Hidden layer 1 (wider layer for complex board patterns)
      model.add(tf.layers.dense({
        inputShape: [207],
        units: 256,
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }));
      
      // Dropout to prevent overfitting on specific synthetic boards
      model.add(tf.layers.dropout({ rate: 0.1 }));
      
      // Hidden layer 2
      model.add(tf.layers.dense({
        units: 128,
        activation: 'relu'
      }));
      
      // Hidden layer 3
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
      }));
      
      // Output layer: 40 classes (10 columns * 4 rotations)
      model.add(tf.layers.dense({
        units: 40,
        activation: 'linear'
      }));
      
      model.compile({
        optimizer: tf.train.adam(0.003),
        loss: 'meanSquaredError'
      });
      
      this.model = model;
      console.log("%c[TFHoiko] モデル構築完了。トレーニングを開始します...", "color: #22e6ff; font-weight: bold;");
      
      await this.trainModel();
    },
    
    // Train model on-the-fly using dataset generated from refined heuristics
    trainModel: async function() {
      if (this.isTraining) return;
      this.isTraining = true;
      
      const inputs = [];
      const outputs = [];
      
      const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
      
      // Generate synthetic game boards and query our excellent heuristic from hoiko.js to build a dataset
      console.log("[TFHoiko] トレーニングデータセット生成中...");
      
      // Helper to generate a simulated random board stack
      const makeRandomGrid = (height) => {
        const grid = Array.from({ length: 20 }, () => Array(10).fill(null));
        if (height === 0) return grid;
        for (let r = 20 - height; r < 20; r++) {
          const fillCount = Math.floor(Math.random() * 8) + 1; // leave at least 2 holes
          const indices = Array.from({ length: 10 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, fillCount);
          indices.forEach(c => {
            grid[r][c] = 'I';
          });
        }
        return grid;
      };
      
      // Generate samples spanning different stack levels
      const heights = [0, 2, 4, 6, 8, 10, 12, 14];
      
      // Reference standard Tetris rotation matrices from game.js
      const ROTATIONS = window.gameROTATIONS;
      
      // Increase samples per height to 40 for more thorough training
      for (const h of heights) {
        for (let sample = 0; sample < 40; sample++) {
          const grid = makeRandomGrid(h);
          
          for (const type of types) {
            const inputVec = this.prepareInput(grid, type);
            const outputVec = new Float32Array(40); // 10 columns * 4 rotations
            outputVec.fill(-999.0); // default low value for invalid drops
            
            const shapes = ROTATIONS ? ROTATIONS[type] : null;
            if (shapes) {
              for (let rot = 0; rot < shapes.length; rot++) {
                const matrix = shapes[rot];
                for (let x = 0; x < 10; x++) {
                  // Check if position is valid
                  let ok = true;
                  for (let r = 0; r < matrix.length && ok; r++) {
                    for (let c = 0; c < matrix[r].length && ok; c++) {
                      if (matrix[r][c]) {
                        const nx = x + c;
                        if (nx < 0 || nx >= 10) ok = false;
                      }
                    }
                  }
                  if (!ok) continue;
                  
                  // Simulate drop to get y
                  let y = -3;
                  const collides = (p, g) => {
                    for (let r = 0; r < p.matrix.length; r++) {
                      for (let c = 0; c < p.matrix[r].length; c++) {
                        if (p.matrix[r][c]) {
                          const ny = p.y + r, nx = p.x + c;
                          if (ny >= 20 || nx < 0 || nx >= 10) return true;
                          if (ny >= 0 && g[ny] && g[ny][nx]) return true;
                        }
                      }
                    }
                    return false;
                  };
                  
                  const testPiece = { type, matrix, x, y };
                  if (collides({ ...testPiece }, grid)) continue;
                  while (!collides({ ...testPiece, y: y + 1 }, grid)) {
                    y++;
                    if (y >= 20) break;
                  }
                  if (y < 0) continue;
                  
                  // Evaluate drop using hoiko.js heuristic
                  const simGrid = grid.map(r => r.slice());
                  matrix.forEach((row, r) => row.forEach((v, c) => {
                    if (v && y + r >= 0 && y + r < 20) simGrid[y + r][x + c] = type;
                  }));
                  
                  const score = window.Hoiko ? window.Hoiko.evaluateGrid(simGrid) : 0;
                  
                  // Map (x, rot) output index
                  const outIdx = rot * 10 + x;
                  outputVec[outIdx] = score;
                }
              }
            }
            
            inputs.push(inputVec);
            outputs.push(outputVec);
          }
        }
      }
      
      console.log(`[TFHoiko] データセット生成完了。サンプル数: ${inputs.length}`);
      
      const xs = tf.tensor2d(inputs);
      const ys = tf.tensor2d(outputs);
      
      // Train model - Increase epochs to 80 for much better fit and accuracy
      await this.model.fit(xs, ys, {
        epochs: 80,
        batchSize: 64,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if ((epoch + 1) % 20 === 0) {
              console.log(`[TFHoiko] 学習進行中... Epoch ${epoch + 1}/80 | Loss: ${logs.loss.toFixed(4)}`);
            }
          }
        }
      });
      
      xs.dispose();
      ys.dispose();
      
      this.isTraining = false;
      this.isTrained = true;
      console.log("%c[TFHoiko] ★ ニューラルネットワークの学習が正常に完了しました！ ★", "color: #4ade80; font-weight: bold; text-shadow: 0 0 8px rgba(74,222,128,0.4);");
      if (window.triggerCutIn) {
        window.triggerCutIn("AIほいこ：ニューラルネットワーク脳起動完了！");
      }
    },
    
    // Make move using model prediction
    step: function(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS, puyoCollides) {
      if (!b.current || b.gameOver || b.flashing) return;
      
      // Lazy load model on first step
      if (!this.model) {
        // Expose ROTATIONS to window so generator can read it
        window.gameROTATIONS = ROTATIONS;
        this.initModel();
        // Fallback to heuristic during initial load
        window.Hoiko.step(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS, puyoCollides);
        return;
      }
      
      if (!this.isTrained) {
        // Fallback while training
        window.Hoiko.step(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS, puyoCollides);
        return;
      }
      
      if (b.type === 'puyo') {
        // Neural net model currently optimized for Tetris. Fallback to GTR heuristic for Puyo
        window.Hoiko.step(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS, puyoCollides);
        return;
      }
      
      if (!b.cpuTarget) {
        // Trigger speech lines
        if (Math.random() < 0.05 && window.triggerCutIn) {
          const lines = [
            "NN推論中...",
            "予測モデル、最適解を出力します",
            "誤差逆伝播アタック！",
            "DNNモード、起動中..."
          ];
          window.triggerCutIn(lines[Math.floor(Math.random() * lines.length)]);
        }
        
        // Predict move
        const inputVec = this.prepareInput(b.grid, b.current.type);
        tf.tidy(() => {
          const inputTensor = tf.tensor2d([inputVec]);
          const prediction = this.model.predict(inputTensor);
          const scores = prediction.dataSync();
          
          // Get all valid scores and indices
          const candidates = [];
          
          for (let i = 0; i < 40; i++) {
            if (scores[i] > -500.0) {
              const rot = Math.floor(i / 10);
              const x = i % 10;
              
              const shapes = ROTATIONS[b.current.type];
              if (rot < shapes.length) {
                const matrix = shapes[rot];
                
                // Simulate drop to check validity
                let y = -3;
                const checkCollide = (p, grid) => {
                  for (let r = 0; r < p.matrix.length; r++) {
                    for (let c = 0; c < p.matrix[r].length; c++) {
                      if (p.matrix[r][c]) {
                        const ny = p.y + r, nx = p.x + c;
                        if (ny >= 20 || nx < 0 || nx >= 10) return true;
                        if (ny >= 0 && grid[ny] && grid[ny][nx]) return true;
                      }
                    }
                  }
                  return false;
                };
                
                const testPiece = { type: b.current.type, matrix, x, y };
                if (!checkCollide({ ...testPiece }, b.grid)) {
                  while (!checkCollide({ ...testPiece, y: y + 1 }, b.grid)) {
                    y++;
                    if (y >= 20) break;
                  }
                  if (y >= 0) {
                    // Evaluate this exact predicted drop with the refined heuristic
                    const simGrid = b.grid.map(r => r.slice());
                    matrix.forEach((row, r) => row.forEach((v, c) => {
                      if (v && y + r >= 0 && y + r < 20) simGrid[y + r][x + c] = b.current.type;
                    }));
                    const actualScore = window.Hoiko ? window.Hoiko.evaluateGrid(simGrid) : scores[i];
                    
                    // Add to hybrid candidates
                    candidates.push({
                      x,
                      y,
                      rotation: rot,
                      matrix,
                      nnScore: scores[i],
                      actualScore: actualScore
                    });
                  }
                }
              }
            }
          }
          
          if (candidates.length > 0) {
            // Sort by actual heuristic score to ensure the hand is absolute top-tier
            candidates.sort((a, b) => b.actualScore - a.actualScore);
            b.cpuTarget = candidates[0];
          }
        });
        
        // Final safety fallback if TF failed to find a valid prediction
        if (!b.cpuTarget) {
          b.cpuTarget = window.Hoiko.findBestMove(b.current, b.grid, ROTATIONS);
        }
        
        if (!b.cpuTarget) {
          hardDrop(b);
          return;
        }
      }
      
      // Execute the predicted move
      b.current.rotation = b.cpuTarget.rotation;
      b.current.matrix = ROTATIONS[b.current.type][b.cpuTarget.rotation];
      b.current.x = b.cpuTarget.x;
      b.current.y = b.cpuTarget.y;
      
      hardDrop(b);
      b.cpuTarget = null;
    }
  };
  
  // Expose to window
  window.TFHoiko = TFHoiko;

  // Run model loading & training asynchronously as soon as the script is loaded.
  // This ensures the model is fully trained by the time the user starts playing or hoiko steps.
  setTimeout(() => {
    // Generate the standard ROTATIONS if not already initialized in game.js
    if (!window.gameROTATIONS) {
      const shapes = {
        I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        J: [[1,0,0],[1,1,1],[0,0,0]],
        L: [[0,0,1],[1,1,1],[0,0,0]],
        O: [[1,1],[1,1]],
        S: [[0,1,1],[1,1,0],[0,0,0]],
        T: [[0,1,0],[1,1,1],[0,0,0]],
        Z: [[1,1,0],[0,1,1],[0,0,0]],
      };
      const rotateMatrix = (matrix, dir) => {
        const n = matrix.length;
        const res = Array.from({ length: n }, () => Array(n).fill(0));
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
          if (dir > 0) res[c][n - 1 - r] = matrix[r][c];
          else res[n - 1 - c][r] = matrix[r][c];
        }
        return res;
      };
      const rots = {};
      for (const t of Object.keys(shapes)) {
        const arr = [shapes[t]];
        for (let i = 0; i < 3; i++) arr.push(rotateMatrix(arr[arr.length - 1], 1));
        rots[t] = arr;
      }
      window.gameROTATIONS = rots;
    }
    TFHoiko.initModel();
  }, 100);
})();

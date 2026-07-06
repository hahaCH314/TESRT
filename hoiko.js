// AI Hoiko Mode Logic for Tetris & Puyo Puyo
(() => {
  const Hoiko = {
    difficultyName: 'hoiko',
    
    // Executes Hoiko's instant teleportation & immediate hard drop
    step: function(b, findBestMove, findBestMovePuyo, hardDrop, ROTATIONS) {
      if (!b.current || b.gameOver || paused || b.flashing) return;

      // 1. Calculate the best move instantly with zero noise and zero delay
      if (!b.cpuTarget) {
        b.cpuTarget = b.type === 'puyo'
          ? findBestMovePuyo(b.current, b.grid, 0, 0)
          : findBestMove(b.current, b.grid, 0, 0);

        if (!b.cpuTarget) {
          hardDrop(b);
          return;
        }
      }

      // 2. Teleport to target position & rotation in the same frame (like a god-tier AI)
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

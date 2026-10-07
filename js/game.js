// ============================================================================
// ⚙️ ГОЛОВНІ НАЛАШТУВАННЯ ГРИ (GAME CONFIG)
// - headScale: масштаб фото голови (1.0 = точний розмір клітинки, 1.18 = трохи збільшена)
// - gridSize: кількість клітинок (наприклад, 7 = поле 7х7)
// - speed: затримка між кроками в мілісекундах (БІЛЬШЕ ЧИСЛО = ПОВІЛЬНІША ЗМІЙКА!)
// ============================================================================
const GAME_CONFIG = {
  // 👈 РЕГУЛЮВАННЯ РОЗМІРУ ФОТО ГОЛОВИ:
  // 1.0 = рівно клітинка, 1.18 = трохи збільшене (за замовчуванням), 1.30 = ще більше
  headScale: 1.18,

  // 👈 ВІРОГІДНІСТЬ ОСОБЛИВОГО ЖАРТІВЛИВОГО ЕФЕКТУ (0.10 = 10%, 0.15 = 15%):
  specialEventChance: 0.2,

  difficulties: {
    easy: {
      gridSize: 7,      // 7 × 7 (49 клітинок) — супер-казуальний та повільний темп
      speed: 350,       // 350 мс між кроками (дуже спокійно, комфортно для телефона)
      label: '7 × 7'
    },
    medium: {
      gridSize: 12,     // 12 × 12 клітинок — помірний темп
      speed: 260,       // 260 мс (комфортно та плавно)
      label: '12 × 12'
    },
    hard: {
      gridSize: 17,     // 17 × 17 клітинок
      speed: 190,       // 190 мс (значно повільніше ніж раніше, доступно для смартфона)
      label: '17 × 17'
    }
  }
};

class DudkaSnakeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.fxCanvas = document.getElementById('fxCanvas');
    this.fxCtx = this.fxCanvas.getContext('2d');

    // Use GAME_CONFIG
    this.difficulties = GAME_CONFIG.difficulties;
    this.currentDifficulty = 'easy';
    this.gridSize = this.difficulties.easy.gridSize;
    this.cellSize = 32;
    this.tickInterval = this.difficulties.easy.speed;

    // Game states: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
    this.gameState = 'MENU';

    // Snake & Food
    this.snake = [];
    this.direction = { x: 1, y: 0, name: 'RIGHT' };
    this.nextDirection = { x: 1, y: 0, name: 'RIGHT' };
    this.directionQueue = [];
    this.food = null;
    this.score = 0;

    // Particle & Surprise Systems
    this.smokeParticles = [];
    this.confettiParticles = [];
    this.floatingTexts = [];
    this.smokeRings = [];
    this.rainbowVaporUntil = 0;
    this.goldenBossUntil = 0;
    this.ownerSwitchUntil = 0;
    this.activeOwnerIndex = 0;

    // Animation & timing
    this.lastTickTime = 0;
    this.animFrameId = null;
    this.pulseAnimTime = 0;

    // Assets
    this.textures = {
      owner: null,
      owners: [],
      smoke: null,
      vapes: []
    };
    this.texturesLoaded = false;

    // DOM Elements
    this.currentScoreEl = document.getElementById('currentScore');
    this.bestScoreEl = document.getElementById('bestScore');
    this.victoryProgressBar = document.getElementById('victoryProgressBar');
    this.victoryRemaining = document.getElementById('victoryRemaining');

    this.startOverlay = document.getElementById('startOverlay');
    this.gameOverOverlay = document.getElementById('gameOverOverlay');
    this.victoryOverlay = document.getElementById('victoryOverlay');
    this.pauseOverlay = document.getElementById('pauseOverlay');

    this.init();
  }

  init() {
    this.loadTextures();
    this.setupResize();
    this.setupUIEvents();

    // Controls setup
    this.controls = new ControlsManager(
      (dir) => this.handleDirectionChange(dir),
      () => this.togglePause(),
      () => this.restartGame()
    );

    this.updateBestScoreDisplay();
    this.render(); // initial render
  }

  loadTextures() {
    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn(`Could not load image: ${src}, using fallback.`);
          resolve(null);
        };
        img.src = src;
      });
    };

    const vapeSources = [
      'assets/images/vapes/vape1.png',
      'assets/images/vapes/vape2.png',
      'assets/images/vapes/vape3.png',
      'assets/images/vapes/vape4.png'
    ];

    Promise.all([
      loadImage('assets/images/owner.png'),
      loadImage('assets/images/owner2.png'),
      loadImage('assets/images/smoke.png'),
      ...vapeSources.map(src => loadImage(src))
    ]).then(([owner1, owner2, smokeImg, ...vapeImgs]) => {
      this.textures.owners = [owner1, owner2].filter(Boolean);
      this.textures.owner = this.textures.owners[0] || null;
      this.textures.smoke = smokeImg;
      this.textures.vapes = vapeImgs.filter(Boolean);
      this.texturesLoaded = true;
    });
  }

  setupResize() {
    const handleResize = () => {
      const container = document.getElementById('canvasContainer');
      if (!container) return;

      // Reset inline height so CSS max-width and aspect-ratio compute accurately
      container.style.height = '';
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Enforce strictly square dimensions: width = height
      const squareSize = Math.floor(rect.width);
      container.style.height = `${squareSize}px`;

      // Adjust main canvas
      this.canvas.width = squareSize * dpr;
      this.canvas.height = squareSize * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Adjust FX canvas
      this.fxCanvas.width = squareSize * dpr;
      this.fxCanvas.height = squareSize * dpr;
      this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.viewSize = squareSize;
      this.cellSize = this.viewSize / this.gridSize;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();
  }

  setupUIEvents() {
    // Difficulty select buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setDifficulty(btn.dataset.difficulty);
      });
    });

    // Start button
    document.getElementById('btnStartGame').addEventListener('click', () => {
      this.startOverlay.classList.remove('active');
      this.startGame();
    });

    // Restart button (Game over)
    document.getElementById('btnRestart').addEventListener('click', () => {
      this.gameOverOverlay.classList.remove('active');
      this.startGame();
    });

    // Change difficulty button (Game over)
    document.getElementById('btnChangeDifficulty').addEventListener('click', () => {
      this.gameOverOverlay.classList.remove('active');
      this.startOverlay.classList.add('active');
    });

    // Win Restart
    document.getElementById('btnWinRestart').addEventListener('click', () => {
      this.victoryOverlay.classList.remove('active');
      this.confettiParticles = [];
      this.startGame();
    });

    // Win Change difficulty
    document.getElementById('btnWinChangeDifficulty').addEventListener('click', () => {
      this.victoryOverlay.classList.remove('active');
      this.confettiParticles = [];
      this.startOverlay.classList.add('active');
    });

    // Pause button & overlay
    document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
    document.getElementById('btnResume').addEventListener('click', () => this.togglePause());

    // Audio toggle buttons
    const btnSound = document.getElementById('btnSoundToggle');
    btnSound.addEventListener('click', () => {
      const enabled = window.audioManager.toggleSound();
      btnSound.classList.toggle('active-mute', !enabled);
      btnSound.textContent = enabled ? '🔊' : '🔇';
    });

    const btnMusic = document.getElementById('btnMusicToggle');
    btnMusic.addEventListener('click', () => {
      const enabled = window.audioManager.toggleMusic();
      btnMusic.classList.toggle('active-mute', !enabled);
      btnMusic.textContent = enabled ? '🎵' : '🔇';
    });
  }

  setDifficulty(level) {
    if (!this.difficulties[level]) return;
    this.currentDifficulty = level;
    this.gridSize = this.difficulties[level].gridSize;
    this.tickInterval = this.difficulties[level].speed;
    this.cellSize = this.viewSize / this.gridSize;
    this.updateBestScoreDisplay();
  }

  updateBestScoreDisplay() {
    const best = this.getBestScore();
    this.bestScoreEl.textContent = best;
  }

  getBestScore() {
    return parseInt(localStorage.getItem(`dudka_best_${this.currentDifficulty}`) || '0', 10);
  }

  saveBestScore(score) {
    const currentBest = this.getBestScore();
    if (score > currentBest) {
      localStorage.setItem(`dudka_best_${this.currentDifficulty}`, score);
      this.updateBestScoreDisplay();
    }
  }

  startGame() {
    this.gridSize = this.difficulties[this.currentDifficulty].gridSize;
    this.tickInterval = this.difficulties[this.currentDifficulty].speed;
    this.cellSize = this.viewSize / this.gridSize;

    // Initial snake (3 segments) placed near center-left
    const midY = Math.floor(this.gridSize / 2);
    const startX = Math.min(3, this.gridSize - 2);
    this.snake = [
      { x: startX, y: midY },
      { x: startX - 1, y: midY },
      { x: startX - 2, y: midY }
    ];

    this.direction = { x: 1, y: 0, name: 'RIGHT' };
    this.nextDirection = { x: 1, y: 0, name: 'RIGHT' };
    this.directionQueue = [];

    // Trigger fresh random music track on every game start
    if (window.audioManager) {
      window.audioManager.playRandomTrack();
    }

    this.score = 0;
    this.currentScoreEl.textContent = '0';
    this.updateHUD();

    this.spawnFood();
    this.smokeParticles = [];
    this.confettiParticles = [];
    this.floatingTexts = [];
    this.smokeRings = [];
    this.rainbowVaporUntil = 0;
    this.goldenBossUntil = 0;
    this.ownerSwitchUntil = 0;
    this.activeOwnerIndex = 0;

    this.gameState = 'PLAYING';
    this.lastTickTime = performance.now();

    if (!this.animFrameId) {
      this.gameLoop(performance.now());
    }
  }

  spawnFood() {
    const totalCells = this.gridSize * this.gridSize;
    if (this.snake.length >= totalCells) {
      this.food = null;
      return;
    }

    const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
    const emptyCells = [];

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) {
      this.handleVictory();
      return;
    }

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const vapeIndex = this.textures.vapes.length > 0
      ? Math.floor(Math.random() * this.textures.vapes.length)
      : 0;

    this.food = {
      x: randomCell.x,
      y: randomCell.y,
      textureIndex: vapeIndex,
      spawnTime: performance.now()
    };
  }

  handleDirectionChange(newDir) {
    if (this.gameState !== 'PLAYING') return;

    // Check last queued or current direction to prevent instant 180° reverse
    const lastDir = this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;

    const isOpposite = (lastDir.x + newDir.x === 0) && (lastDir.y + newDir.y === 0);
    const isSame = (lastDir.x === newDir.x) && (lastDir.y === newDir.y);

    if (!isOpposite && !isSame && this.directionQueue.length < 2) {
      this.directionQueue.push(newDir);
    }
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.pauseOverlay.classList.add('active');
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.pauseOverlay.classList.remove('active');
      this.lastTickTime = performance.now();
    }
  }

  restartGame() {
    this.gameOverOverlay.classList.remove('active');
    this.victoryOverlay.classList.remove('active');
    this.pauseOverlay.classList.remove('active');
    this.startGame();
  }

  gameLoop(timestamp) {
    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));

    if (this.gameState === 'PLAYING') {
      const elapsed = timestamp - this.lastTickTime;
      if (elapsed >= this.tickInterval) {
        this.tick();
        this.lastTickTime = timestamp;
      }
    }

    this.pulseAnimTime = timestamp;
    this.updateParticles();
    this.render();
  }

  tick() {
    // Apply queued direction
    if (this.directionQueue.length > 0) {
      this.direction = this.directionQueue.shift();
    }

    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };

    // 1. Collision with Walls (Hardcore: always die on wall hit as chosen in A3)
    if (
      newHead.x < 0 || newHead.x >= this.gridSize ||
      newHead.y < 0 || newHead.y >= this.gridSize
    ) {
      this.handleGameOver('Врізався у стіну!');
      return;
    }

    // 2. Collision with Self (Smoke trail)
    // Note: ignore tail tip if not eating this turn
    const isTailTip = (segIndex) => segIndex === this.snake.length - 1;
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        if (!isTailTip(i)) {
          this.handleGameOver('Вдихнув забагато власного диму!');
          return;
        }
      }
    }

    // Advance head
    this.snake.unshift(newHead);

    // 3. Collision with Vape (Food)
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.currentScoreEl.textContent = this.score;

      // Sound FX: Pop!
      if (window.audioManager) window.audioManager.playPop();

      // Trigger smoke explosion particle effect
      this.triggerSmokeBurst(
        (newHead.x + 0.5) * this.cellSize,
        (newHead.y + 0.5) * this.cellSize
      );

      // Check for 10% special surprise event!
      this.checkSpecialEvent(newHead.x, newHead.y);

      this.updateHUD();

      // Check Victory Condition: Entire field filled!
      const totalCells = this.gridSize * this.gridSize;
      if (this.snake.length >= totalCells) {
        this.handleVictory();
        return;
      }

      this.spawnFood();
    } else {
      // Normal step: remove tail tip
      this.snake.pop();
    }
  }

  /**
   * 10% Special Surprise Event upon collecting a vape
   */
  checkSpecialEvent(cellX, cellY) {
    const chance = GAME_CONFIG.specialEventChance !== undefined ? GAME_CONFIG.specialEventChance : 0.12;
    if (Math.random() >= chance) return;

    // Special celebratory chime
    if (window.audioManager && window.audioManager.playSpecial) {
      window.audioManager.playSpecial();
    }

    const px = (cellX + 0.5) * this.cellSize;
    const py = (cellY + 0.5) * this.cellSize;

    // 1. Floating funny text banner
    const phrases = [
      'ОЦЕ НАВАЛИЛО! 💨',
      'МЕГА ТЯГА! 🔥',
      'ШЕФ КАЙФУЄ! 😎',
      'ГУСТИЙ ДИМ! ☁️',
      'ДЖЕКПОТ! 🎰',
      'СМАКОТА! 🤤',
      'ШЕФ У ЗАХВАТІ! 👑'
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.floatingTexts.push({
      text: phrase,
      x: px,
      y: py - 14,
      alpha: 1.0,
      createdAt: performance.now(),
      duration: 2000,
      color: Math.random() > 0.4 ? '#22c55e' : '#ff3355'
    });

    // 2. Expanding Vape Smoke Ring (кільце пари)
    this.smokeRings.push({
      x: px,
      y: py,
      radius: this.cellSize * 0.4,
      maxRadius: this.cellSize * 4.2,
      currentRadius: this.cellSize * 0.4,
      alpha: 0.85,
      createdAt: performance.now(),
      duration: 1200,
      color: Math.random() > 0.5 ? '#22c55e' : '#ff3355'
    });

    // 3. Random Surprise Event Type:
    // Option A: If owner2 photo exists, switch chief to hyped expression for 3.5s!
    // Option B: Rainbow vapor clouds for 3.5s!
    // Option C: Golden Chief aura for 3.0s!
    // Option D: Bonus +1 point!
    const effectType = Math.floor(Math.random() * 4);

    if (effectType === 0 && this.textures.owners && this.textures.owners.length > 1) {
      this.activeOwnerIndex = 1; // switch to owner2.png
      this.ownerSwitchUntil = performance.now() + 6000;
    } else if (effectType === 1) {
      this.rainbowVaporUntil = performance.now() + 6000;
    } else if (effectType === 2) {
      this.goldenBossUntil = performance.now() + 6000;
    } else {
      // Bonus vape point!
      this.score++;
      this.currentScoreEl.textContent = this.score;
      this.floatingTexts.push({
        text: '+1 БОНУСНА СОПІЛКА! 🎁',
        x: px,
        y: py - 38,
        alpha: 1.0,
        createdAt: performance.now(),
        duration: 3000,
        color: '#ff3355'
      });
    }
  }

  updateHUD() {
    const totalCells = this.gridSize * this.gridSize;
    const remaining = Math.max(0, totalCells - this.snake.length);
    const percent = Math.min(100, Math.round((this.snake.length / totalCells) * 100));

    this.victoryRemaining.textContent = `${remaining} кл.`;
    this.victoryProgressBar.style.width = `${percent}%`;
  }

  handleGameOver(reason) {
    this.gameState = 'GAMEOVER';
    if (window.audioManager) window.audioManager.playGameOver();

    this.saveBestScore(this.score);

    const totalCells = this.gridSize * this.gridSize;
    const percent = Math.round((this.snake.length / totalCells) * 100);

    document.getElementById('gameOverReason').textContent = reason;
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('finalPercent').textContent = `${percent}%`;
    document.getElementById('finalBest').textContent = this.getBestScore();

    this.gameOverOverlay.classList.add('active');
  }

  handleVictory() {
    this.gameState = 'VICTORY';
    if (window.audioManager) window.audioManager.playWin();

    this.saveBestScore(this.score);

    document.getElementById('winBoardSize').textContent = this.difficulties[this.currentDifficulty].label;
    document.getElementById('winTotalScore').textContent = this.score;

    this.victoryOverlay.classList.add('active');
    this.triggerConfetti();
  }

  /* ==========================================================================
     Particle Effects: Smoke Puffs & Confetti
     ========================================================================== */
  triggerSmokeBurst(x, y) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      this.smokeParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 8 + Math.random() * 14,
        alpha: 0.8,
        decay: 0.015 + Math.random() * 0.02,
        color: Math.random() > 0.5 ? '#22c55e' : '#ff3355'
      });
    }
  }

  triggerConfetti() {
    const colors = ['#22c55e', '#ff3355', '#4ade80', '#ff6b85', '#ffffff'];
    const count = 120;
    this.confettiParticles = [];

    for (let i = 0; i < count; i++) {
      this.confettiParticles.push({
        x: Math.random() * this.viewSize,
        y: -10 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }
  }

  updateParticles() {
    const now = performance.now();

    // Update smoke particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.4;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.smokeParticles.splice(i, 1);
      }
    }

    // Update floating surprise texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      const elapsed = now - t.createdAt;
      if (elapsed >= t.duration) {
        this.floatingTexts.splice(i, 1);
      } else {
        t.y -= 0.65;
        t.alpha = 1 - Math.pow(elapsed / t.duration, 1.6);
      }
    }

    // Update expanding smoke rings
    for (let i = this.smokeRings.length - 1; i >= 0; i--) {
      const r = this.smokeRings[i];
      const elapsed = now - r.createdAt;
      if (elapsed >= r.duration) {
        this.smokeRings.splice(i, 1);
      } else {
        const progress = elapsed / r.duration;
        r.currentRadius = r.radius + (r.maxRadius - r.radius) * Math.sin(progress * Math.PI * 0.5);
        r.alpha = 0.85 * (1 - progress);
      }
    }

    // Update confetti particles
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const c = this.confettiParticles[i];
      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.rotSpeed;
      if (c.y > this.viewSize + 20) {
        // loop back to top during victory screen
        if (this.gameState === 'VICTORY') {
          c.y = -20;
          c.x = Math.random() * this.viewSize;
        } else {
          this.confettiParticles.splice(i, 1);
        }
      }
    }
  }

  /* ==========================================================================
     Canvas Rendering
     ========================================================================== */
  render() {
    const ctx = this.ctx;
    const fxCtx = this.fxCtx;
    const size = this.viewSize;
    const cell = this.cellSize;

    // Clear main canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background grid
    this.drawGrid(ctx, size, cell);

    // Draw Food (Vape)
    if (this.food) {
      this.drawFood(ctx, this.food, cell);
    }

    // Draw Snake (Body as Vape Vapor/Smoke Clouds + Head as Owner Photo)
    if (this.snake.length > 0) {
      this.drawSnake(ctx, cell);
    }

    // Render FX canvas (particles + confetti)
    fxCtx.clearRect(0, 0, size, size);
    this.renderParticles(fxCtx);
  }

  drawGrid(ctx, size, cell) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= size; x += cell) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
    }
    ctx.stroke();

    // Subtle neon border frame
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
  }

  drawSnake(ctx, cell) {
    const len = this.snake.length;

    // 1. Draw Body as Vape Vapor / Smoke Clouds (from tail to neck)
    for (let i = len - 1; i >= 1; i--) {
      const seg = this.snake[i];
      const cx = (seg.x + 0.5) * cell;
      const cy = (seg.y + 0.5) * cell;

      // Distance factor from head (0 at neck, 1 at tail)
      const t = i / len;
      const alpha = 0.85 - t * 0.45; // fades out towards tail
      const radius = (cell * 0.55) + Math.sin(this.pulseAnimTime * 0.005 + i) * 1.5;

      ctx.save();
      // Rainbow vapor mode (active during 10% surprise event!)
      const isRainbow = (this.rainbowVaporUntil && performance.now() < this.rainbowVaporUntil);
      if (isRainbow) {
        const hue = (this.pulseAnimTime * 0.14 + i * 22) % 360;
        ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
        ctx.shadowBlur = 12;
      }

      if (this.textures.smoke) {
        // Draw smoke sprite with alpha
        ctx.globalAlpha = Math.max(0.2, alpha);
        const spriteSize = radius * 2.2;
        ctx.drawImage(
          this.textures.smoke,
          cx - spriteSize / 2,
          cy - spriteSize / 2,
          spriteSize,
          spriteSize
        );
      } else {
        // Fallback procedural smoke puff
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
        grad.addColorStop(0, `rgba(220, 240, 255, ${alpha})`);
        grad.addColorStop(0.6, `rgba(180, 210, 255, ${alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Draw Snake Head (Shop Owner's Photo)
    const head = this.snake[0];
    const hx = (head.x + 0.5) * cell;
    const hy = (head.y + 0.5) * cell;

    // Head scaling: easily adjustable in GAME_CONFIG.headScale
    const scale = GAME_CONFIG.headScale || 1.18;
    const headSize = cell * scale;
    const halfHead = headSize / 2;

    ctx.save();
    ctx.translate(hx, hy);

    // Rotate or flip head according to movement direction
    if (this.direction.name === 'LEFT') {
      ctx.scale(-1, 1);
    } else if (this.direction.name === 'UP') {
      ctx.rotate(-Math.PI / 16); // slight playful tilt
    } else if (this.direction.name === 'DOWN') {
      ctx.rotate(Math.PI / 16);
    }

    // Select Owner photo (support multiple photos and temporary surprise switch)
    let currentOwnerImg = this.textures.owner;
    if (
      this.ownerSwitchUntil &&
      performance.now() < this.ownerSwitchUntil &&
      this.textures.owners &&
      this.textures.owners.length > 1
    ) {
      currentOwnerImg = this.textures.owners[this.activeOwnerIndex || 1];
    } else if (this.textures.owners && this.textures.owners.length > 0) {
      currentOwnerImg = this.textures.owners[0];
    }

    // Golden boss sparkle mode (active during surprise event!)
    if (this.goldenBossUntil && performance.now() < this.goldenBossUntil) {
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 18;
    }

    // Draw Owner Photo directly (clean photo, no neon circle outline)
    if (currentOwnerImg) {
      ctx.drawImage(
        currentOwnerImg,
        -halfHead,
        -halfHead,
        headSize,
        headSize
      );
    } else {
      // Fallback head avatar if photo not loaded
      ctx.font = `${Math.floor(headSize * 0.75)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('😎', 0, 0);
    }

    ctx.restore();
  }

  drawFood(ctx, food, cell) {
    const cx = (food.x + 0.5) * cell;
    const cy = (food.y + 0.5) * cell;

    // Gentle floating bob & pulse
    const bob = Math.sin((this.pulseAnimTime - food.spawnTime) * 0.006) * (cell * 0.06);
    const pulse = 1 + Math.sin(this.pulseAnimTime * 0.008) * 0.05;
    const foodSize = cell * 0.88 * pulse;

    ctx.save();
    ctx.translate(cx, cy + bob);

    // Red neon glow and circular backdrop behind vape
    ctx.save();
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(255, 51, 85, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, foodSize * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const vapeImg = this.textures.vapes[food.textureIndex];
    if (vapeImg) {
      ctx.drawImage(
        vapeImg,
        -foodSize / 2,
        -foodSize / 2,
        foodSize,
        foodSize
      );
    } else {
      // Fallback vape icon
      ctx.font = `${Math.floor(foodSize * 0.8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💨', 0, 0);
    }

    ctx.restore();
  }

  renderParticles(fxCtx) {
    // Render smoke burst particles
    for (const p of this.smokeParticles) {
      fxCtx.save();
      fxCtx.globalAlpha = p.alpha;
      const grad = fxCtx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      fxCtx.fillStyle = grad;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.restore();
    }

    // Render expanding smoke rings (from surprise events)
    for (const r of this.smokeRings) {
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, r.alpha);
      fxCtx.strokeStyle = r.color || '#22c55e';
      fxCtx.lineWidth = 3.5;
      fxCtx.shadowColor = r.color || '#22c55e';
      fxCtx.shadowBlur = 12;
      fxCtx.beginPath();
      fxCtx.arc(r.x, r.y, Math.max(1, r.currentRadius), 0, Math.PI * 2);
      fxCtx.stroke();
      fxCtx.restore();
    }

    // Render floating meme texts (from surprise events)
    for (const t of this.floatingTexts) {
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, t.alpha);
      fxCtx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      fxCtx.textAlign = 'center';
      fxCtx.textBaseline = 'middle';

      // Thick dark outline
      fxCtx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
      fxCtx.lineWidth = 4;
      fxCtx.strokeText(t.text, t.x, t.y);

      // Neon fill & glow
      fxCtx.fillStyle = t.color || '#22c55e';
      fxCtx.shadowColor = t.color || '#22c55e';
      fxCtx.shadowBlur = 12;
      fxCtx.fillText(t.text, t.x, t.y);

      fxCtx.restore();
    }

    // Render victory confetti
    for (const c of this.confettiParticles) {
      fxCtx.save();
      fxCtx.translate(c.x, c.y);
      fxCtx.rotate((c.rotation * Math.PI) / 180);
      fxCtx.fillStyle = c.color;
      fxCtx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
      fxCtx.restore();
    }
  }
}

// Start game on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new DudkaSnakeGame();
});


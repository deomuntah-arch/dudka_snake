/**
 * DUDKA SNAKE — Controls Manager
 * Handles Keyboard, Touch Swipes, and Virtual D-Pad inputs.
 */

class ControlsManager {
  constructor(onDirectionChange, onTogglePause, onRestart) {
    this.onDirectionChange = onDirectionChange;
    this.onTogglePause = onTogglePause;
    this.onRestart = onRestart;

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchMinDistance = 16; // швидкий та чутливий поріг для легкого керування
    this.touchTriggered = false;

    this.initKeyboard();
    this.initTouchSwipes();
    this.initDpad();

    this.detectMobileDevice();
    window.addEventListener('resize', () => this.detectMobileDevice());
    window.addEventListener('orientationchange', () => this.detectMobileDevice());
    window.addEventListener('touchstart', () => this.detectMobileDevice(), { passive: true });
  }

  detectMobileDevice() {
    const isMobile = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 768px)').matches ||
      window.innerWidth <= 768
    );

    const dpad = document.getElementById('dpadContainer');
    if (dpad) {
      if (isMobile) {
        dpad.classList.add('show-mobile');
      } else {
        dpad.classList.remove('show-mobile');
      }
    }
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Trigger audio unlock on first interaction
      if (window.audioManager) {
        window.audioManager.initContext();
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.onDirectionChange({ x: 0, y: -1, name: 'UP' });
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.onDirectionChange({ x: 0, y: 1, name: 'DOWN' });
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.onDirectionChange({ x: -1, y: 0, name: 'LEFT' });
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.onDirectionChange({ x: 1, y: 0, name: 'RIGHT' });
          break;
        case 'Space':
          e.preventDefault();
          if (this.onTogglePause) this.onTogglePause();
          break;
        case 'KeyR':
          if (this.onRestart) this.onRestart();
          break;
      }
    });
  }

  initTouchSwipes() {
    const canvas = document.getElementById('canvasContainer');
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => {
      if (window.audioManager) window.audioManager.initContext();
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchTriggered = false;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      // If menu or overlay is open (not actively PLAYING), allow free page scrolling!
      if (window.game && window.game.gameState !== 'PLAYING') {
        return;
      }
      // Prevent scrolling only while actively steering the snake inside canvas
      if (e.cancelable) {
        e.preventDefault();
      }
      if (e.touches.length === 1) {
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const dx = curX - this.touchStartX;
        const dy = curY - this.touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Instant turn as soon as finger moves past threshold
        if (Math.max(absX, absY) >= this.touchMinDistance) {
          if (absX > absY) {
            this.onDirectionChange(dx > 0 ? { x: 1, y: 0, name: 'RIGHT' } : { x: -1, y: 0, name: 'LEFT' });
          } else {
            this.onDirectionChange(dy > 0 ? { x: 0, y: 1, name: 'DOWN' } : { x: 0, y: -1, name: 'UP' });
          }
          // Reset coordinates for seamless continuous chained turns
          this.touchStartX = curX;
          this.touchStartY = curY;
          this.touchTriggered = true;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (this.touchTriggered || e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - this.touchStartX;
      const dy = touchEndY - this.touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) >= this.touchMinDistance) {
        if (absX > absY) {
          this.onDirectionChange(dx > 0 ? { x: 1, y: 0, name: 'RIGHT' } : { x: -1, y: 0, name: 'LEFT' });
        } else {
          this.onDirectionChange(dy > 0 ? { x: 0, y: 1, name: 'DOWN' } : { x: 0, y: -1, name: 'UP' });
        }
      }
    }, { passive: true });
  }

  initDpad() {
    const bindBtn = (id, dir) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      const trigger = (e) => {
        if (e.cancelable) e.preventDefault();
        if (window.audioManager) window.audioManager.initContext();
        btn.classList.add('pressed');
        this.onDirectionChange(dir);
        if (window.propsManager) window.propsManager.onDpadPress(dir);
        setTimeout(() => btn.classList.remove('pressed'), 120);
      };

      // Pointerdown provides fastest response for touch & click
      btn.addEventListener('pointerdown', trigger);
    };

    bindBtn('btnDpadUp', { x: 0, y: -1, name: 'UP' });
    bindBtn('btnDpadDown', { x: 0, y: 1, name: 'DOWN' });
    bindBtn('btnDpadLeft', { x: -1, y: 0, name: 'LEFT' });
    bindBtn('btnDpadRight', { x: 1, y: 0, name: 'RIGHT' });
  }
}

window.ControlsManager = ControlsManager;


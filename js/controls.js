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
    this.touchMinDistance = 25; // minimum swipe distance in pixels

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
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      // Prevent scrolling while playing inside canvas
      if (e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - this.touchStartX;
      const dy = touchEndY - this.touchStartY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < this.touchMinDistance) {
        return; // tap, not swipe
      }

      if (absX > absY) {
        // Horizontal swipe
        if (dx > 0) {
          this.onDirectionChange({ x: 1, y: 0, name: 'RIGHT' });
        } else {
          this.onDirectionChange({ x: -1, y: 0, name: 'LEFT' });
        }
      } else {
        // Vertical swipe
        if (dy > 0) {
          this.onDirectionChange({ x: 0, y: 1, name: 'DOWN' });
        } else {
          this.onDirectionChange({ x: 0, y: -1, name: 'UP' });
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


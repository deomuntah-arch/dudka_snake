/**
 * DUDKA SNAKE — Props & Characters Manager
 * Displays random meme characters from assets/images/props on free screen areas:
 * - Mobile: left & right of virtual D-Pad (touch-safe, non-intrusive)
 * - Desktop: side cheerleaders on the wide margins left & right of the game field
 */

class PropsManager {
  constructor() {
    this.characters = [
      { id: 'frog', name: 'Жабка', src: 'assets/images/props/frog.png', phrase: 'Дмухай ще! 💨' },
      { id: 'frog2', name: 'Жабка 2', src: 'assets/images/props/frog2.png', phrase: 'На стилі 😎' },
      { id: 'goblin', name: 'Гоблін', src: 'assets/images/props/goblin.png', phrase: 'Дай тягу! 😈' },
      { id: 'jesus', name: 'Ісус', src: 'assets/images/props/jesus.png', phrase: 'Благословенний пар 🙏' },
      { id: 'joker', name: 'Джокер', src: 'assets/images/props/joker.png', phrase: 'Чому такий серйозний? 🃏' },
      { id: 'yoda', name: 'Йода', src: 'assets/images/props/yoda.png', phrase: 'Сила дудки з тобою 🧙‍♂️' },
      { id: 'dido', name: 'Шеф', src: 'assets/images/props/dido.png', phrase: 'Дудочку замовляєм! 💨' },
      { id: 'anime1', name: 'Ґріфіт', src: 'assets/images/props/anime1.png', phrase: 'Справжній друг - сопілка! 💨' }


    ];

    this.mobileLeftEl = document.getElementById('dpadPropLeft');
    this.mobileRightEl = document.getElementById('dpadPropRight');
    this.desktopLeftEl = document.getElementById('desktopPropsLeft');
    this.desktopRightEl = document.getElementById('desktopPropsRight');
    this.dpadCenterEl = document.getElementById('dpadCenter');

    this.autonomousTimer = null;
    this.init();
  }

  init() {
    this.shuffleProps();
    this.startAutonomousHops();
  }

  getRandomCharacters(count) {
    const shuffled = [...this.characters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  shuffleProps() {
    // Pick unique characters for mobile and desktop slots
    const picked = this.getRandomCharacters(6);

    // Mobile: 2 characters (left and right of D-pad)
    const mobileLeft = picked[0];
    const mobileRight = picked[1];

    // Desktop: 2 on left, 2 on right
    const desktopLeft = [picked[2], picked[3]];
    const desktopRight = [picked[4], picked[5]];

    this.renderMobileProps(mobileLeft, mobileRight);
    this.renderDesktopProps(desktopLeft, desktopRight);
  }

  renderMobileProps(leftChar, rightChar) {
    if (this.mobileLeftEl && leftChar) {
      this.mobileLeftEl.innerHTML = `
        <div class="prop-img-wrap" data-prop-id="${leftChar.id}">
          <img src="${leftChar.src}" alt="${leftChar.name}" class="prop-img" loading="lazy" />
          <div class="prop-pedestal"></div>
        </div>
      `;
    }

    if (this.mobileRightEl && rightChar) {
      this.mobileRightEl.innerHTML = `
        <div class="prop-img-wrap" data-prop-id="${rightChar.id}">
          <img src="${rightChar.src}" alt="${rightChar.name}" class="prop-img" loading="lazy" />
          <div class="prop-pedestal"></div>
        </div>
      `;
    }
  }

  renderDesktopProps(leftChars, rightChars) {
    if (this.desktopLeftEl && leftChars) {
      this.desktopLeftEl.innerHTML = leftChars.map((char, index) => `
        <div class="desktop-prop-card desktop-prop-left-${index}" data-prop-id="${char.id}">
          <div class="desktop-prop-speech">${char.phrase}</div>
          <div class="prop-img-wrap">
            <img src="${char.src}" alt="${char.name}" class="desktop-prop-img" loading="lazy" />
            <div class="prop-pedestal desktop-pedestal"></div>
          </div>
        </div>
      `).join('');

      this.desktopLeftEl.querySelectorAll('.desktop-prop-card').forEach(card => {
        card.addEventListener('click', () => this.handlePropClick(card));
      });
    }

    if (this.desktopRightEl && rightChars) {
      this.desktopRightEl.innerHTML = rightChars.map((char, index) => `
        <div class="desktop-prop-card desktop-prop-right-${index}" data-prop-id="${char.id}">
          <div class="desktop-prop-speech">${char.phrase}</div>
          <div class="prop-img-wrap">
            <img src="${char.src}" alt="${char.name}" class="desktop-prop-img" loading="lazy" />
            <div class="prop-pedestal desktop-pedestal"></div>
          </div>
        </div>
      `).join('');

      this.desktopRightEl.querySelectorAll('.desktop-prop-card').forEach(card => {
        card.addEventListener('click', () => this.handlePropClick(card));
      });
    }
  }

  handlePropClick(card) {
    const wrap = card.querySelector('.prop-img-wrap');
    if (wrap) {
      wrap.classList.remove('prop-hop');
      void wrap.offsetWidth; // force CSS reflow
      wrap.classList.add('prop-hop');
    }

    const speech = card.querySelector('.desktop-prop-speech');
    if (speech) {
      speech.style.opacity = '1';
      speech.style.transform = 'translateY(0)';
      setTimeout(() => {
        speech.style.opacity = '';
        speech.style.transform = '';
      }, 1800);
    }

    if (window.audioManager && window.audioManager.playPop) {
      window.audioManager.playPop();
    }
  }

  onFoodEaten() {
    // When the snake eats a vape, all visible characters cheer with a hop!
    document.querySelectorAll('.prop-img-wrap').forEach(wrap => {
      wrap.classList.remove('prop-hop');
      void wrap.offsetWidth;
      wrap.classList.add('prop-hop');
    });

    if (this.dpadCenterEl) {
      this.dpadCenterEl.classList.remove('puff');
      void this.dpadCenterEl.offsetWidth;
      this.dpadCenterEl.classList.add('puff');
    }
  }

  onDpadPress() {
    if (this.dpadCenterEl) {
      this.dpadCenterEl.classList.add('puff');
      setTimeout(() => {
        if (this.dpadCenterEl) this.dpadCenterEl.classList.remove('puff');
      }, 120);
    }
  }

  onGameOver() {
    document.querySelectorAll('.prop-img-wrap').forEach(wrap => {
      wrap.classList.remove('prop-hop', 'prop-victory');
      wrap.classList.add('prop-shock');
      setTimeout(() => wrap.classList.remove('prop-shock'), 1200);
    });
  }

  onVictory() {
    document.querySelectorAll('.prop-img-wrap').forEach(wrap => {
      wrap.classList.remove('prop-hop', 'prop-shock');
      wrap.classList.add('prop-victory');
    });
  }

  onGameStart() {
    document.querySelectorAll('.prop-img-wrap').forEach(wrap => {
      wrap.classList.remove('prop-victory', 'prop-shock', 'prop-hop');
    });
    this.shuffleProps();
  }

  startAutonomousHops() {
    if (this.autonomousTimer) clearInterval(this.autonomousTimer);
    // Periodically pick a random displayed character to jump
    this.autonomousTimer = setInterval(() => {
      const wraps = document.querySelectorAll('.prop-img-wrap');
      if (wraps.length === 0) return;
      const randomWrap = wraps[Math.floor(Math.random() * wraps.length)];
      if (randomWrap && !randomWrap.classList.contains('prop-victory')) {
        randomWrap.classList.remove('prop-hop');
        void randomWrap.offsetWidth;
        randomWrap.classList.add('prop-hop');
      }
    }, 7000 + Math.random() * 5000);
  }
}

// Global instance initialized on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.propsManager = new PropsManager();
});


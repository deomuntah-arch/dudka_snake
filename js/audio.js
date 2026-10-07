/**
 * DUDKA SNAKE — Audio Manager
 * Provides procedural Web Audio synthesis for sound effects,
 * plus background music playback with automatic random track selection.
 */

// Список треків: автоматично включає ваші завантажені треки!
const DEFAULT_MUSIC_TRACKS = [
  'assets/audio/music/audio.mp3',
  'assets/audio/music/audio2.mp3',
  'assets/audio/music/audio3.mp3',
  'assets/audio/music/audio4.mp3',
  'assets/audio/music/audio5.mp3',
  'assets/audio/music/chill_vape_beat.wav'
];

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.musicEnabled = true;

    // Load saved preferences if any
    const savedSound = localStorage.getItem('dudka_sound');
    if (savedSound !== null) this.soundEnabled = (savedSound === 'true');

    const savedMusic = localStorage.getItem('dudka_music');
    if (savedMusic !== null) this.musicEnabled = (savedMusic === 'true');

    // Music playlist
    this.musicTracks = [...DEFAULT_MUSIC_TRACKS];
    this.currentTrackIndex = -1;
    this.bgMusicAudio = new Audio();
    this.bgMusicAudio.volume = 0.5;

    // Sound effects files
    this.audioFiles = {
      pop: new Audio('assets/audio/pop.wav'),
      gameover: new Audio('assets/audio/gameover.wav'),
      win: new Audio('assets/audio/win.wav')
    };

    // When track ends, automatically play next random track
    this.bgMusicAudio.addEventListener('ended', () => {
      this.playRandomTrack();
    });

    // Also attempt to load playlist.json (if on web server)
    this.loadPlaylistFromJson();
  }

  // Ensure AudioContext is initialized on user interaction
  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Load tracks from playlist.json if available (for HTTP servers)
   */
  async loadPlaylistFromJson() {
    try {
      const res = await fetch('assets/audio/music/playlist.json');
      if (res.ok) {
        const jsonList = await res.json();
        if (Array.isArray(jsonList) && jsonList.length > 0) {
          const formatted = jsonList.map(item => {
            return item.startsWith('assets/') ? item : `assets/audio/music/${item}`;
          });
          // Merge unique tracks
          const trackSet = new Set([...this.musicTracks, ...formatted]);
          this.musicTracks = Array.from(trackSet);
        }
      }
    } catch (e) {
      // Quiet fallback when opening via file:///
    }
  }

  /**
   * Play a random track on demand (called on each game start)
   */
  playRandomTrack() {
    this.initContext();
    if (!this.musicTracks || this.musicTracks.length === 0) return;

    let nextIndex;
    if (this.musicTracks.length === 1) {
      nextIndex = 0;
    } else {
      // Pick a random track different from the current one
      do {
        nextIndex = Math.floor(Math.random() * this.musicTracks.length);
      } while (nextIndex === this.currentTrackIndex && this.musicTracks.length > 1);
    }

    this.currentTrackIndex = nextIndex;
    const trackUrl = this.musicTracks[this.currentTrackIndex];

    console.log(`🎵 [Музика] Вмикається випадковий трек (${this.currentTrackIndex + 1}/${this.musicTracks.length}):`, trackUrl);

    try {
      this.bgMusicAudio.pause();
      this.bgMusicAudio.currentTime = 0;
      this.bgMusicAudio.src = trackUrl;
      this.bgMusicAudio.loop = (this.musicTracks.length === 1);

      if (this.musicEnabled) {
        const playPromise = this.bgMusicAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Автоплей аудіо обмежено браузером до взаємодії:', err);
          });
        }
      }
    } catch (err) {
      console.warn('Помилка відтворення аудіо:', err);
    }
  }

  startMusic() {
    if (!this.musicEnabled) return;
    this.initContext();

    if (this.currentTrackIndex === -1 || !this.bgMusicAudio.src) {
      this.playRandomTrack();
    } else {
      const playPromise = this.bgMusicAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => this.playRandomTrack());
      }
    }
  }

  stopMusic() {
    if (this.bgMusicAudio) {
      this.bgMusicAudio.pause();
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('dudka_music', this.musicEnabled);
    if (this.musicEnabled) {
      this.playRandomTrack();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('dudka_sound', this.soundEnabled);
    if (this.soundEnabled) {
      this.playPop();
    }
    return this.soundEnabled;
  }

  /**
   * Sound FX: Special Event Chime (10% surprise)
   */
  playSpecial() {
    if (!this.soundEnabled) return;
    this.initContext();

    if (this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        // Two upbeat sparkly bells (G5 -> C6)
        [783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.28, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.29);
        });
        return;
      } catch (e) {}
    }
  }

  /**
   * Sound FX: "Pop" / "Чпок"
   */
  playPop() {
    if (!this.soundEnabled) return;
    this.initContext();

    if (this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
        return;
      } catch (e) {}
    }

    try {
      const snd = this.audioFiles.pop.cloneNode();
      snd.volume = 0.5;
      snd.play().catch(() => {});
    } catch (e) {}
  }

  /**
   * Sound FX: Game Over
   */
  playGameOver() {
    if (!this.soundEnabled) return;
    this.initContext();

    if (this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(293.66, now);
        osc.frequency.setValueAtTime(220.00, now + 0.2);
        osc.frequency.setValueAtTime(146.83, now + 0.45);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.9);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.92);
        return;
      } catch (e) {}
    }

    try {
      const snd = this.audioFiles.gameover.cloneNode();
      snd.volume = 0.5;
      snd.play().catch(() => {});
    } catch (e) {}
  }

  /**
   * Sound FX: Victory fanfare!
   */
  playWin() {
    if (!this.soundEnabled) return;
    this.initContext();

    if (this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        const notes = [
          { f: 261.63, t: 0.00, d: 0.18 },
          { f: 329.63, t: 0.18, d: 0.18 },
          { f: 392.00, t: 0.36, d: 0.22 },
          { f: 523.25, t: 0.58, d: 0.80 },
          { f: 659.25, t: 0.70, d: 0.70 },
        ];

        notes.forEach(({ f, t, d }) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0.25, now + t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + t);
          osc.stop(now + t + d + 0.05);
        });
        return;
      } catch (e) {}
    }

    try {
      const snd = this.audioFiles.win.cloneNode();
      snd.volume = 0.6;
      snd.play().catch(() => {});
    } catch (e) {}
  }
}

// Global audio manager instance
window.audioManager = new AudioManager();

// Web Audio synthesis: SE + BGM (Korobeiniki — public domain folk melody)
(() => {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function noteToFreq(note) {
    const m = note.match(/^([A-G]#?)(\d)$/);
    if (!m) return null;
    const idx = NOTE_NAMES.indexOf(m[1]);
    if (idx < 0) return null;
    const oct = parseInt(m[2], 10);
    const midi = (oct + 1) * 12 + idx;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.seGain = null;
      this.bgmGain = null;
      this.seVolume = 0.55;
      this.bgmVolume = 0.32;
      this.seEnabled = true;
      this.bgmEnabled = true;
      this.bgmActive = false;
      this.bgmTimer = null;
      this.bgmNextTime = 0;
      this.bgmNodes = [];
      this.bgmTempo = 150;      // current BPM (interpolates toward target)
      this.bgmBaseTempo = 150;  // resting BPM
      this.bgmMaxTempo = 205;   // BPM at pinch = 1.0
      this.pinchIntensity = 0;  // 0..1 — game.js sets this each frame
      
      // BGM Tracks
      this.bgmTracks = {
        'phonk': 'TETRIS PHONK - smaher.mp3',
        'tetris99': 'Tetris 99 - Main Theme - SoundHub.mp3'
      };
      this.currentTrackId = localStorage.getItem('puyotetris_bgmTrack') || 'phonk';

      // Preload user's custom BGM
      this.bgmAudio = new Audio();
      this.bgmAudio.src = this._getTrackUrl(this.currentTrackId);
      this.bgmAudio.loop = true;
      this.bgmLoaded = false;
      this.bgmAudio.addEventListener('canplaythrough', () => {
        this.bgmLoaded = true;
      });
      this.bgmAudio.load();
    }

    _getTrackUrl(trackId) {
      if (trackId === 'random') {
        const keys = Object.keys(this.bgmTracks);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return this.bgmTracks[randomKey];
      }
      return this.bgmTracks[trackId] || this.bgmTracks['phonk'];
    }

    setPinchIntensity(v) {
      this.pinchIntensity = Math.max(0, Math.min(1, v || 0));
      if (this.bgmLoaded && this.bgmAudio) {
        // High pitch/tempo escalation during pinch (Tetris clutch style)
        this.bgmAudio.playbackRate = 1.0 + this.pinchIntensity * 0.20;
      }
    }

    ensure() {
      if (this.ctx) return;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = this.seVolume;
      this.seGain.connect(this.master);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmEnabled ? this.bgmVolume : 0;
      this.bgmGain.connect(this.master);
    }

    resume() {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    setSeVolume(v) {
      this.seVolume = v;
      if (this.seGain) this.seGain.gain.value = v;
    }
    setBgmVolume(v) {
      this.bgmVolume = v;
      if (this.bgmAudio) this.bgmAudio.volume = v;
      if (this.bgmGain && this.bgmEnabled) {
        const t = (this.ctx?.currentTime) ?? 0;
        this.bgmGain.gain.setTargetAtTime(v, t, 0.02);
      }
    }
    setSeEnabled(b) { this.seEnabled = b; }
    setBgmEnabled(b) {
      this.bgmEnabled = b;
      if (this.bgmAudio) {
        if (!b) this.bgmAudio.pause();
        else if (this.bgmActive) this.bgmAudio.play().catch(() => {});
      }
      if (!this.bgmGain) return;
      const t = this.ctx ? this.ctx.currentTime : 0;
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setTargetAtTime(b ? this.bgmVolume : 0, t, 0.02);
      if (!b) this.stopBGM();
      else if (!this.bgmActive) this.startBGM();
    }
    
    setBgmTrack(trackId) {
      if (trackId !== 'random' && !this.bgmTracks[trackId]) return;
      this.currentTrackId = trackId;
      localStorage.setItem('puyotetris_bgmTrack', trackId);
      if (this.bgmAudio) {
        const wasPlaying = this.bgmActive && !this.bgmAudio.paused;
        this.bgmAudio.src = this._getTrackUrl(trackId);
        this.bgmAudio.load();
        this.bgmLoaded = false;
        if (wasPlaying && this.bgmEnabled) {
          this.bgmAudio.play().catch(() => {});
        }
      }
    }

    // -------- SE --------
    playSE(type, arg) {
      if (!this.seEnabled) return;
      this.ensure();
      if (!this.ctx) return;
      switch (type) {
        case 'move':     return this._synth({ freqs:[880], dur:0.02, type: 'sine',   sweepTo: 440, vol: 0.15 });
        case 'rotate':   return this._synth({ freqs:[440], dur:0.04, type: 'square', sweepTo: 880, vol: 0.15 });
        case 'softDrop': return this._synth({ freqs:[300], dur:0.02, type: 'sine',   sweepTo: 150, vol: 0.1 });
        case 'hardDrop': return this._thump();
        case 'lock':     return this._synth({ freqs:[150, 220], dur:0.06, type: 'sawtooth', sweepTo: 100, vol: 0.2 });
        case 'hold':     return this._synth({ freqs:[660, 880], dur:0.06, type: 'triangle', sweepTo: 440, vol: 0.2 });
        case 'line1':    return this._chordArp([523, 659, 784],            0.03, 0.15, 'sawtooth', 0.15);
        case 'line2':    return this._chordArp([523, 659, 784, 988],       0.03, 0.20, 'sawtooth', 0.18);
        case 'line3':    return this._chordArp([523, 659, 784, 988, 1175], 0.03, 0.25, 'sawtooth', 0.20);
        case 'tetris':   return this._tetris();
        case 'tspin':    return this._tspinFx();
        case 'b2b':      return this._chordArp([880, 1175, 1568, 2093], 0.04, 0.3, 'sawtooth', 0.25);
        case 'combo':    return this._synth({ freqs:[880], dur:0.08, type: 'triangle', sweepTo: 1760, vol: 0.2 });
        case 'levelUp':  return this._chordArp([523, 659, 784, 1047, 1319], 0.05, 0.4, 'square', 0.25);
        case 'gameOver': return this._descend();
        case 'pause':    return this._synth({ freqs:[880, 1108], dur:0.1, type: 'sine', vol: 0.3 });
        case 'hit':      return this._synth({ freqs:[120], dur:0.04, type: 'sawtooth', sweepTo: 60, vol: 0.2 });
        case 'puyoMove':   return this._synth({ freqs:[600], dur:0.03, type: 'sine', sweepTo: 400, vol: 0.2 });
        case 'puyoRotate': return this._synth({ freqs:[400], dur:0.05, type: 'sine', sweepTo: 800, vol: 0.2 });
        case 'puyoPlace':  return this._synth({ freqs:[200], dur:0.06, type: 'triangle', sweepTo: 100, vol: 0.25 });
        case 'puyoPop':    return this._puyoPopFx();
        case 'puyoChain':  return this._puyoChainFx(arg);
        case 'danger':     return this._dangerAlarm();
        case 'allClear':   return this._allClearFanfare();
      }
    }

    _initNoise() {
      if (!this.ctx) return;
      if (this._noiseBuf) return;
      const sr = this.ctx.sampleRate;
      this._noiseBuf = this.ctx.createBuffer(1, sr * 2, sr);
      const data = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    _synth({ freqs, dur, type = 'square', vol = 0.3, sweepTo = null, attack = 0.005, decay = null }) {
      const t = this.ctx.currentTime;
      if (!Array.isArray(freqs)) freqs = [freqs];
      decay = decay || dur;
      
      freqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
        
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol / freqs.length, t + attack);
        g.gain.exponentialRampToValueAtTime(0.001, t + decay);
        
        osc.connect(g).connect(this.seGain);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      });
    }

    _chordArp(freqs, step, dur, type, vol) {
      const t0 = this.ctx.currentTime;
      freqs.forEach((f, i) => {
        const t = t0 + i * step;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g).connect(this.seGain);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
    }

    _thump() {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.8, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g).connect(this.seGain);
      osc.start(t); osc.stop(t + 0.2);

      this._initNoise();
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.25, t + 0.005);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      src.connect(ng).connect(this.seGain);
      src.start(t); src.stop(t + 0.1);
    }

    _tetris() {
      const t = this.ctx.currentTime;
      this._initNoise();
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.35, t + 0.01);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      src.connect(ng).connect(this.seGain);
      src.start(t); src.stop(t + 0.5);

      this._chordArp([659, 880, 1047, 1319, 1568, 2093], 0.04, 0.4, 'sawtooth', 0.2);
    }

    _tspinFx() {
      this._chordArp([523, 698, 880, 1175, 1568, 2093], 0.02, 0.3, 'square', 0.2);
    }

    _descend() {
      const seq = [659, 587, 523, 440, 392, 330, 262, 196];
      this._chordArp(seq, 0.1, 0.3, 'sawtooth', 0.2);
    }

    _dangerAlarm() {
      const t0 = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const t = t0 + i * 0.18;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(65, t + 0.14);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.18);
      }
      this._initNoise();
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.1, t0);
      ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      src.connect(ng).connect(this.seGain);
      src.start(t0); src.stop(t0 + 0.5);
    }

    _allClearFanfare() {
      const t0 = this.ctx.currentTime;
      const fanfare = [
        [523, 0.00], [659, 0.08], [784, 0.16], [1047, 0.24],
        [1319, 0.36], [1568, 0.44], [2093, 0.52]
      ];
      fanfare.forEach(([f, off]) => {
        const t = t0 + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.27);
      });
      [1047, 1319, 1568, 2093].forEach((f, i) => {
        const t = t0 + 0.6;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.82);
      });
    }

    startBGM() {
      if (!this.bgmEnabled) return;
      this.ensure();
      if (this.bgmActive) return;
      this.bgmActive = true;
      
      if (this.currentTrackId === 'random' && this.bgmAudio) {
        const url = this._getTrackUrl('random');
        if (!this.bgmAudio.src.endsWith(url)) {
          this.bgmAudio.src = url;
          this.bgmAudio.load();
          this.bgmLoaded = false;
        }
      }

      if (this.bgmLoaded && this.bgmAudio) {
        this.bgmAudio.play().catch(() => {});
      } else if (this.bgmAudio) {
        this.bgmAudio.addEventListener('canplaythrough', () => {
          if (this.bgmActive && this.bgmEnabled) this.bgmAudio.play().catch(() => {});
        }, { once: true });
      }
    }

    stopBGM() {
      this.bgmActive = false;
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
    }

    _puyoPopFx() {
      this._synth({ freqs:[600], dur:0.08, type: 'sine', sweepTo: 1200, vol: 0.3 });
    }

    _puyoChainFx(chain) {
      const idx = Math.min(6, Math.max(1, chain || 1)) - 1;
      const t0 = this.ctx.currentTime;

      // 1. Synth Arpeggio SFX (plays in the background)
      const baseFreq = 261.63 * Math.pow(1.059, (chain || 1) * 2);
      const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
      freqs.forEach((f, i) => {
        const t = t0 + i * 0.06;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.35, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.2);
      });

      // 2. High Quality Speech Synthesis Voice!
      const spells = [
        "ファイヤー！",
        "アイスストーム！",
        "ダイヤキュート！",
        "ブレインダムド！",
        "ジュゲム！",
        "ばよえ〜ん！"
      ];
      const spellText = spells[idx];
      if ('speechSynthesis' in window && this.seEnabled) {
        // Prevent voice playback if the game is paused
        if (window.paused) {
          window.speechSynthesis.cancel();
          return;
        }
        const uttr = new SpeechSynthesisUtterance(spellText);
        uttr.lang = 'ja-JP';
        uttr.pitch = 1.7; // Cute, high-pitched anime voice style
        uttr.rate = 1.4;  // Energetic fast speech
        uttr.volume = this.seVolume;
        window.speechSynthesis.cancel(); // Interrupt current spell for instant response
        window.speechSynthesis.speak(uttr);
      }
    }
  }

  window.audio = new AudioEngine();
})();

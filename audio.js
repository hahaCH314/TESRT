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
      
      // Preload high-quality EDM/Orchestra BGM
      this.bgmAudio = new Audio();
      this.bgmAudio.src = 'https://raw.githubusercontent.com/llop/classic-tetris-js/master/assets/audio/korobeiniki.mp3';
      this.bgmAudio.loop = true;
      this.bgmAudio.crossOrigin = 'anonymous';
      this.bgmLoaded = false;
      this.bgmAudio.addEventListener('canplaythrough', () => {
        this.bgmLoaded = true;
      });
      this.bgmAudio.load();
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

    // -------- SE --------
    playSE(type, arg) {
      if (!this.seEnabled) return;
      this.ensure();
      if (!this.ctx) return;
      switch (type) {
        case 'move':     return this._tone({ freq: 220, dur: 0.04, type: 'square',   vol: 0.30 });
        case 'rotate':   return this._tone({ freq: 440, dur: 0.06, type: 'square',   vol: 0.35, sweepTo: 660 });
        case 'softDrop': return this._tone({ freq: 180, dur: 0.025,type: 'square',   vol: 0.18 });
        case 'hardDrop': return this._thump();
        case 'lock':     return this._tone({ freq: 130, dur: 0.05, type: 'square',   vol: 0.30 });
        case 'hold':     return this._tone({ freq: 520, dur: 0.08, type: 'triangle', vol: 0.40, sweepTo: 740 });
        case 'line1':    return this._arp([523, 659, 784],            0.05, 0.42);
        case 'line2':    return this._arp([523, 659, 784, 988],       0.05, 0.45);
        case 'line3':    return this._arp([523, 659, 784, 988, 1175], 0.05, 0.48);
        case 'tetris':   return this._tetris();
        case 'tspin':    return this._tspinFx();
        case 'b2b':      return this._arp([880, 1175, 1568], 0.06, 0.5);
        case 'combo':    return this._tone({ freq: 880, dur: 0.07, type: 'triangle', vol: 0.42, sweepTo: 1320 });
        case 'levelUp':  return this._arp([523, 659, 784, 1047, 1319], 0.08, 0.5);
        case 'gameOver': return this._descend();
        case 'pause':    return this._tone({ freq: 660, dur: 0.10, type: 'sine',     vol: 0.35 });
        case 'hit':      return this._tone({ freq: 120, dur: 0.04, type: 'sawtooth', vol: 0.25 });
        case 'puyoMove':   return this._tone({ freq: 280, dur: 0.04, type: 'triangle', vol: 0.30 });
        case 'puyoRotate': return this._tone({ freq: 380, dur: 0.06, type: 'triangle', vol: 0.35, sweepTo: 520 });
        case 'puyoPlace':  return this._tone({ freq: 150, dur: 0.05, type: 'sine',     vol: 0.40 });
        case 'puyoPop':    return this._puyoPopFx();
        case 'puyoChain':  return this._puyoChainFx(arg);
        case 'danger':     return this._dangerAlarm();
        case 'allClear':   return this._allClearFanfare();
      }
    }

    _tone({ freq, dur, type = 'square', vol = 0.3, sweepTo = null }) {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(this.seGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    _arp(freqs, step, vol) {
      const t0 = this.ctx.currentTime;
      freqs.forEach((f, i) => {
        const t = t0 + i * step;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 1.5);
        osc.connect(g).connect(this.seGain);
        osc.start(t);
        osc.stop(t + step * 1.6);
      });
    }

    _thump() {
      const t = this.ctx.currentTime;
      // sub thump
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g).connect(this.seGain);
      osc.start(t); osc.stop(t + 0.2);
      // noise burst
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 0.08, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const ng = this.ctx.createGain();
      ng.gain.value = 0.32;
      src.connect(ng).connect(this.seGain);
      src.start(t);
    }

    _tetris() {
      const seq = [
        [659, 0.00], [784, 0.06], [988, 0.12], [1319, 0.18],
        [988, 0.30], [1319, 0.36], [1568, 0.42],
      ];
      const t0 = this.ctx.currentTime;
      seq.forEach(([f, off]) => {
        const t = t0 + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.2);
      });
      // sustained chord
      [659, 988, 1319].forEach(f => {
        const t = t0 + 0.48;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0, t);
        g.gain.linearRampToValueAtTime(0.28, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.52);
      });
    }

    _tspinFx() {
      const t0 = this.ctx.currentTime;
      [523, 698, 880, 1175, 1568].forEach((f, i) => {
        const t = t0 + i * 0.05;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.4, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.27);
      });
    }

    _descend() {
      const seq = [659, 587, 523, 440, 392, 330, 262, 196];
      const t0 = this.ctx.currentTime;
      seq.forEach((f, i) => {
        const t = t0 + i * 0.13;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.4, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.2);
      });
    }
    _dangerAlarm() {
      const t0 = this.ctx.currentTime;
      // Ominous low alarm pulse
      for (let i = 0; i < 3; i++) {
        const t = t0 + i * 0.18;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(65, t + 0.14);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.18);
      }
      // Rumble noise bed
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 0.5, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.3;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const ng = this.ctx.createGain();
      ng.gain.value = 0.2;
      src.connect(ng).connect(this.seGain);
      src.start(t0);
    }

    _allClearFanfare() {
      const t0 = this.ctx.currentTime;
      // Triumphant ascending brass hits
      const fanfare = [
        [523, 0.00], [659, 0.08], [784, 0.16], [1047, 0.24],
        [1319, 0.36], [1568, 0.44], [2093, 0.52]
      ];
      fanfare.forEach(([f, off]) => {
        const t = t0 + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.45, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.27);
      });
      // Sustained triumph chord
      [1047, 1319, 1568, 2093].forEach(f => {
        const t = t0 + 0.6;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.35, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(g).connect(this.seGain);
        osc.start(t); osc.stop(t + 0.82);
      });
    }

    // -------- BGM: Korobeiniki (public domain Russian folk melody, original arrangement) --------
    startBGM() {
      if (!this.bgmEnabled) return;
      this.ensure();
      if (this.bgmActive) return;
      this.bgmActive = true;
      
      const t = this.ctx ? this.ctx.currentTime : 0;
      if (this.bgmGain) {
        this.bgmGain.gain.cancelScheduledValues(t);
        this.bgmGain.gain.setTargetAtTime(this.bgmVolume, t, 0.02);
      }

      if (this.bgmLoaded && this.bgmAudio) {
        this.bgmAudio.volume = this.bgmVolume;
        this.bgmAudio.play().catch(e => {
          this.bgmLoaded = false;
          this.bgmNextTime = t + 0.12;
          this._scheduleBGM();
        });
      } else {
        this.bgmNextTime = t + 0.12;
        this._scheduleBGM();
      }
    }

    stopBGM() {
      this.bgmActive = false;
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      }
      if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
      for (const n of this.bgmNodes) {
        try { n.osc.stop(); } catch {}
        try { n.osc.disconnect(); n.g.disconnect(); } catch {}
      }
      this.bgmNodes = [];
    }

    _scheduleBGM() {
      if (!this.bgmActive || !this.ctx) return;

      // Ease tempo toward the target (driven by pinchIntensity) at the top of
      // every phrase. 60% previous + 40% new gives a noticeable but non-jarring
      // step every ~12 seconds, so BPM feels like it's swelling under pressure.
      const targetTempo = this.bgmBaseTempo + (this.bgmMaxTempo - this.bgmBaseTempo) * this.pinchIntensity;
      this.bgmTempo = this.bgmTempo * 0.6 + targetTempo * 0.4;
      const N = 60 / this.bgmTempo / 2; // duration of one 8th note in seconds
      const I = this.pinchIntensity;

      // Korobeiniki — 8 bars, each bar = 8 eighth notes
      const MELODY = [
        ['E5',2],['B4',1],['C5',1],['D5',2],['C5',1],['B4',1],
        ['A4',2],['A4',1],['C5',1],['E5',2],['D5',1],['C5',1],
        ['B4',3],['C5',1],['D5',2],['E5',2],
        ['C5',2],['A4',2],['A4',2],[null,2],
        ['D5',2],[null,1],['F5',1],['A5',2],['G5',1],['F5',1],
        ['E5',3],['C5',1],['E5',2],['D5',1],['C5',1],
        ['B4',3],['C5',1],['D5',2],['E5',2],
        ['C5',2],['A4',2],['A4',2],[null,2],
      ];
      const BASS = [
        ['E2',4],['B2',4],
        ['A2',4],['E2',4],
        ['G2',4],['B2',4],
        ['A2',4],['E2',4],
        ['D2',4],['F2',4],
        ['C2',4],['A2',4],
        ['G2',4],['B2',4],
        ['A2',4],['E2',4],
      ];
      const KICK_PER_BAR = 4;
      const BARS = 8;

      // Lead voice: pitch stays the same but tone gets sharper (sawtooth
      // layer) as pinch rises so the melody bites through harder mixes.
      let t = this.bgmNextTime;
      const melodyStart = t;
      MELODY.forEach(([note, dur]) => {
        if (note) {
          this._scheduleNote(note, t, dur * N * 0.94, 'square', 0.18);
          if (I > 0.45) {
            // Detuned sawtooth doubler — hardstyle-ish lead reinforcement
            this._scheduleNote(note, t, dur * N * 0.90, 'sawtooth', 0.06 * I);
          }
        }
        t += dur * N;
      });
      const melodyEnd = t;

      // Bass: triangle stays; add sawtooth sub layer when things get tense.
      let tb = melodyStart;
      BASS.forEach(([note, dur]) => {
        if (note) {
          this._scheduleNote(note, tb, dur * N * 0.92, 'triangle', 0.22);
          if (I > 0.35) this._scheduleNote(note, tb, dur * N * 0.90, 'sawtooth', 0.08 + 0.10 * I);
        }
        tb += dur * N;
      });

      // Kick drum: always on every quarter; gains punch and adds offbeat
      // "double kick" pattern under high pinch.
      const kickVol = 0.22 + 0.15 * I;
      for (let bar = 0; bar < BARS; bar++) {
        for (let beat = 0; beat < KICK_PER_BAR; beat++) {
          const kt = melodyStart + (bar * 8 + beat * 2) * N;
          this._scheduleKick(kt, kickVol);
        }
        if (I > 0.75) {
          // hardstyle-ish double kick on the offbeat 8ths
          for (let beat = 0; beat < KICK_PER_BAR; beat++) {
            const kt = melodyStart + (bar * 8 + beat * 2 + 1) * N;
            this._scheduleKick(kt, kickVol * 0.7);
          }
        }
      }

      // Snare on the backbeats (2 and 4) once pinch crosses ~25%.
      if (I > 0.25) {
        for (let bar = 0; bar < BARS; bar++) {
          this._scheduleSnare(melodyStart + (bar * 8 + 2) * N, I);
          this._scheduleSnare(melodyStart + (bar * 8 + 6) * N, I);
        }
      }

      // Hi-hat 8th notes past ~50% pinch.
      if (I > 0.5) {
        for (let bar = 0; bar < BARS; bar++) {
          for (let s = 0; s < 8; s++) {
            const ht = melodyStart + (bar * 8 + s) * N;
            this._scheduleHat(ht, I, s % 2 === 1); // slight accent on offbeats
          }
        }
      }

      this.bgmNextTime = melodyEnd;
      const now = this.ctx.currentTime;
      this.bgmNodes = this.bgmNodes.filter(n => n.stopAt > now);

      const lead = (melodyEnd - now - 0.25) * 1000;
      this.bgmTimer = setTimeout(() => this._scheduleBGM(), Math.max(60, lead));
    }

    _scheduleNote(note, time, dur, type, vol) {
      const freq = noteToFreq(note);
      if (!freq) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(vol, time + 0.008);
      g.gain.setValueAtTime(vol, time + Math.max(0.02, dur - 0.03));
      g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
      osc.connect(g).connect(this.bgmGain);
      osc.start(time);
      const stopAt = time + dur + 0.02;
      osc.stop(stopAt);
      this.bgmNodes.push({ osc, g, stopAt });
    }

    _scheduleKick(time, vol = 0.22) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);
      g.gain.setValueAtTime(0.0, time);
      g.gain.linearRampToValueAtTime(vol, time + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.10);
      osc.connect(g).connect(this.bgmGain);
      osc.start(time);
      const stopAt = time + 0.12;
      osc.stop(stopAt);
      this.bgmNodes.push({ osc, g, stopAt });
    }

    _scheduleSnare(time, intensity) {
      const sr = this.ctx.sampleRate;
      const dur = 0.09;
      const buf = this.ctx.createBuffer(1, Math.floor(sr * dur), sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 2);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600;
      bp.Q.value = 0.7;
      const g = this.ctx.createGain();
      const vol = 0.10 + 0.14 * intensity;
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      src.connect(bp); bp.connect(g); g.connect(this.bgmGain);
      src.start(time);
      const stopAt = time + dur + 0.02;
      this.bgmNodes.push({ osc: src, g, stopAt });
    }

    _scheduleHat(time, intensity, accent) {
      const sr = this.ctx.sampleRate;
      const dur = accent ? 0.045 : 0.028;
      const buf = this.ctx.createBuffer(1, Math.floor(sr * dur), sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7500;
      const g = this.ctx.createGain();
      const vol = (accent ? 0.055 : 0.035) * (0.6 + intensity);
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      src.connect(hp); hp.connect(g); g.connect(this.bgmGain);
      src.start(time);
      const stopAt = time + dur + 0.02;
      this.bgmNodes.push({ osc: src, g, stopAt });
    }

    _puyoPopFx() {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.38, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(g).connect(this.seGain);
      osc.start(t); osc.stop(t + 0.1);
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

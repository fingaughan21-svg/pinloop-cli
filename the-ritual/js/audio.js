// All sound is synthesised with WebAudio: no audio files to load.
(function (RT) {
  const A = {
    ctx: null, master: null, volume: 0.8,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = this.volume;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(ctx.destination);
      // noise buffers
      const len = ctx.sampleRate * 2;
      this.white = ctx.createBuffer(1, len, ctx.sampleRate);
      const w = this.white.getChannelData(0);
      for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
      this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
      const b = this.brown.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
      this.reverb = this.makeReverb();
      this.startBeds();
    },
    setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; },
    makeReverb() {
      const ctx = this.ctx, len = ctx.sampleRate * 2.2;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const conv = ctx.createConvolver(); conv.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.35; conv.connect(g); g.connect(this.master);
      return conv;
    },
    noise(type = 'white', loop = false) {
      const s = this.ctx.createBufferSource(); s.buffer = type === 'brown' ? this.brown : this.white; s.loop = loop;
      if (loop) s.loopStart = Math.random(); return s;
    },
    out(node, wet = 0.3) { node.connect(this.master); if (wet > 0) { const g = this.ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(this.reverb); } },

    startBeds() {
      const ctx = this.ctx;
      // house drone
      this.drone = ctx.createGain(); this.drone.gain.value = 0.0; this.out(this.drone, 0.2);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(this.drone);
      for (const f of [41.2, 61.7, 82.9]) { const o = ctx.createOscillator(); o.frequency.value = f; o.type = 'sawtooth'; const g = ctx.createGain(); g.gain.value = 0.12; o.connect(g); g.connect(lp); o.start(); }
      const rn = this.noise('brown', true); const rg = ctx.createGain(); rg.gain.value = 0.5; rn.connect(rg); rg.connect(lp); rn.start();
      // wind (open door)
      this.wind = ctx.createGain(); this.wind.gain.value = 0; this.out(this.wind, 0.4);
      const wn = this.noise('white', true); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.8;
      wn.connect(bp); bp.connect(this.wind); wn.start();
      this.windFilter = bp;
      // whispers: noise through moving formant filters, gated into syllables, panned
      this.whisper = ctx.createGain(); this.whisper.gain.value = 0;
      this.whisperPan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      this.whisper.connect(this.whisperPan); this.out(this.whisperPan, 0.6);
      this.formants = [];
      const wsrc = this.noise('white', true); wsrc.start();
      for (let i = 0; i < 3; i++) {
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 9; f.frequency.value = 800 + i * 900;
        const gate = ctx.createGain(); gate.gain.value = 0;
        wsrc.connect(f); f.connect(gate); gate.connect(this.whisper);
        this.formants.push({ f, gate, next: 0 });
      }
      // salt pour
      this.saltG = ctx.createGain(); this.saltG.gain.value = 0; this.out(this.saltG, 0.1);
      const sn = this.noise('white', true); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
      sn.connect(hp); hp.connect(this.saltG); sn.start();
      this.hbNext = 0;
    },

    // continuous parameters, called every frame
    update(dt, s) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const ramp = (param, v, tc = 0.15) => param.setTargetAtTime(v, now, tc);
      ramp(this.drone.gain, s.drone ?? 0.25, 0.5);
      ramp(this.wind.gain, s.wind || 0, 0.4);
      this.windFilter.frequency.setTargetAtTime(400 + Math.random() * 400, now, 0.3);
      ramp(this.whisper.gain, (s.whisper || 0) * 1.6, 0.25);
      if (this.whisperPan.pan) ramp(this.whisperPan.pan, s.whisperPan || 0, 0.2);
      for (const fm of this.formants) {
        if (now > fm.next) {
          fm.next = now + 0.06 + Math.random() * 0.22;
          fm.f.frequency.setTargetAtTime(500 + Math.random() * 3200, now, 0.03);
          const on = Math.random() < 0.6;
          fm.gate.gain.setTargetAtTime(on ? 0.4 + Math.random() * 0.6 : 0, now, 0.02);
        }
      }
      ramp(this.saltG.gain, s.salt ? 0.15 : 0, 0.05);
      // heartbeat
      if ((s.heart || 0) > 0.05 && now > this.hbNext) {
        const bpm = 60 + s.heart * 90;
        this.hbNext = now + 60 / bpm;
        this.thump(now, 0.5 * s.heart); this.thump(now + 0.16, 0.35 * s.heart);
      }
    },
    thump(t, v) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.15);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); this.out(g, 0); o.start(t); o.stop(t + 0.25);
    },
    burst({ freq = 800, type = 'lowpass', q = 1, dur = 0.1, vol = 0.5, wet = 0.3, attack = 0.002, src = 'white' }) {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const n = this.noise(src), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      n.connect(f); f.connect(g); this.out(g, wet); n.start(t, Math.random()); n.stop(t + dur + 0.05);
    },
    tone(freq, dur, vol, type = 'sine', wet = 0.3, glide) {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); this.out(g, wet); o.start(t); o.stop(t + dur + 0.05);
    },

    // ---- level 2 ----
    ding(n = 1) { for (let i = 0; i < n; i++) setTimeout(() => { this.tone(1318, 1.2, 0.18, 'sine', 0.4); this.tone(1046, 1.4, 0.14, 'sine', 0.4); }, i * 260); },
    doorSlide() { this.burst({ freq: 300, type: 'lowpass', dur: 1.3, vol: 0.25, attack: 0.2, wet: 0.2, src: 'brown' }); this.tone(70, 1.2, 0.08, 'sawtooth', 0.1); },
    breath() { for (let i = 0; i < 3; i++) setTimeout(() => this.burst({ freq: 700, type: 'bandpass', q: 0.8, dur: 0.5, vol: 0.18, attack: 0.15, wet: 0.1 }), i * 650); },
    gasp() { this.burst({ freq: 1200, type: 'bandpass', q: 1.5, dur: 0.35, vol: 0.3, attack: 0.02, wet: 0.3 }); },
    giggle() { for (let i = 0; i < 5; i++) setTimeout(() => this.tone(700 + Math.random() * 300, 0.12, 0.05, 'triangle', 0.7, 500), i * 140); },
    thud() { this.tone(50, 0.6, 0.5, 'sine', 0.5, 30); this.burst({ freq: 150, dur: 0.4, vol: 0.4, wet: 0.5, src: 'brown' }); },
    setHum(v) {
      if (!this.ctx) return;
      if (!this.hum) {
        const ctx = this.ctx; this.hum = ctx.createGain(); this.hum.gain.value = 0; this.out(this.hum, 0.1);
        for (const f of [50, 100, 150.5]) { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.25 / (f / 50); o.connect(g); g.connect(this.hum); o.start(); }
      }
      this.hum.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
    },
    // a cheap, slightly broken music box: elevator music for the end of the world
    music(on, detune = 0) {
      this.musicOn = on; this.musicDetune = detune;
      if (!on || this.musicTimer) return;
      const melody = [0, 4, 7, 12, 11, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, -1];
      let i = 0;
      const tick = () => {
        if (!this.musicOn || !this.ctx) { this.musicTimer = null; return; }
        const n = melody[i++ % melody.length];
        const f = 523.25 * Math.pow(2, (n + (Math.random() - 0.5) * this.musicDetune) / 12);
        this.tone(f, 0.9, 0.05, 'triangle', 0.6); this.tone(f * 2.01, 0.4, 0.015, 'sine', 0.6);
        this.musicTimer = setTimeout(tick, 330 + this.musicDetune * 80 * Math.random());
      };
      tick();
    },

    knock(vol = 0.9) { this.burst({ freq: 300, dur: 0.18, vol, wet: 0.5 }); this.tone(95, 0.15, vol * 0.8, 'sine', 0.4, 60); },
    step() { this.burst({ freq: 220 + Math.random() * 120, dur: 0.09, vol: 0.12, wet: 0.1, src: 'brown' }); },
    click() { this.burst({ freq: 3500, type: 'bandpass', q: 3, dur: 0.04, vol: 0.4, wet: 0.1 }); },
    pickup() { this.burst({ freq: 1800, type: 'bandpass', q: 2, dur: 0.07, vol: 0.25, wet: 0.1 }); },
    strike(ok) {
      this.burst({ freq: 2500, type: 'highpass', dur: 0.22, vol: 0.4, wet: 0.1 });
      if (ok) setTimeout(() => this.burst({ freq: 600, type: 'lowpass', dur: 0.5, vol: 0.25, attack: 0.05, wet: 0.2 }), 120);
    },
    blow() { this.burst({ freq: 900, type: 'bandpass', q: 0.7, dur: 0.6, vol: 0.35, attack: 0.08, wet: 0.3 }); },
    lighterFail() { this.burst({ freq: 4000, type: 'highpass', dur: 0.05, vol: 0.3 }); setTimeout(() => this.burst({ freq: 4000, type: 'highpass', dur: 0.05, vol: 0.3 }), 180); },
    creak(pan = 0) {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; const f0 = 120 + Math.random() * 200; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (0.7 + Math.random() * 0.6), t + 0.6);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 0.7);
      const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (pn.pan) pn.pan.value = pan;
      o.connect(f); f.connect(g); g.connect(pn); this.out(pn, 0.6); o.start(t); o.stop(t + 0.75);
    },
    chime(n) {
      if (!this.ctx) return;
      for (let i = 0; i < n; i++) setTimeout(() => {
        for (const [m, v] of [[1, 0.3], [2.76, 0.12], [5.4, 0.06], [0.5, 0.15]]) this.tone(220 * m, 3.5, v, 'sine', 0.8);
      }, i * 1800);
    },
    stinger() { this.tone(110, 2.5, 0.25, 'sawtooth', 0.8, 55); this.tone(116.5, 2.5, 0.2, 'sawtooth', 0.8, 58); this.burst({ freq: 200, dur: 1.8, vol: 0.4, attack: 0.3, wet: 0.8, src: 'brown' }); },
    scream() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const ws = ctx.createWaveShaper(); const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 8); } ws.curve = curve;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      ws.connect(g); this.out(g, 0.5);
      for (const f of [880, 932, 1245, 415]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.3, t + 2); o.connect(ws); o.start(t); o.stop(t + 2.3); }
      const n = this.noise(); n.connect(ws); n.start(t); n.stop(t + 2.3);
    },
  };
  RT.Audio = A;
})(window.RT);

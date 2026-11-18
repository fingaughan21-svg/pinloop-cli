// Menus, HUD and the game state machine.
(function (RT) {
  const $ = (id) => document.getElementById(id);

  const LEVELS = [
    { n: 'LEVEL 1', t: 'The Midnight Man', d: 'Let him in at midnight. Keep your candle lit until 3:33 a.m.', open: true },
    { n: 'LEVEL 2', t: 'The Elevator', d: 'Ten floors, in the right order. Do not speak to the woman who gets on at five.' },
    { n: 'LEVEL 3', t: 'The Hooded Man', d: 'He stands at the foot of the bed. Do not let him see that you are awake.' },
    { n: 'LEVEL 4', t: 'Three Kings', d: 'Two mirrors, three chairs, and a ritual that opens the Shadowside.' },
  ];

  // ---------------- HUD ----------------
  const UI = {
    msgT: 0, bigT: 0,
    setClock(s) { if (this._clock !== s) { $('clock').textContent = s; this._clock = s; } },
    say(text, dur = 3) { $('msg').textContent = text; $('msg').style.opacity = 1; this.msgT = dur; },
    bigText(main, dur = 3, sub = '') { $('bigMain').textContent = main; $('bigSub').textContent = sub; $('big').classList.remove('hidden'); this.bigT = dur; },
    setPrompt(s) { if (this._prompt !== s) { $('prompt').textContent = s; this._prompt = s; } },
    setObjectives(steps, text) {
      let html;
      if (steps) {
        let nextShown = false, todo = 0;
        html = steps.map(([done, label]) => {
          let cls = done ? 'done' : nextShown ? 'todo' : 'next';
          if (cls === 'todo' && ++todo > 2) cls += ' later';
          if (!done) nextShown = true;
          return `<div class="${cls}">${label}</div>`;
        }).join('');
      } else html = `<div class="next">${text}</div>`;
      if (this._obj !== html) { $('objectives').innerHTML = html; this._obj = html; }
    },
    setAlarm(a) {
      const el = $('alarm');
      if (!a) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden'); el.classList.toggle('salt', !!a.salt);
      $('alarmText').textContent = a.text;
      $('alarmBar').style.width = Math.max(0, Math.min(1, a.frac)) * 100 + '%';
    },
    setInventory(list) { const s = list.join('  ·  '); if (this._inv !== s) { $('inv').textContent = s; this._inv = s; } },
    setOverlays({ cold, drowsy, dark }) {
      $('frost').style.opacity = (cold * 0.75).toFixed(2);
      $('drowsy').style.opacity = (drowsy * (0.7 + Math.sin(performance.now() / 600) * 0.3)).toFixed(2);
      $('darken').style.opacity = dark.toFixed(2);
    },
    flash(color) {
      const f = $('flash'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = 1;
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 0.8s ease-out'; f.style.opacity = 0; }));
    },
    tick(dt) {
      if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('msg').style.opacity = 0; }
      if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) $('big').classList.add('hidden'); }
    },
    reset() {
      this.msgT = 0; this.bigT = 0; $('msg').style.opacity = 0; $('big').classList.add('hidden');
      this.setAlarm(null); this.setOverlays({ cold: 0, drowsy: 0, dark: 0 });
    },
  };

  // ---------------- Game ----------------
  const SCREENS = ['menu', 'intro', 'nameDialog', 'journal', 'controls', 'settings', 'pause', 'ending'];
  const params = new URLSearchParams(location.search);

  const Game = {
    state: 'menu', world: null, ui: UI, input: RT.Input, screenStack: [],
    show(id) {
      for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
      const inPlay = id === null;
      $('hud').classList.toggle('hidden', !(this.world && !this.world.attract && (inPlay || id === 'pause' || id === 'journal')));
      $('touch').classList.toggle('hidden', !inPlay);
      this.current = id;
    },
    go(id) {
      if (id === 'back') { const prev = this.screenStack.pop() || 'menu'; return this.show(prev); }
      if (id === 'journalMenu') id = 'journal';
      if (id === 'menu') { this.screenStack = []; return this.toMenu(); }
      this.screenStack.push(this.current);
      this.show(id);
    },

    init() {
      RT.buildTextures();
      this.canvas = $('view');
      this.renderer = new RT.Renderer(this.canvas);
      RT.Input.init(this.canvas);
      window.addEventListener('resize', () => this.renderer.resize());

      // level cards
      const lv = $('levels');
      LEVELS.forEach((L) => {
        const b = document.createElement('div');
        b.className = 'lvl' + (L.open ? '' : ' locked');
        b.innerHTML = `<div class="n">${L.n}</div><div class="t">${L.t}</div><div class="d">${L.d}</div>${L.open ? '' : '<div class="lock">&#128274;</div>'}`;
        b.addEventListener('click', () => { RT.Audio.init(); if (L.open) this.go('intro'); else { RT.Audio.knock(0.3); b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); } });
        lv.appendChild(b);
      });
      document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { RT.Audio.init(); this.go(b.dataset.go); }));
      $('begin').addEventListener('click', () => this.startLevel());
      $('journalClose').addEventListener('click', () => this.closeOverlay());
      $('resume').addEventListener('click', () => this.resume());
      $('quit').addEventListener('click', () => this.toMenu());
      $('retry').addEventListener('click', () => this.startLevel());
      $('toMenu').addEventListener('click', () => this.toMenu());
      $('sens').addEventListener('input', (e) => { RT.Input.sensitivity = +e.target.value; this.save(); });
      $('vol').addEventListener('input', (e) => { RT.Audio.setVolume(+e.target.value); this.save(); });
      $('nameOk').addEventListener('click', () => this.submitName());
      $('nameCancel').addEventListener('click', () => { this.nameCb = null; this.resume(); });
      for (const id of ['nFirst', 'nMiddle', 'nLast']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') this.submitName(); e.stopPropagation(); });
      this.load();

      this.toMenu();
      let last = performance.now();
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.frame(dt, now / 1000);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    save() { try { localStorage.setItem('ritual.settings', JSON.stringify({ sens: RT.Input.sensitivity, vol: RT.Audio.volume })); } catch (e) {} },
    load() {
      try {
        const s = JSON.parse(localStorage.getItem('ritual.settings') || '{}');
        if (s.sens) { RT.Input.sensitivity = s.sens; $('sens').value = s.sens; }
        if (s.vol !== undefined) { RT.Audio.setVolume(s.vol); $('vol').value = s.vol; }
      } catch (e) {}
    },

    toMenu() {
      if (document.pointerLockElement) document.exitPointerLock();
      this.state = 'menu';
      UI.reset();
      // attract mode: the dark living room by candlelight behind the menu
      const w = new RT.Level1(this, { attract: true });
      w.attract = true;
      for (const r in w.roomLit) w.roomLit[r] = false;
      w.player.x = 17.2; w.player.y = 15.6; w.inv.candle = true; w.candleLit = true;
      w.mm.sprite.hidden = false; w.mm.x = w.mm.sprite.x = 21.5; w.mm.y = w.mm.sprite.y = 11.0;
      this.world = w;
      this.screenStack = [];
      this.show('menu');
    },
    startLevel() {
      RT.Audio.init();
      UI.reset();
      this.world = new RT.Level1(this, { speed: +params.get('speed') || 1 });
      if (params.has('skip')) this.world.skipPrep();
      this.state = 'play';
      RT.Input.clear();
      this.show(null);
      if (!RT.Input.touch) this.canvas.requestPointerLock?.();
    },
    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused'; this.screenStack = [];
      this.show('pause');
    },
    resume() {
      this.state = 'play'; RT.Input.clear(); this.screenStack = [];
      this.show(null);
      if (!RT.Input.touch) this.canvas.requestPointerLock?.();
    },
    openJournal() {
      this.state = 'paused'; this.screenStack = ['__play'];
      if (document.pointerLockElement) { this._suppressPause = true; document.exitPointerLock(); }
      this.show('journal');
    },
    closeOverlay() {
      const prev = this.screenStack.pop();
      if (prev === '__play' || !prev) return this.resume();
      this.show(prev);
    },
    askName(cb) {
      this.nameCb = cb; this.state = 'dialog';
      if (document.pointerLockElement) { this._suppressPause = true; document.exitPointerLock(); }
      this.show('nameDialog'); $('nameErr').textContent = '';
      setTimeout(() => $('nFirst').focus(), 50);
    },
    submitName() {
      const parts = ['nFirst', 'nMiddle', 'nLast'].map((id) => $(id).value.trim());
      if (parts.some((p) => !p)) { $('nameErr').textContent = 'All three. First, middle and last.'; return; }
      const cb = this.nameCb; this.nameCb = null;
      document.activeElement && document.activeElement.blur();
      this.resume();
      cb && cb(parts.join(' '));
    },

    endLevel(kind, reason) {
      if (this.state === 'ending') return;
      this.state = 'ending';
      if (document.pointerLockElement) document.exitPointerLock();
      const w = this.world;
      const name = (w.prep.name || 'You').split(' ')[0];
      const time = RT.fmtClock(Math.min(w.minutes, 213));
      const DEATHS = {
        light: ['YOU TURNED ON A LIGHT', 'The rules were simple. In the sudden glare he was already standing beside you.'],
        flashlight: ['YOU USED A FLASHLIGHT', 'The beam found him at the end of the corridor. Then it found nothing at all.'],
        sleep: ['YOU FELL ASLEEP', 'You only closed your eyes for a moment. You never opened them again.'],
        provoke: ['YOU PROVOKED HIM', 'You reached out to it. It reached back.'],
        caught: ['HE FOUND YOU', 'Cold fingers in the dark. The Midnight Man does not lose his own game.'],
        circle: ['YOU LEFT THE CIRCLE', 'One step past the salt. He had been waiting for it.'],
      };
      let title, text, cls = 'dead';
      if (kind === 'win') {
        title = '3:33 A.M.'; text = `The cold lifts. The whispering stops. The Midnight Man leaves your house, and the sky outside begins to grey. ${name}, you won the Midnight Game.`; cls = 'win';
      } else if (kind === 'trapped') {
        title = 'SURVIVED. NOT WON.'; text = 'You spent the rest of the night inside the salt while it circled you, whispering your name. At 3:33 it was gone. But you did not win the game, and it knows where you live.';
      } else if (kind === 'lost') {
        title = 'YOUR GREATEST FEAR'; text = 'It held you until 3:33. When morning came you were still sitting in the dark, and you have not been able to sleep with the lights off since.';
      } else {
        [title, text] = DEATHS[reason] || ['YOU DID NOT SURVIVE', ''];
      }
      $('endTitle').textContent = title;
      $('endTitle').style.color = cls === 'win' ? '#e9dcc0' : '';
      $('endText').textContent = text;
      $('endStats').textContent = w.phase === 'prep' && kind === 'dead' ? '' : `Clock: ${time}  ·  Matches left: ${w.inv.matches}`;
      $('endNext').innerHTML = kind === 'win' ? 'Next: <b>Level 2 &mdash; The Elevator</b> (locked in this demo)' : '';
      setTimeout(() => this.show('ending'), kind === 'dead' ? 0 : 400);
      if (kind === 'win') RT.Audio.chime(1);
    },

    frame(dt, t) {
      const I = RT.Input;
      if (this.state === 'play') {
        if (I.take('pause')) { if (document.pointerLockElement) document.exitPointerLock(); this.pause(); }
        else if (I.take('journal')) this.openJournal();
        else this.world.update(dt, I);
      } else if (this.state === 'menu') {
        const w = this.world; w.time += dt;
        w.player.a = 3.9 + Math.sin(t * 0.15) * 0.55;
        w.player.walkPhase = t * 0.6;
        const fl = 0.85 + Math.sin(t * 17) * 0.06 + Math.sin(t * 29) * 0.05;
        w.lights = [{ x: w.player.x, y: w.player.y, radius: 5.2, intensity: 1.35 * fl, r: 1, g: 0.7, b: 0.4 }];
        w.ambient = 0.03;
        RT.Audio.update(dt, { drone: 0.2, whisper: 0.05 });
      } else {
        if ((this.state === 'paused') && I.take('pause')) this.resume();
        if (this.state === 'paused' && this.current === 'journal' && I.take('journal')) this.closeOverlay();
        if (this.state !== 'ending') RT.Audio.update(dt, { drone: 0.12 });
        else RT.Audio.update(dt, { drone: 0.15 });
      }
      if (this.world) this.renderer.render(this.world, t);
      UI.tick(dt);
    },
  };

  // pointer-lock loss pauses the game, unless we released it on purpose
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && Game._suppressPause) { Game._suppressPause = false; }
  });

  RT.Game = Game;
  window.addEventListener('load', () => Game.init());
})(window.RT);

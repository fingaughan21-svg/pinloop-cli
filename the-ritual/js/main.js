// Menus, HUD and the game state machine.
(function (RT) {
  const $ = (id) => document.getElementById(id);

  const RULES1 = `
    <h2>The Midnight Game</h2>
    <p class="dim">Copied by hand from the thread. Do not skip a step.</p>
    <h3>Before midnight</h3>
    <ol>
      <li>Write your <b>full name</b> (first, middle and last) on a piece of paper.</li>
      <li>Put at least one drop of <b>your own blood</b> on it and let it soak in.</li>
      <li>Turn off <b>every</b> light in the house.</li>
      <li>At your wooden front door, lay the paper down, set a <b>candle</b> on it and light it.</li>
      <li><b>Knock 22 times.</b> The last knock must land at exactly 12:00 a.m.</li>
      <li>Open the door, blow out the candle, close the door. You have let the Midnight Man in.</li>
      <li><b>Immediately relight your candle.</b> The game has begun.</li>
    </ol>
    <h3>Until 3:33 a.m.</h3>
    <ul>
      <li>Wander the dark house with your candle. Avoid the Midnight Man at all costs.</li>
      <li>If the candle goes out, <b>he is near</b>. Relight it within <b>ten seconds</b>.</li>
      <li>If you cannot, <b>immediately</b> surround yourself with a <b>circle of salt</b> and stay inside it until 3:33.</li>
      <li>Fail both, and he will show you your greatest fear until 3:33.</li>
      <li>Signs he is close: a sudden <b>cold</b>, a <b>pure black figure</b> in the dark, soft <b>whispering</b>. Move away.</li>
      <li>Staying in one spot will only let him find you. <b>Keep moving.</b></li>
    </ul>
    <h3>Never</h3>
    <ul>
      <li>Never turn on a light. Never use a flashlight. Never go to sleep.</li>
      <li>Never use another person's blood on your name.</li>
      <li>Never use a lighter in place of the candle. It will not work.</li>
      <li>Never provoke the Midnight Man in <b>any</b> way.</li>
    </ul>`;
  const RULES2 = `
    <h2>The Elevator Game</h2>
    <p class="dim">A printout, folded small, found in the mailbox for flat 1004.</p>
    <h3>You need</h3>
    <ul><li>A building with at least ten floors and one elevator. You must be <b>alone</b> in the car. If anyone gets on, the game is broken: go back to the ground floor and start over.</li></ul>
    <h3>The order</h3>
    <ol>
      <li>From the ground floor, ride to <b>4</b>. Do not get out.</li>
      <li>Then <b>2</b>. Then <b>6</b>. Then <b>2</b> again. Then <b>10</b>.</li>
      <li>At 10, press <b>5</b>. When the doors open on five, <b>a young woman</b> may get on.</li>
      <li><b>Do not look at her. Do not speak to her.</b> Do not touch her. She is not a person.</li>
      <li>Press <b>1</b>. If the car goes down, you failed, and you are lucky. If it goes <b>up to 10</b>, you are on your way.</li>
      <li>If you lose your nerve, press any other floor <b>before</b> the car reaches 10. It may let you go.</li>
    </ol>
    <h3>The Other World</h3>
    <ul>
      <li>You will know it by the dark, and by a <b>red cross</b> in the distance. You will be the only living person there.</li>
      <li>You are not alone, though. Whatever is there moves when it is not being watched. <b>Keep your eyes on it.</b></li>
      <li>To come home, get back in the car and <b>do the sequence again</b>: 4, 2, 6, 2, 10. Then 1.</li>
      <li>Do not press a wrong floor on the way back. You will not get another chance.</li>
    </ul>`;

  const RULES3 = RT.RULES3 || '';

  const ACHIEVEMENTS = [
    { id: 1, title: 'Until 3:33', desc: 'Win the Midnight Game.' },
    { id: 2, title: 'Ground Floor', desc: 'Come back from the Other World.' },
    { id: 3, title: 'Thank You for the Ride', desc: 'Complete the Hooded Man ritual.' },
  ];

  // Level unlocks and achievements, kept in this browser.
  const Progress = {
    data: { completed: {}, unlockAll: false },
    load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem('ritual.progress') || '{}')); } catch (e) {} },
    save() { try { localStorage.setItem('ritual.progress', JSON.stringify(this.data)); } catch (e) {} },
    unlocked(id) { return id === 1 || this.data.unlockAll || !!this.data.completed[id - 1]; },
    complete(id) { const first = !this.data.completed[id]; this.data.completed[id] = true; this.save(); return first; },
  };

  const LEVELS = [
    { id: 1, n: 'LEVEL 1', t: 'The Midnight Man', d: 'Let him in at midnight. Keep your candle lit until 3:33 a.m.', cls: 'Level1', rules: RULES1,
      intro: `<h2>LEVEL 1 &mdash; THE MIDNIGHT MAN</h2>
        <p>You found the instructions on an old forum thread, posted by an account that no longer exists. Everyone in the replies said it was nonsense.</p>
        <p>It is 11:59 p.m. The house is quiet. You are alone.</p>
        <p>Prepare the ritual exactly as written. Once he is inside, survive until <b>3:33 a.m.</b></p>
        <p class="dim">Each in-game hour lasts two real minutes. Read the rules with <b>J</b> at any time.</p>` },
    { id: 2, n: 'LEVEL 2', t: 'The Elevator', d: 'Ten floors, in the right order. Do not look at the woman who gets on at five.', cls: 'Level2', rules: RULES2,
      intro: `<h2>LEVEL 2 &mdash; THE ELEVATOR</h2>
        <p>Hollis Tower has eleven storeys, one elevator, and a reputation. The building manager took the instructions down from the noticeboard twice.</p>
        <p>It is 2:14 a.m. The lobby is empty.</p>
        <p>Ride the floors in the right order, alone: <b>4, 2, 6, 2, 10</b>. Then <b>5</b>. Then <b>1</b>.</p>
        <p class="dim">Use the panel with <b>E</b>, then click a floor or type it (0 = 10). <b>C</b> closes the doors. Read the rules with <b>J</b>.</p>` },
    { id: 3, n: 'LEVEL 3', t: 'The Hooded Man', d: 'Call a cab that doesn\'t exist. Don\'t speak to the driver.', cls: 'Level3', rules: RULES3,
      intro: `<h2>LEVEL 3 &mdash; THE HOODED MAN</h2>
        <p>Your neighbour swears she did it in 1997. She came back. She doesn't talk about where the cab went.</p>
        <p>It is 1:20 a.m. You have a rotary phone in the hall, two black cords somewhere in the house, and a printout with half of it underlined.</p>
        <p>Prepare the house. Make the calls. Take the ride. <b>Come back.</b></p>
        <p class="dim">Hold <b>SPACE</b> to close your eyes and breathe when your pulse climbs. <b>R</b> checks your watch. Read the rules with <b>J</b>; you will need them.</p>` },
    { id: 4, n: 'LEVEL 4', t: 'Three Kings', d: 'Two mirrors, three chairs, and a ritual that opens the Shadowside.' },
  ];

  // ---------------- HUD ----------------
  const UI = {
    msgT: 0, bigT: 0, jumpT: 0,
    setClock(s) { if (this._clock !== s) { $('clock').textContent = s; this._clock = s; } },
    say(text, dur = 3, cls = '') { const m = $('msg'); m.textContent = text; m.className = cls; m.style.opacity = 1; this.msgT = dur; },
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
    setStamina(v, ex) {
      const el = $('stamina');
      el.classList.toggle('hidden', v >= 1 && !ex);
      el.classList.toggle('ex', !!ex);
      $('staminaFill').style.height = (v * 100).toFixed(1) + '%';
    },
    setMarker(world, m) {
      const el = $('marker');
      if (!m) { el.classList.add('hidden'); return; }
      const pr = Game.renderer.project(world, m.x, m.y, 0.35);
      const r = pr.rect;
      let x, y, edge = false;
      if (pr.behind || pr.side) {
        edge = true;
        const side = pr.behind ? pr.side : pr.side;
        x = side > 0 ? r.right - 40 : r.left + 40; y = r.top + r.height * 0.45;
      } else { x = RT.clamp(pr.x, r.left + 30, r.right - 30); y = RT.clamp(pr.y, r.top + 60, r.bottom - 60); }
      el.classList.remove('hidden'); el.classList.toggle('edge', edge);
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.querySelector('span').textContent = (edge ? (x > r.left + r.width / 2 ? '▶ ' : '◀ ') : '') + m.label;
    },
    setSwing(sw) {
      const el = $('swing');
      if (!sw) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      $('swingZone').style.left = ((sw.zoneC - sw.zoneW / 2) * 100) + '%';
      $('swingZone').style.width = (sw.zoneW * 100) + '%';
      $('swingMark').style.left = (sw.pos * 100) + '%';
    },
    setPanel(lvl) {
      const el = $('panelUI');
      if (!lvl) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      el.classList.toggle('dead', lvl.phase === 'other' || (lvl.phase === 'return' && !lvl.panelAlive));
      $('pdisp').textContent = lvl.phase === 'other' ? '--' : String(lvl.moving ? '' : lvl.floor);
      for (const b of el.querySelectorAll('[data-p]')) b.classList.toggle('lit', +b.dataset.p === lvl.target);
    },
    flash(color) {
      const f = $('flash'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = 1;
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 0.8s ease-out'; f.style.opacity = 0; }));
    },
    setRing(r) {
      const el = $('ring');
      if (!r) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      if (!this._segs) { this._segs = []; for (let i = 0; i < 12; i++) { const d = document.createElement('div'); d.className = 'sg'; el.appendChild(d); this._segs.push(d); } }
      for (let i = 0; i < 12; i++) {
        const a = (i + 0.5) * Math.PI / 6 - r.facing - Math.PI / 2;    // facing direction drawn at the top
        const d = this._segs[i], v = r.seg[i];
        d.style.transform = `translate(${Math.cos(a) * 48}px, ${Math.sin(a) * 48}px) rotate(${a + Math.PI / 2}rad)`;
        d.style.opacity = (0.15 + v * 0.85).toFixed(2);
        d.style.background = v < 1 ? `rgb(255,${Math.round(80 + v * 150)},${Math.round(60 + v * 120)})` : '#e8e8f0';
        d.classList.toggle('hit', r.breaches.includes(i));
      }
      el.querySelector('.lbl').textContent = `SALT ${Math.round(r.salt * 100)}%`;
    },
    setPulse(v) {
      const el = $('pulse');
      if (v === null) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden'); el.classList.toggle('high', v > 130);
      $('pulseN').textContent = Math.round(v);
    },
    setPhone(lvl) {
      const el = $('phoneUI');
      if (!lvl) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      const ph = lvl.ph;
      $('phDisp').textContent = ph.dial || '\u00a0';
      $('phHandset').textContent = ph.handsetUp ? 'Put the handset back' : (lvl.phase === 'after' ? 'Lift the handset and set it aside' : 'Lift the handset');
      $('phStat').textContent = ph.status || '';
      $('dial').style.transform = `rotate(${ph.spin || 0}deg)`;
    },
    choice(title, opts, cb) {
      $('choiceT').textContent = title;
      const box = $('choiceOpts'); box.innerHTML = '';
      opts.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; b.addEventListener('click', (e) => { e.stopPropagation(); $('choiceUI').classList.add('hidden'); cb(i); }); box.appendChild(b); });
      $('choiceUI').classList.remove('hidden');
    },
    hideChoice() { $('choiceUI').classList.add('hidden'); },
    setBeat(b) {
      const el = $('beat');
      if (!b) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      const ph = (b.t % b.period) / b.period;
      $('beatInner').style.transform = `scale(${(1 - ph) * 0.9 + 0.43})`;
      $('beatNum').textContent = b.n;
    },
    jumpscare(face, dur = 1.3) {
      const c = $('jump'), g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, 96, 96); g.drawImage(face, 0, 0);
      c.classList.remove('hidden'); this.jumpT = dur;
    },
    tick(dt) {
      if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('msg').style.opacity = 0; }
      if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) $('big').classList.add('hidden'); }
      if (this.jumpT > 0) { this.jumpT -= dt; if (this.jumpT <= 0) $('jump').classList.add('hidden'); }
    },
    reset() {
      this.msgT = 0; this.bigT = 0; this.jumpT = 0; $('msg').style.opacity = 0; $('big').classList.add('hidden'); $('jump').classList.add('hidden');
      this.setAlarm(null); this.setOverlays({ cold: 0, drowsy: 0, dark: 0 }); this.setStamina(1, false); this.setSwing(null); this.setPanel(null); this.setRing(null); this.setPulse(null); this.setPhone(null); this.hideChoice(); this.setBeat(null);
      $('marker').classList.add('hidden'); this.setPrompt('');
    },
  };

  // ---------------- Game ----------------
  const SCREENS = ['menu', 'intro', 'nameDialog', 'journal', 'controls', 'settings', 'pause', 'ending', 'achievements'];
  const params = new URLSearchParams(location.search);

  const Game = {
    state: 'menu', world: null, ui: UI, input: RT.Input, screenStack: [], level: LEVELS[0], keepUnlocked: false,
    show(id) {
      for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
      const inPlay = id === null;
      $('hud').classList.toggle('hidden', !(this.world && !this.world.attract && (inPlay || id === 'pause' || id === 'journal')));
      $('touch').classList.toggle('hidden', !inPlay);
      if (!inPlay) { $('panelUI').classList.add('hidden'); $('phoneUI').classList.add('hidden'); }
      else if (this.world && this.world.phoneOpen) UI.setPhone(this.world);
      else if (this.world && this.world.panelOpen) UI.setPanel(this.world);
      this.current = id;
    },
    go(id) {
      if (id === 'back') { const prev = this.screenStack.pop() || 'menu'; return this.show(prev); }
      if (id === 'journalMenu') { $('journalBody').innerHTML = LEVELS.filter((l) => l.rules).map((l) => l.rules).join('<hr>'); id = 'journal'; }
      if (id === 'journal' && this.state !== 'menu') $('journalBody').innerHTML = this.level.rules;
      if (id === 'menu') { this.screenStack = []; return this.toMenu(); }
      if (id === 'achievements') this.renderAchievements();
      this.screenStack.push(this.current);
      this.show(id);
    },

    init() {
      RT.buildTextures();
      this.canvas = $('view');
      this.renderer = new RT.Renderer(this.canvas);
      RT.Input.init(this.canvas);
      window.addEventListener('resize', () => this.renderer.resize());

      this.renderLevels();
      // elevator panel buttons
      const pg = $('pgrid');
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) { const b = document.createElement('button'); b.textContent = n; b.dataset.p = n; pg.appendChild(b); }
      for (const b of document.querySelectorAll('#panelUI [data-p]')) {
        b.addEventListener('click', (e) => { e.stopPropagation(); const v = b.dataset.p; if (this.world && this.world.panelAction) this.world.panelAction(isNaN(+v) ? v : +v); });
      }
      // rotary dial: 1-9 then 0 around the wheel
      const dial = $('dial');
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((d, i) => {
        const b = document.createElement('button'); b.textContent = d;
        const ang = -Math.PI * 0.35 - i * (Math.PI * 1.45 / 9);
        b.style.left = (100 + Math.cos(ang) * 74) + 'px'; b.style.top = (100 + Math.sin(ang) * 74) + 'px';
        b.addEventListener('click', (e) => { e.stopPropagation(); if (this.world && this.world.phoneAction) this.world.phoneAction('d' + d); });
        dial.appendChild(b);
      });
      for (const b of document.querySelectorAll('#phoneUI [data-ph]')) b.addEventListener('click', (e) => { e.stopPropagation(); if (this.world && this.world.phoneAction) this.world.phoneAction(b.dataset.ph); });
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
      $('pwGo').addEventListener('click', () => this.tryPassword());
      $('pw').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.tryPassword(); });
      $('resetProgress').addEventListener('click', () => { Progress.data = { completed: {}, unlockAll: false }; Progress.save(); this.renderLevels(); $('pwMsg').textContent = 'Progress reset.'; });
      this.load();
      Progress.load();
      this.renderLevels();

      this.toMenu();
      let last = performance.now();
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        try { this.frame(dt, now / 1000); } catch (e) { window.__errs = (window.__errs || []).concat(e.stack); console.error(e); }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    renderLevels() {
      const lv = $('levels'); lv.innerHTML = '';
      LEVELS.forEach((L) => {
        const playable = !!L.cls, open = playable && Progress.unlocked(L.id), done = Progress.data.completed[L.id];
        const b = document.createElement('div');
        b.className = 'lvl' + (open ? '' : ' locked') + (playable ? '' : ' soon');
        const badge = open ? (done ? '<div class="lock" title="Completed">&#10022;</div>' : '') : '<div class="lock">&#128274;</div>';
        b.innerHTML = `<div class="n">${L.n}</div><div class="t">${L.t}</div><div class="d">${open || !playable ? L.d : `Complete Level ${L.id - 1} to unlock.`}</div>${badge}`;
        b.addEventListener('click', () => {
          RT.Audio.init();
          if (open) { this.level = L; $('introBody').innerHTML = L.intro; this.go('intro'); }
          else {
            RT.Audio.knock(0.3); b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200);
            this.toast(playable ? `Complete <b>Level ${L.id - 1}</b> to unlock this.` : 'Not in this demo.');
          }
        });
        lv.appendChild(b);
      });
    },
    renderAchievements() {
      $('achList').innerHTML = ACHIEVEMENTS.map((a) => {
        const got = Progress.data.completed[a.id];
        return `<div class="ach ${got ? 'got' : ''}"><div class="ico">${got ? '&#10022;' : '?'}</div><div><div class="t">${got ? a.title : '???'}</div><div class="d">${a.desc}</div></div></div>`;
      }).join('');
    },
    tryPassword() {
      const v = $('pw').value.trim(); $('pw').value = '';
      if (v === 'admin123') { Progress.data.unlockAll = true; Progress.save(); this.renderLevels(); $('pwMsg').textContent = 'All levels unlocked.'; RT.Audio.ding && RT.Audio.ding(1); }
      else { $('pwMsg').textContent = 'Nothing happens.'; RT.Audio.knock(0.3); }
    },
    toast(html, dur = 3500) {
      const t = $('toast'); t.innerHTML = html; t.classList.remove('hidden');
      clearTimeout(this._toastT); this._toastT = setTimeout(() => t.classList.add('hidden'), dur);
    },
    save() { try { localStorage.setItem('ritual.settings', JSON.stringify({ sens: RT.Input.sensitivity, vol: RT.Audio.volume })); } catch (e) {} },
    load() {
      try {
        const s = JSON.parse(localStorage.getItem('ritual.settings') || '{}');
        if (s.sens) { RT.Input.sensitivity = s.sens; $('sens').value = s.sens; }
        if (s.vol !== undefined) { RT.Audio.setVolume(s.vol); $('vol').value = s.vol; }
      } catch (e) {}
    },

    stopLevelAudio() { RT.Audio.music && RT.Audio.music(false); RT.Audio.setHum && RT.Audio.setHum(0); RT.Audio.setRain && RT.Audio.setRain(0); RT.Audio.setEngine && RT.Audio.setEngine(0); },
    toMenu() {
      this.keepUnlocked = false;
      if (document.pointerLockElement) document.exitPointerLock();
      this.state = 'menu';
      this.stopLevelAudio();
      UI.reset();

      // attract mode: the dark living room by candlelight behind the menu
      const w = new RT.Level1(this, { attract: true });
      w.attract = true;
      for (const r in w.roomLit) w.roomLit[r] = false;
      w.player.x = 17.2; w.player.y = 15.6; w.inv.candle = true; w.candleLit = true;
      w.mm.sprite.hidden = false; w.mm.x = w.mm.sprite.x = 21.5; w.mm.y = w.mm.sprite.y = 11.0;
      this.world = w;
      this.screenStack = [];
      $('journalBody').innerHTML = RULES1;
      this.show('menu');
    },
    startLevel() {
      RT.Audio.init();
      UI.reset();
      this.stopLevelAudio();
      this.keepUnlocked = false;
      this.world = new RT[this.level.cls](this, { speed: +params.get('speed') || 1 });
      for (const b of document.querySelectorAll('.tbtn[data-lv]')) b.style.display = b.dataset.lv.split(' ').includes(String(this.level.id)) ? '' : 'none';
      $('journalBody').innerHTML = this.level.rules;
      if (params.has('skip') && this.world.skipPrep) this.world.skipPrep();
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
      if (!RT.Input.touch && !this.keepUnlocked) this.canvas.requestPointerLock?.();
    },
    openJournal() {
      this.state = 'paused'; this.screenStack = ['__play'];
      if (document.pointerLockElement) document.exitPointerLock();
      this.show('journal');
    },
    closeOverlay() {
      const prev = this.screenStack.pop();
      if (prev === '__play' || (!prev && this.state === 'paused')) return this.resume();
      this.show(prev || 'menu');
    },
    askName(cb) {
      this.nameCb = cb; this.state = 'dialog';
      if (document.pointerLockElement) document.exitPointerLock();
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
      this.keepUnlocked = false;
      if (document.pointerLockElement) document.exitPointerLock();
      const e = this.world.ending(kind, reason);
      $('endTitle').textContent = e.title;
      $('endTitle').style.color = e.win ? '#e9dcc0' : '';
      $('endText').textContent = e.text;
      $('endStats').textContent = e.stats || '';
      $('endNext').innerHTML = e.next || '';
      setTimeout(() => this.show('ending'), kind === 'dead' ? 0 : 400);
      this.stopLevelAudio();
      if (e.win) {
        RT.Audio.chime(1);
        const first = Progress.complete(this.level.id);
        const a = ACHIEVEMENTS.find((x) => x.id === this.level.id);
        if (first && a) setTimeout(() => this.toast(`Achievement unlocked: <b>${a.title}</b>`, 5000), 900);
        const nxt = LEVELS.find((x) => x.id === this.level.id + 1);
        if (nxt && nxt.cls) $('endNext').innerHTML = `Unlocked: <b>${nxt.n} &mdash; ${nxt.t}</b>`;
        this.renderLevels();
      }
    },

    frame(dt, t) {
      const I = RT.Input;
      if (this.state === 'play') {
        if (I.take('pause')) {
          if (!(this.world.handlePause && this.world.handlePause())) { if (document.pointerLockElement) document.exitPointerLock(); this.pause(); }
        }
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
        RT.Audio.update(dt, { drone: this.state === 'ending' ? 0.15 : 0.12 });
      }
      if (this.world) this.renderer.render(this.world, t);
      UI.tick(dt);
    },
  };

  RT.Game = Game;
  window.addEventListener('load', () => Game.init());
})(window.RT);

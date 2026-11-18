// LEVEL 2 - THE ELEVATOR
// Ride 4 -> 2 -> 6 -> 2 -> 10 alone. At 10 press 5; a woman gets on. Do not
// look at her, do not speak to her. Press 1. If the car climbs to 10 instead,
// you are in the Other World. See the red cross, get back in, and repeat the
// sequence to come home.
(function (RT) {
  const CAR_ROWS = [
    '#########D##########',
    '########eee#########',
    '########eee#########',
    '########eee#########',
    '####################',
    '####################',
  ];
  const fill = (row, n) => Array(n).fill(row);
  const LOBBY = ['####################', ...fill('#yyyyyyyyyyyyyyyyyy#', 8), ...fill('######yyyyyyy#######', 2), ...CAR_ROWS];
  const CORR = ['####################', ...fill('########ppp#########', 8), ...fill('######ppppppp#######', 2), ...CAR_ROWS];
  const OTHER = [
    '####################',
    '#oooo#oooooooo#oooo#',
    '#o##o#o##oo##o#o##o#',
    '#o#oooo#oooo#ooo#oo#',
    '#o#o##o#o##o#o#o#o##',
    '#ooo#ooooo#oooo#ooo#',
    '###o#o###o#o##o###o#',
    '#ooooo#ooooo#ooooo##',
    '#o###o#o###o#o###oo#',
    '#ooo##ooooooo##oooo#',
    '#oooo#ooooooo#ooooo#',
    ...CAR_ROWS,
  ];
  const W = 20, H = 17;
  const DOOR = { x: 9, y: 11 };
  const RIDE = [4, 2, 6, 2, 10, 5, 1];
  const RETURN = [4, 2, 6, 2, 10, 1];
  const SPOTS = [[8.35, 12.4], [10.65, 12.4], [8.35, 14.65], [10.65, 14.65], [9.5, 14.7], [8.35, 13.5], [10.65, 13.5]];
  const DOOR_SPEED = 1 / 1.3;
  const LINES = [
    'Hey.', 'Which floor are you going to?', 'You dropped something.', 'Why won\'t you look at me?',
    'Are you lost?', 'It\'s cold in here, isn\'t it?', 'I know you can hear me.', 'Turn around.',
    'Say something.', 'I live on the tenth floor too.', 'Look at me.',
  ];

  class Level2 {
    constructor(game, opts = {}) {
      this.game = game; this.ui = game.ui;
      this.player = { x: 9.5, y: 3.2, a: Math.PI / 2, bob: 0, walkPhase: 0 };
      this.fx = { cold: 0, hallucinate: 0 };
      this.roomLit = { e: true, y: true, p: true, p6: true, q: false, o: false };
      this.lights = []; this.ambient = 0.05; this.ambientTint = null;
      this.time = 0; this.flags = {};
      this.phase = 'lobby';
      this.floor = 1; this.style = 'y'; this.grid = LOBBY;
      this.door = 0; this.doorTarget = 0; this.doorOpenT = 0;
      this.moving = null; this.target = null;
      this.idx = 0; this.strikes = 0; this.resetting = false;
      this.npcs = []; this.floorProps = [];
      this.carLight = 1;
      this.panelOpen = false;
      this.battery = 1; this.flashOn = false; this.hasPhone = false;
      this.gaze = 0; this.talkWin = 0; this.nextLine = 6; this.nextMove = 6;
      this.crossSeen = false;
      this.woman = { x: 0, y: 0, h: 0.98, z: 0, hidden: true, getTex: () => RT.Tex.woman[this.gaze > 0.45 || this.phase === 'dead' ? 1 : 0] };
      this.inCar = false;
      this.map = this.makeMap();
      this.setFloor(1, 'y', LOBBY);
      this.ui.setClock('■ 1');
      if (!opts.attract) {
        this.ui.say('Hollis Tower. 2:14 a.m. The lobby is empty. Call the elevator.', 5);
        setTimeout(() => this.game.world === this && this.phase === 'lobby' && this.ui.say('Press J to read the rules. You will need them.', 4), 5500);
        RT.Audio.setHum(0.05);
      }
    }

    // ---------------- map & rendering interface ----------------
    makeMap() {
      const L = this;
      return {
        W, H,
        isWall(x, y) { const r = L.grid[y]; if (!r || x < 0 || x >= W) return true; const c = r[x]; return c === '#' || c === 'D'; },
        roomAt(x, y) {
          const r = L.grid[y]; if (!r || x < 0 || x >= W) return null; const c = r[x];
          if (c === '#') return null; if (c === 'e' || c === 'D') return 'e'; if (c === 'p') return L.style; return c;
        },
        doorAt(x, y) { return x === DOOR.x && y === DOOR.y ? L.door : -1; },
        decalAt(x, y, f) { return L.decals.get(RT.FACE_KEY(x, y, f)); },
      };
    }
    decalTex(d) { return d.tex; }
    get sprites() {
      const out = this.floorProps.slice();
      for (const n of this.npcs) if (!n.hidden) out.push(n);
      if (!this.woman.hidden) out.push(this.woman);
      return out;
    }
    get solids() { return this.floorProps; }
    get viewModel() { return {}; }
    get saltCircleRender() { return null; }
    blocked(cx, cy) {
      const r = this.grid[cy]; if (!r) return true; const c = r[cx];
      if (c === '#' || c === undefined) return true;
      if (c === 'D') return !(this.door > 0.8 && (this.phase === 'lobby' || this.phase === 'other'));
      return false;
    }
    walkable(x, y) { return !this.blocked(x | 0, y | 0); }

    setFloor(n, style, grid) {
      this.floor = n; this.style = style; this.grid = grid;
      const D = RT.Tex.decals, list = [];
      const add = (x, y, f, tex, extra = {}) => list.push(Object.assign({ x, y, f, tex }, extra));
      add(10, 11, 'S', D.panel, { kind: 'panel' });
      add(9, 15, 'N', this.phase === 'woman' || this.phase === 'ascend' ? D.mirrorWoman : D.mirror);
      add(10, 11, 'N', D.callBtn, { kind: 'call' });
      if (grid === LOBBY) {
        add(9, 0, 'S', D.lobbyDoors); add(0, 4, 'E', D.mailboxes); add(13, 9, 'W', D.notice);
        add(5, 10, 'E', D.floorSign(1)); add(19, 4, 'W', D.cityWindow); add(0, 7, 'E', D.cityWindow);
      } else if (grid === CORR) {
        const other = style === 'q';
        add(9, 0, 'S', other ? D.redCross : D.cityWindow, other ? { emissive: 0.5 } : {});
        add(5, 10, 'E', D.floorSign(other ? '?' : n)); add(13, 10, 'W', D.floorSign(other ? '?' : n));
        for (const y of [2, 5, 8]) { add(7, y, 'E', D.aptDoor(n * 100 + y)); add(11, y, 'W', D.aptDoor(n * 100 + y + 1)); }
        if (other) { add(7, 4, 'E', D.handprints); add(11, 6, 'W', D.handprints); add(12, 11, 'N', D.handprints); }
      } else {
        add(2, 0, 'S', D.redCross, { kind: 'cross', emissive: 0.6 });
        add(5, 1, 'E', D.handprints); add(12, 4, 'W', D.handprints); add(0, 9, 'E', D.handprints); add(13, 10, 'W', D.handprints);
        add(5, 10, 'E', D.floorSign('?'));
      }
      this.decals = new Map(list.map((d) => [RT.FACE_KEY(d.x, d.y, d.f), d]));
      // props
      const S = RT.Tex.sprites, P = [];
      const prop = (tex, x, y, h, solid = 0) => P.push({ tex, x, y, h, z: 0, solid });
      if (grid === LOBBY) {
        prop(S.frontDesk, 4.5, 3, 0.55, 0.6); prop(S.plant, 1.5, 1.5, 0.6, 0.25); prop(S.plant, 17.5, 1.5, 0.6, 0.25);
        prop(S.sofa, 15.5, 6.2, 0.5, 0.5); prop(S.armchair, 3.5, 7, 0.55, 0.35); prop(S.wetSign, 12.2, 6.5, 0.35, 0.15);
      } else if (grid === CORR && style !== 'q') {
        if (n % 2 === 0) prop(S.plant, 10.4, 1.4, 0.6, 0.2);
        if (n === 4) prop(S.chair, 8.4, 4.5, 0.55, 0.15);
      } else if (grid === OTHER) {
        for (const [x, y] of [[1.5, 9.5], [17.5, 9.5], [11.5, 1.5], [7.5, 5.5], [14.5, 7.5]]) prop(S.officeDesk, x, y, 0.45, 0);
      }
      this.floorProps = P;
      this.npcs = this.npcs.filter((q) => q.inCar);
    }

    // ---------------- doors & motion ----------------
    openDoors() { if (this.doorTarget !== 1) { this.doorTarget = 1; RT.Audio.doorSlide(); } }
    closeDoors() {
      if (this.blockClose) { this.ui.say('The doors will not close.', 2); return; }
      if (this.doorTarget !== 0) { this.doorTarget = 0; RT.Audio.doorSlide(); }
    }
    expected() { return this.phase === 'return' ? RETURN[this.idx] : RIDE[this.idx]; }

    pressFloor(n) {
      RT.Audio.click();
      this.pressed = n; if (this.panelOpen) this.ui.setPanel(this);
      if (this.phase === 'other' || (this.phase === 'return' && !this.panelAlive)) return this.ui.say('Nothing. The panel is dark.', 2);
      if (this.phase === 'ascend') return this.abort(n);
      if (this.moving) return this.ui.say('The elevator is moving.', 1.5);
      if (this.phase === 'descend' || this.phase === 'dead' || this.phase === 'over') return;
      if (this.resetting) return this.ui.say('It is taking you back down. Wait.', 2);
      if (this.phase === 'lobby' && !this.insideCar()) return;
      if (n === this.floor && this.door > 0) return;
      const exp = this.expected();
      if (this.phase === 'woman') {
        if (n !== 1) return this.abort(n);
        this.phase = 'ascend';
        this.ui.say('You press 1.', 2);
        return this.depart(10, 2.0);
      }
      if (n !== exp) {
        if (this.phase === 'return') return this.die('lost');
        return this.breakSequence(`You pressed ${n}. That is not the order.`);
      }
      if (this.phase === 'lobby') this.phase = 'ride';
      if (this.phase === 'return' && this.idx === RETURN.length - 1) { this.phase = 'descend'; this.ui.say('Down. All the way down.', 2.5); return this.depart(n, 0.9); }
      this.depart(n);
    }
    depart(n, perFloor = 1.0) {
      this.target = n; this.perFloor = perFloor;
      if (this.door === 0) this.startMove(); else this.closeDoors();
    }
    startMove() {
      const n = this.target; this.target = null;
      if (n === this.floor) { this.arrive(n); return; }
      this.moving = { from: this.floor, to: n, t: 0, dur: Math.abs(n - this.floor) * this.perFloor + 1.2 };
      RT.Audio.setHum(0.22);
    }
    arrive(n) {
      this.moving = null;
      RT.Audio.setHum(0.06);
      RT.Audio.ding(1);
      this.onArrive(n);
    }
    breakSequence(why) {
      this.strikes++;
      RT.Audio.stinger();
      this.ui.flash('rgba(120,0,0,0.4)');
      if (this.strikes >= 3) return this.die('patience');
      this.ui.say(`${why} The ritual is broken. The car is taking you back to the ground floor.  (${this.strikes}/3)`, 5);
      this.idx = 0; this.resetting = true; this.carFlicker = 2;
      this.depart(1, 0.7);
    }
    abort(n) {
      this.ui.say('You press ' + n + '. The car shudders and changes its mind.', 3);
      this.aborting = n;
      if (this.phase === 'ascend') {
        const cur = Math.round(RT.lerp(this.moving.from, this.moving.to, this.moving.t / this.moving.dur));
        this.moving = { from: cur, to: Math.max(n, cur), t: 0, dur: 1.5 };
      } else this.depart(n, 1);
      this.phase = 'aborting';
    }
    insideCar() { const p = this.player; return p.y > 11.75 && p.x > 8 && p.x < 11; }

    // ---------------- per-floor events ----------------
    onArrive(n) {
      const ph = this.phase;
      if (ph === 'aborting') {
        this.setFloor(n, 'p', CORR); this.openDoors();
        this.woman.hidden = false;
        setTimeout(() => { if (this.game.world !== this || this.phase === 'dead') return; this.woman.hidden = true; this.ui.say('She steps out without a sound. She does not look back.', 4); }, 1800);
        setTimeout(() => this.game.world === this && this.phase !== 'dead' && (this.phase = 'over', this.game.endLevel('abort')), 5000);
        return;
      }
      if (this.resetting) {
        this.resetting = false;
        this.setFloor(1, 'y', LOBBY); this.openDoors();
        this.npcs = [];
        this.ui.say('Ground floor. Begin again: the first floor of the sequence.', 4);
        this.phase = 'lobby';
        return;
      }
      if (ph === 'ride') {
        this.idx++;
        if (n === 5 && this.idx === 6) return this.womanArrives();
        const style = n === 6 ? 'p6' : 'p';
        this.setFloor(n, style, CORR);
        this.roomLit.p = !(n === 10 || (n === 2 && this.idx === 4));
        this.openDoors();
        this.spawnFloorEvent(this.idx - 1, n);
        return;
      }
      if (ph === 'ascend') return this.enterOtherWorld();
      if (ph === 'return') {
        this.idx++;
        if (this.idx >= RETURN.length) return;
        this.setFloor(n, 'q', CORR);
        this.openDoors();
        // something is always waiting on the way back
        const fast = RT.lerp(2.6, 4.2, this.idx / 5);
        const near = this.idx >= 3 && Math.random() < 0.4;
        this.spawnNpc('other', near ? 6.5 : 1.6, fast, { delay: near ? 0.6 : 0.2 });
        return;
      }
      if (ph === 'descend') return this.homeAgain();
    }

    spawnNpc(kind, y, speed, extra = {}) {
      const T = RT.Tex;
      let tex, h = 0.95;
      if (kind === 'resident') { const pool = extra.wrong ? T.peopleWrong : T.people; tex = RT.choice(pool); }
      const n = Object.assign({ kind, x: 9.5 + RT.rand(-0.6, 0.6), y, h, z: 0, speed, state: 'wait', delay: 0.5, tex }, extra);
      if (kind === 'other') n.getTex = (t) => T.other[n.state === 'walk' ? ((t * 6) | 0) % 2 : 0];
      this.npcs.push(n);
      return n;
    }
    spawnFloorEvent(i, n) {
      // i: 0..4, how far into the sequence we are. Later stops are worse.
      const r = Math.random();
      const chance = [0.6, 0.7, 0.8, 0.85, 0.9][i];
      if (n === 6) {
        // a corridor full of people with their faces to the wall
        for (const y of [2.5, 4, 5.5, 7]) for (const x of [8.25, 10.75]) {
          const q = this.spawnNpc('resident', y, 3.0, { x, wrong: true, state: 'still', delay: 0 });
          q.tex = RT.Tex.peopleWrong[0];
        }
        this.flags.f6 = this.time;
        this.ui.say('They are all facing the walls.', 3);
        return;
      }
      if (n === 10) {
        const q = this.spawnNpc('resident', 1.6, 2.4, { wrong: true, state: 'still' });
        this.flags.f10 = this.time; RT.Audio.breath();
        return q;
      }
      if (n === 2 && i === 3) { RT.Audio.giggle(); const c = this.spawnNpc('resident', 1.6, 1.9, { delay: 2.5 }); c.tex = RT.Tex.peopleWrong[1]; return; }
      if (r < chance) {
        const runner = Math.random() < 0.15 + i * 0.12;
        const close = Math.random() < 0.1 + i * 0.08;
        this.spawnNpc('resident', close ? 7.2 : 1.6, runner ? 2.6 : RT.rand(1.0, 1.4), { delay: close ? 1.4 : RT.rand(0.3, 1.5), wrong: i >= 3 && Math.random() < 0.5 });
        if (!this.flags.firstResident) { this.flags.firstResident = true; this.ui.say('Someone is coming. You must ride alone. Close the doors. [panel: C]', 4); }
      }
    }

    womanArrives() {
      this.setFloor(5, 'p', CORR);
      this.roomLit.p = true;
      this.openDoors();
      this.blockClose = true;
      const w = this.woman;
      w.hidden = false; w.x = 9.5; w.y = 9.4;
      this.womanTween = { from: [9.5, 9.4], to: [8.35, 14.65], t: -2.2, dur: 1.6 };
      RT.Audio.music(false);
      this.ui.say('Someone is waiting on the fifth floor.', 3);
      setTimeout(() => this.game.world === this && this.phase === 'ride' && this.ui.say('Do not look at her. Do not speak to her.', 4), 2600);
    }

    enterOtherWorld() {
      this.closePanel();
      this.woman.hidden = true;
      this.setFloor(10, 'o', OTHER);
      this.phase = 'other';
      this.ambient = 0.1; this.ambientTint = [1, 0.22, 0.2];
      this.carFlicker = 3;
      setTimeout(() => { if (this.game.world !== this) return; this.carLight = 0; RT.Audio.thud(); this.openDoors(); RT.Audio.music(true, 2.5); }, 1800);
      setTimeout(() => this.game.world === this && this.ui.say('She is gone. The doors open on the tenth floor, but not your tenth floor.', 5), 2600);
      setTimeout(() => { if (this.game.world !== this) return; this.hasPhone = true; this.ui.say('There is a red light somewhere out there. Your phone has a torch.  [F]', 5); }, 4500);
      // the Others
      for (const [x, y] of [[17.5, 1.5], [11.5, 3.5], [3.5, 5.5], [17.5, 7.5]]) this.spawnOther(x, y);
    }
    spawnOther(x, y) {
      const n = this.spawnNpc('other', y, 1, { x, state: 'hunt' });
      n.field = null; n.ft = 0; return n;
    }
    homeAgain() {
      this.setFloor(1, 'y', LOBBY);
      this.roomLit.y = true; this.ambientTint = null; this.ambient = 0.05; this.carLight = 1;
      RT.Audio.music(false);
      this.openDoors();
      this.phase = 'over';
      setTimeout(() => this.game.world === this && this.ui.say('The lobby. The lights are on.', 3), 1200);
      setTimeout(() => this.game.world === this && this.game.endLevel('win'), 4200);
    }

    // ---------------- interaction ----------------
    findTarget() {
      const p = this.player, ca = Math.cos(p.a), sa = Math.sin(p.a);
      for (let d = 0.1; d < 1.6; d += 0.05) {
        const x = p.x + ca * d, y = p.y + sa * d, cx = x | 0, cy = y | 0;
        if (this.map.isWall(cx, cy)) {
          if (cx === DOOR.x && cy === DOOR.y && this.door > 0.3) continue;
          const px = (p.x + ca * (d - 0.05)) | 0, py = (p.y + sa * (d - 0.05)) | 0;
          const f = px < cx ? 'W' : px > cx ? 'E' : py < cy ? 'N' : 'S';
          const dec = this.map.decalAt(cx, cy, f);
          if (!dec) return null;
          if (dec.kind === 'panel') return { label: '[E] Use the panel', act: () => this.openPanel() };
          if (dec.kind === 'call') return { label: '[E] Call the elevator', act: () => this.callElevator() };
          if (dec.kind === 'cross' && !this.crossSeen) return { label: '[E] Look at the red cross', act: () => this.seeCross() };
          return null;
        }
      }
      return null;
    }
    callElevator() {
      RT.Audio.click();
      if (this.phase !== 'lobby') return this.ui.say(this.phase === 'other' ? 'The button is cold. Nothing happens.' : '', 2);
      if (this.door > 0 || this.called) return;
      this.called = true;
      this.ui.say('Somewhere above you, the elevator starts down.', 3);
      this.moving = { from: 7, to: 1, t: 0, dur: 5, call: true }; RT.Audio.setHum(0.15);
    }
    seeCross() {
      this.crossSeen = true;
      RT.Audio.stinger();
      this.ui.bigText('THE OTHER WORLD', 3, 'You are the only living person here.');
      this.ui.say('Get back to the elevator. Do the sequence again to go home.', 5);
      // they know now
      for (let i = 0; i < 2; i++) {
        const cells = [];
        for (let y = 1; y < 11; y++) for (let x = 1; x < 19; x++) if (OTHER[y][x] === 'o' && RT.dist(x, y, this.player.x, this.player.y) > 6) cells.push([x + 0.5, y + 0.5]);
        const [x, y] = RT.choice(cells); this.spawnOther(x, y);
      }
    }
    openPanel() {
      if (this.panelOpen) return;
      this.panelOpen = true;
      this.game.keepUnlocked = true;
      if (document.pointerLockElement) document.exitPointerLock();
      this.ui.setPanel(this);
      this.ui.say('Press a floor. Number keys work too (0 = 10). C closes the doors.', 3);
    }
    closePanel() {
      if (!this.panelOpen) return;
      this.panelOpen = false;
      this.ui.setPanel(null);
      this.game.keepUnlocked = false;
      if (!RT.Input.touch && this.game.state === 'play') this.game.canvas.requestPointerLock?.();
    }
    handlePause() { if (this.panelOpen) { this.closePanel(); return true; } return false; }
    panelAction(a) {
      if (a === 'close') { RT.Audio.click(); if (this.phase === 'other') return this.ui.say('Nothing happens.', 1.5); return this.closeDoors(); }
      if (a === 'open') { RT.Audio.click(); if (!this.moving && !this.target && this.phase !== 'other' && this.phase !== 'return') this.openDoors(); return; }
      if (a === 'back') return this.closePanel();
      this.pressFloor(a);
    }

    // ---------------- update ----------------
    update(dt, input) {
      this.time += dt;
      const p = this.player;
      if (this.phase === 'dead') return;

      // panel input
      const nearPanel = this.panelOpen;
      for (let i = 1; i <= 10; i++) if (input.take('f' + i) && nearPanel) this.panelAction(i);
      if (input.take('close') && nearPanel) this.panelAction('close');
      if (input.take('open') && nearPanel) this.panelAction('open');
      const moveKeys = input.down('fwd') || input.down('back') || input.down('left') || input.down('right') || Math.abs(input.moveX) + Math.abs(input.moveY) > 0.3;
      if (this.panelOpen && moveKeys) this.closePanel();

      RT.movePlayer(this, dt, input, { frozen: this.panelOpen });
      if (this.moving) p.bob = Math.round(Math.sin(this.time * 30) * 0.6);

      const target = this.panelOpen ? null : this.findTarget();
      this.ui.setPrompt(this.talkWin > 0 && !this.woman.hidden ? '[T] Answer her' : target ? target.label : '');
      if (input.take('interact')) { if (this.panelOpen) this.closePanel(); else if (target) target.act(); }
      if (input.take('talk')) this.speak();
      if (input.take('flashlight')) {
        if (!this.hasPhone) this.ui.say('Not here. Not yet.', 1.5);
        else if (this.battery <= 0) this.ui.say('The phone is dead.', 1.5);
        else { this.flashOn = !this.flashOn; RT.Audio.click(); }
      }
      input.take('relight'); input.take('salt');

      this.updateDoors(dt);
      this.updateMotion(dt);
      this.updateNpcs(dt);
      this.updateWoman(dt);
      this.updateOther(dt);

      // car light & flicker
      if (this.carFlicker > 0) { this.carFlicker -= dt; this.roomLit.e = this.carLight > 0 && Math.random() > 0.45; }
      else this.roomLit.e = this.carLight > 0 && !(this.phase === 'descend' && Math.random() < 0.06);
      if (this.style === 'p' && this.floor === 2 && this.idx === 4 && this.phase === 'ride') this.roomLit.p = Math.random() > 0.9;

      // lights
      const L = this.lights; L.length = 0;
      if (this.flashOn && this.battery > 0) {
        L.push({ x: p.x, y: p.y, radius: 9, intensity: 1.7 * (this.battery < 0.15 ? (Math.random() > 0.2 ? 1 : 0.2) : 1), r: 0.9, g: 0.95, b: 1, cone: true, dx: Math.cos(p.a), dy: Math.sin(p.a) });
        this.battery = Math.max(0, this.battery - dt / 75);
        if (this.battery <= 0) { this.flashOn = false; this.ui.say('Your phone dies.', 3); RT.Audio.thud(); }
      }
      if (this.roomLit.e && this.door > 0.2) L.push({ x: 9.5, y: 12.2, radius: 3.2, intensity: 0.7 * this.door, r: 1, g: 0.97, b: 0.85 });
      if (this.grid === OTHER) L.push({ x: 2.5, y: 0.7, radius: 3.5, intensity: 1.1, r: 1, g: 0.15, b: 0.1 });
      if (this.grid === CORR && this.style === 'q') L.push({ x: 9.5, y: 0.7, radius: 3.5, intensity: 1.0, r: 1, g: 0.15, b: 0.1 });

      this.updateHud();
      this.updateAudio(dt);
    }

    updateDoors(dt) {
      const prev = this.door;
      if (this.door < this.doorTarget) this.door = Math.min(this.doorTarget, this.door + dt * DOOR_SPEED * (this.phase === 'other' ? 0.5 : 1));
      if (this.door > this.doorTarget) this.door = Math.max(this.doorTarget, this.door - dt * DOOR_SPEED);
      if (this.door >= 1) {
        this.doorOpenT += dt;
        // doors give up and close by themselves after a while (except the lobby before you start)
        if (this.doorOpenT > 9 && (this.phase === 'ride') && !this.target) this.closeDoors();
      } else this.doorOpenT = 0;
      if (prev > 0 && this.door === 0 && this.target !== null) this.startMove();
      // back in the car in the Other World: the doors close behind you
      if (this.phase === 'other' && this.crossSeen && this.insideCar() && this.player.y > 12.3 && this.door > 0) {
        this.phase = 'return'; this.idx = 0; this.panelAlive = false; this.closeDoors();
        this.carLight = 1; this.carFlicker = 1.5;
        setTimeout(() => { if (this.game.world !== this) return; this.panelAlive = true; this.ui.say('The panel flickers on. Do it again. All of it.', 4); }, 1600);
      }
      // a door closing on someone
      if (this.doorTarget === 0 && this.door > 0.3) {
        for (const n of this.npcs) if (!n.hidden && n.y > 9.9 && Math.abs(n.x - 9.5) < 0.8 && n.state === 'walk') { this.openDoors(); this.ui.say('A hand catches the door.', 2.5); RT.Audio.thud(); }
      }
    }

    updateMotion(dt) {
      const m = this.moving; if (!m) return;
      m.t += dt;
      const cur = Math.round(RT.lerp(m.from, m.to, Math.min(1, m.t / m.dur)));
      this.ui.setClock((m.to > m.from ? '▲ ' : '▼ ') + cur);
      // the descent home: the car stops at five for a moment
      if (this.phase === 'descend' && cur === 5 && !this.flags.stop5) {
        this.flags.stop5 = true; m.pauseT = 2.5; this.carLight = 0; RT.Audio.thud();
        const s = RT.choice(SPOTS); this.woman.x = s[0]; this.woman.y = s[1]; this.woman.hidden = false;
      }
      if (m.pauseT > 0) {
        m.t -= dt; m.pauseT -= dt;
        if (m.pauseT <= 0) { this.carLight = 1; this.woman.hidden = true; }
      }
      if (m.t >= m.dur) {
        if (m.call) { this.moving = null; RT.Audio.ding(1); RT.Audio.setHum(0.06); this.ui.setClock('■ 1'); this.openDoors(); this.firstCall(); return; }
        this.ui.setClock('■ ' + m.to);
        this.floor = m.to;
        this.arrive(m.to);
      }
    }
    firstCall() {
      if (this.flags.lobbyGuy) return;
      this.flags.lobbyGuy = true;
      setTimeout(() => {
        if (this.game.world !== this || this.phase !== 'lobby' || this.grid !== LOBBY) return;
        const n = this.spawnNpc('resident', 1.4, 1.0, { delay: 0, x: 9.5 });
        n.lobby = true;
        RT.Audio.thud();
        this.ui.say('The front door bangs. Someone is coming. You have to ride alone: get in and close the doors.', 5);
      }, 1500);
    }

    updateNpcs(dt) {
      const p = this.player;
      for (const n of this.npcs) {
        if (n.hidden || n.kind === 'other' && this.grid === OTHER) continue;
        if (n.state === 'still') {
          // figures that wait. Leave the doors open too long and they come.
          if (this.door > 0.3 && this.doorOpenT > (this.floor === 6 ? 4 : 5)) { n.state = 'walk'; n.speed = this.floor === 6 ? 2.4 : 2.8; RT.Audio.gasp(); }
          continue;
        }
        if (n.state === 'wait') { n.delay -= dt; if (n.delay <= 0) n.state = 'walk'; continue; }
        if (n.state === 'walk') {
          const tx = 9.5, ty = 10.7;
          const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
          if (d > 0.05) { const s = Math.min(d, n.speed * dt); n.x += dx / d * s; n.y += dy / d * s; }
          if (d < 0.1) {
            if (this.door > 0.35) this.boarded(n);
            else { n.state = 'blocked'; }
          }
          if (n.kind === 'other' && this.door > 0.35 && RT.dist(n.x, n.y, p.x, p.y) < 0.9) this.die('boarded');
        }
        if (n.state === 'blocked') {
          n.bang = (n.bang || 0) - dt;
          if (n.bang <= 0 && this.door === 0 && n.kind === 'other') { n.bang = 0.5; RT.Audio.knock(0.8); }
          if (this.door > 0.35) n.state = 'walk';
        }
      }
    }
    boarded(n) {
      if (n.kind === 'other') return this.die('boarded');
      n.hidden = true;
      if (n.lobby && this.phase === 'lobby') {
        this.ui.say('They get in with you, press 7 and stare at the doors. You get out and wait for it to come back.', 5);
        this.player.x = 9.5; this.player.y = 9.6; this.player.a = Math.PI / 2;
        this.door = 0; this.doorTarget = 0; this.called = false; this.flags.lobbyGuy = false;
        return;
      }
      RT.Audio.gasp();
      this.breakSequence('Someone got in beside you. You are no longer alone.');
    }

    // ---------------- the woman ----------------
    updateWoman(dt) {
      const w = this.woman, p = this.player;
      if (this.womanTween) {
        const tw = this.womanTween; tw.t += dt;
        if (tw.t > 0) {
          const k = Math.min(1, tw.t / tw.dur);
          w.x = RT.lerp(tw.from[0], tw.to[0], k); w.y = RT.lerp(tw.from[1], tw.to[1], k);
          if (k >= 1) {
            this.womanTween = null;
            if (this.phase === 'ride') {
              this.phase = 'woman'; this.blockClose = false; this.closeDoors();
              this.decals.get(RT.FACE_KEY(9, 15, 'N')).tex = RT.Tex.decals.mirrorWoman;
              this.nextLine = 5; this.nextMove = 6;
            }
          }
        }
      }
      if (w.hidden) { this.gaze = Math.max(0, this.gaze - dt); return; }
      const d = RT.dist(w.x, w.y, p.x, p.y);
      const ang = Math.abs(RT.angleDiff(Math.atan2(w.y - p.y, w.x - p.x), p.a));
      const visible = this.roomLit.e || this.flashOn;
      // looking at her
      let g = -0.45;
      const k = this.womanTween ? 0.55 : 1;
      if (visible && ang < 0.24) g = 1.15 * k; else if (visible && ang < 0.55) g = 0.45 * k;
      this.gaze = RT.clamp(this.gaze + g * dt, 0, 1);
      if (this.gaze > 0.2 && !this.flags.gazeWarn) { this.flags.gazeWarn = true; this.ui.say('Don\'t look at her. Look away. Now.', 2.5); }
      if (this.gaze >= 1) return this.die('looked');
      if (d < 0.42 && !this.womanTween) return this.die('touched');
      if (this.phase !== 'woman' && this.phase !== 'ascend') return;

      // she talks
      this.talkWin = Math.max(0, this.talkWin - dt);
      this.nextLine -= dt;
      if (this.nextLine <= 0) {
        this.nextLine = RT.rand(5, 9);
        const line = RT.choice(LINES);
        this.ui.say(`"${line}"`, 3.2, 'her');
        if (line === 'Turn around.' || line === 'Look at me.') RT.Audio.breath();
        this.talkWin = 3.2;
        RT.Audio.gasp();
      }
      // she moves, but only when you can't see her
      this.nextMove -= dt;
      if (this.nextMove <= 0 && ang > 0.95) {
        this.nextMove = RT.rand(4, 7) * (this.phase === 'ascend' ? 0.6 : 1);
        let spots = SPOTS.filter((s) => RT.dist(s[0], s[1], p.x, p.y) > 0.75 && RT.dist(s[0], s[1], w.x, w.y) > 0.3);
        // sometimes: right behind you
        const bx = p.x - Math.cos(p.a) * 0.8, by = p.y - Math.sin(p.a) * 0.8;
        if (Math.random() < (this.phase === 'ascend' ? 0.6 : 0.3) && bx > 8.3 && bx < 10.7 && by > 12.3 && by < 14.7) {
          spots = [[bx, by]]; RT.Audio.breath();
          setTimeout(() => this.game.world === this && !this.woman.hidden && this.ui.say('You can feel her breath on your neck.', 2.5), 300);
        }
        if (spots.length) { const s = RT.choice(spots); w.x = s[0]; w.y = s[1]; RT.Audio.creak(0); }
      }
    }
    speak() {
      if (this.woman.hidden || (this.phase !== 'woman' && this.phase !== 'ascend')) return this.ui.say('You whisper to yourself. Nobody answers.', 2);
      this.die('spoke');
    }

    // ---------------- the Other World ----------------
    field(tx, ty) {
      const f = new Int16Array(W * H).fill(-1), q = [ty * W + tx]; f[ty * W + tx] = 0;
      for (let i = 0; i < q.length; i++) {
        const c = q[i], cx = c % W, cy = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ch = this.grid[ny][nx]; if (ch === '#' || (ch === 'D' && this.door < 0.5)) continue;
          const ni = ny * W + nx; if (f[ni] >= 0) continue; f[ni] = f[c] + 1; q.push(ni);
        }
      }
      return f;
    }
    los(ax, ay, bx, by) {
      const d = RT.dist(ax, ay, bx, by), n = Math.ceil(d / 0.1);
      for (let i = 1; i < n; i++) { const t = i / n; if (this.map.isWall((ax + (bx - ax) * t) | 0, (ay + (by - ay) * t) | 0) && !(((ax + (bx - ax) * t) | 0) === DOOR.x && ((ay + (by - ay) * t) | 0) === DOOR.y && this.door > 0.5)) return false; }
      return true;
    }
    seen(n) {
      const p = this.player, d = RT.dist(n.x, n.y, p.x, p.y);
      const ang = Math.abs(RT.angleDiff(Math.atan2(n.y - p.y, n.x - p.x), p.a));
      if (ang > 0.62 || !this.los(p.x, p.y, n.x, n.y)) return false;
      if (d < 1.8) return true;
      if (this.flashOn && this.battery > 0 && ang < 0.42 && d < 8.5) return true;
      if (RT.dist(n.x, n.y, 2.5, 0.7) < 3) return true;           // in the red glow
      if (this.roomLit.e && RT.dist(n.x, n.y, 9.5, 12.5) < 3.2) return true;
      return false;
    }
    updateOther(dt) {
      if (this.grid !== OTHER) return;
      const p = this.player;
      const awake = p.y < 11.2 || this.crossSeen;
      if (!awake) return;
      const speed = this.crossSeen ? 1.9 : 1.25;
      const ptx = p.x | 0, pty = p.y | 0;
      for (const n of this.npcs) {
        if (n.kind !== 'other' || n.hidden) continue;
        if (this.seen(n)) { if (n.state === 'walk') { n.state = 'frozen'; } continue; }
        n.state = 'walk';
        n.ft -= dt;
        if (!n.field || n.ft <= 0 || n.ftx !== ptx || n.fty !== pty) { n.field = this.field(ptx, pty); n.ft = 0.4; n.ftx = ptx; n.fty = pty; }
        const cx = n.x | 0, cy = n.y | 0, here = n.field[cy * W + cx];
        if (here < 0) continue;
        let tx = p.x, ty = p.y;
        if (here > 1) {
          let best = here, bx = cx, by = cy;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = n.field[(cy + dy) * W + cx + dx]; if (v >= 0 && v < best) { best = v; bx = cx + dx; by = cy + dy; } }
          tx = bx + 0.5; ty = by + 0.5;
        }
        const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
        if (d > 0.01) { const s = Math.min(d, speed * dt); n.x += dx / d * s; n.y += dy / d * s; }
        if (RT.dist(n.x, n.y, p.x, p.y) < 0.55) return this.die('others');
        if (Math.random() < dt * 0.5 && RT.dist(n.x, n.y, p.x, p.y) < 9) RT.Audio.creak(RT.clamp(Math.sin(RT.angleDiff(Math.atan2(n.y - p.y, n.x - p.x), p.a)), -1, 1));
      }
    }

    // ---------------- endings ----------------
    die(reason) {
      if (this.phase === 'dead' || this.phase === 'over') return;
      this.phase = 'dead';
      this.closePanel();
      const her = ['looked', 'spoke', 'touched', 'patience'].includes(reason);
      if (her) {
        const p = this.player; this.woman.hidden = false; this.woman.x = p.x + Math.cos(p.a) * 0.4; this.woman.y = p.y + Math.sin(p.a) * 0.4; this.woman.z = -0.4;
      }
      this.carLight = 1;
      this.ui.flash('rgba(160,0,0,0.6)');
      this.ui.jumpscare(her ? RT.Tex.faces.woman : RT.Tex.faces.other, 1.4);
      RT.Audio.scream();
      RT.Audio.music(false); RT.Audio.setHum(0);
      setTimeout(() => this.game.endLevel(reason === 'lost' ? 'lost' : 'dead', reason), 1600);
    }
    ending(kind, reason) {
      const stats = `Sequence breaks: ${this.strikes}/3`;
      if (kind === 'win') return { win: true, title: 'GROUND FLOOR', text: 'The doors open on the lobby. The lights are on, the mailboxes are where they should be, and the night air smells of rain. Everything is exactly as you left it. Almost exactly.', stats, next: 'Next: <b>Level 3 &mdash; The Hooded Man</b> (locked in this demo)' };
      if (kind === 'abort') return { title: 'YOU STOPPED IT', text: 'You pressed another floor before the car reached the tenth. She stepped out without a word. You will never know where it was taking you. But some nights, when you ride alone, the elevator stops at five, and the doors open on nobody.', stats };
      if (kind === 'lost' || reason === 'lost') return { title: 'LOST BETWEEN FLOORS', text: 'Wrong floor. The doors opened on the same red corridor. And again. And again. You are still riding.', stats };
      const D = {
        looked: ['YOU LOOKED AT HER', 'Only for a second. It was long enough for her to look back.'],
        spoke: ['YOU SPOKE TO HER', 'You answered. She smiled with far too many teeth, and the car began to fall.'],
        touched: ['YOU TOUCHED HER', 'Her skin was cold and wet, like something pulled out of a lake. She turned around.'],
        patience: ['THE BUILDING NOTICED YOU', 'You broke the sequence too many times. On the last ride down the lights went out, and someone was standing behind you.'],
        others: ['THEY CAUGHT YOU', 'You looked away for one moment too long.'],
        boarded: ['IT GOT IN', 'The doors were still open. It did not need long.'],
      };
      const [title, text] = D[reason] || ['YOU DID NOT SURVIVE', ''];
      return { title, text, stats };
    }

    // ---------------- HUD & audio ----------------
    updateHud() {
      const dots = (arr) => arr.map((_, i) => (i < this.idx ? '■' : '□')).join(' ');
      let obj = '';
      switch (this.phase) {
        case 'lobby': obj = this.door > 0 ? 'Get in alone. Begin the sequence at the panel.' : 'Call the elevator.'; break;
        case 'ride': obj = `Ride the sequence alone.  ${dots(RIDE.slice(0, 5))}`; break;
        case 'woman': obj = 'Do not look at her. Do not speak to her. Press 1.'; break;
        case 'ascend': obj = 'It is going up. Don\'t look at her.'; break;
        case 'other': obj = this.crossSeen ? 'Get back to the elevator.' : 'Find the red light. Keep them in sight.'; break;
        case 'return': obj = `Repeat the sequence to go home.  ${dots(RETURN.slice(0, 5))}`; break;
        default: obj = '...';
      }
      if (this.strikes && (this.phase === 'ride' || this.phase === 'lobby')) obj += `   ·   breaks ${this.strikes}/3`;
      this.ui.setObjectives(null, obj);
      this.ui.setMarker(this, null);
      this.ui.setInventory(this.hasPhone ? [`Phone ${Math.round(this.battery * 100)}%${this.flashOn ? ' (torch on)' : ''}`] : []);
      this.ui.setAlarm(null);
      this.ui.setOverlays({ cold: this.grid === OTHER ? 0.15 : 0, drowsy: 0, dark: Math.min(1, this.gaze * 1.1) });
      if (this.panelOpen) this.ui.setPanel(this);
    }
    updateAudio(dt) {
      let whisper = 0, pan = 0, heart = 0;
      if (!this.woman.hidden) {
        const p = this.player, w = this.woman;
        whisper = 0.15 + this.gaze * 0.8 + (this.talkWin > 0 ? 0.2 : 0);
        pan = RT.clamp(Math.sin(RT.angleDiff(Math.atan2(w.y - p.y, w.x - p.x), p.a)), -1, 1);
        heart = 0.4 + this.gaze * 0.6;
      }
      if (this.grid === OTHER || this.style === 'q') {
        heart = Math.max(heart, 0.3);
        for (const n of this.npcs) if (n.kind === 'other' && !n.hidden) { const d = RT.dist(n.x, n.y, this.player.x, this.player.y); heart = Math.max(heart, RT.clamp(1 - d / 6, 0, 1)); }
      }
      RT.Audio.update(dt, { drone: this.grid === OTHER ? 0.4 : 0.15, whisper, whisperPan: pan, heart });
    }

    drawViewModel(ctx, W, H, t) {
      if (!this.hasPhone) return;
      const p = this.player, sway = Math.sin(p.walkPhase * 0.5) * 2, bob = Math.abs(Math.cos(p.walkPhase * 0.5)) * 2;
      const x = Math.round(W * 0.7 + sway), y = Math.round(H - 46 + bob);
      ctx.fillStyle = '#7a5040'; ctx.fillRect(x + 2, y + 26, 22, 20);
      ctx.fillStyle = '#151518'; ctx.fillRect(x, y, 26, 44);
      const on = this.flashOn && this.battery > 0;
      ctx.fillStyle = on ? '#3a4a5a' : '#0a0c10'; ctx.fillRect(x + 2, y + 3, 22, 34);
      if (on) { ctx.fillStyle = '#c8d8e8'; ctx.fillRect(x + 4, y + 5, Math.round(18 * this.battery), 2); }
      ctx.fillStyle = '#9a6a56'; ctx.fillRect(x - 2, y + 30, 8, 12); ctx.fillRect(x + 20, y + 28, 8, 14);
    }
  }

  RT.Level2 = Level2;
})(window.RT);

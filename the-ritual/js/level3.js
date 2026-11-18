// LEVEL 3 - THE HOODED MAN
// Prepare the house, perform the telephone ritual without being watched,
// take the black cab, survive the ride without panicking or speaking, whisper
// the destination, then close the ritual properly at home.
(function (RT) {
  const HOUSE = [
    '########################',
    '#zzzzzzzzzzzzzzzzzzzzzz#',
    '#zzzzzzzzzzzzzzzzzzzzzz#',
    '#zzzzzzzzzzzzzzzzzzzzzz#',
    '#zzzzzzzzzzzzzzzzzzzzzz#',
    '#######zzzzzzzzzz#######',
    '#######zzzzzzzzzz#######',
    '###########F############',
    '#lllllllll#hh#rrrrrrrrr#',
    '#lllllllll#hh#rrrrrrrrr#',
    '#llllllllldhhdrrrrrrrrr#',
    '#lllllllll#hh#rrrrrrrrr#',
    '#lllllllll#hh#rrrrrrrrr#',
    '#####d#####hh###########',
    '#kkkkkkkkk#hh#bbbbbbbbb#',
    '#kkkkkkkkk#hhdbbbbbbbbb#',
    '#kkkkkkkkk#hh#bbbbbbbbb#',
    '#kkkkkkkkk#hh#bbbbbbbbb#',
    '#####B##################',
    '#gggggggggggggggggggggg#',
    '#gggggggggggggggggggggg#',
    '#gggggggggggggggggggggg#',
    '#gggggggggggggggggggggg#',
    '########################',
  ];
  const CAB = ['#####', '#####', '##c##', '#####'];
  const ROOMS = ['l', 'h', 'r', 'k', 'b'];
  const ROOM_NAMES = { l: 'living room', h: 'hall', r: 'bedroom', k: 'kitchen', b: 'bathroom' };
  const NUM_A = '20496888', NUM_B = '25515823', NUM_C = '200082';
  const STAGE_LEN = [55, 45, 45, 50];
  const STAGE_TEXT = [
    'A highway you have never seen. Street lamps pass, one after another after another.',
    'The sky outside has turned the colour of raw meat.',
    'There is water where the road should be. Buildings hang upside down from the clouds.',
    'There is nothing outside any more. Just the hum of the engine.',
  ];
  const PASSENGER_LINES = ['Going far?', 'Nice night for it.', 'You look tired. Talk to me.', 'Have we met?', 'What\'s your name?', 'Hey. HEY. I\'m talking to you.', 'Say something. Anything.'];
  const WOMAN_LINES = ['Which floor are you going to?', 'We\'ve met before.', 'Why won\'t you look at me?', 'You left me in the elevator.'];

  class Level3 {
    constructor(game, opts = {}) {
      this.game = game; this.ui = game.ui;
      this.player = { x: 11.6, y: 9.0, a: Math.PI / 2, bob: 0, walkPhase: 0 };
      this.fx = { cold: 0, hallucinate: 0 };
      this.lights = []; this.ambient = 0.08; this.ambientTint = null;
      this.skyRooms = { L3z: true, L3g: true }; this.skyTint = [0.7, 0.75, 1];
      this.roomLit = {}; for (const r of ROOMS) this.roomLit['L3' + r] = true;
      this.time = 0; this.flags = {};
      this.phase = 'prep';
      this.pulse = 78;
      this.inv = { salt: true, medal: true, cords: 0, cordsFound: 0, usedCord: false, usedBurned: false, keys: false, watch: false, matches: false, ashes: false, cordOnPhone: false };
      this.stash = { salt: false, medal: false };
      this.devices = { tv: true, radio: true, laptop: true };
      this.ph = { stage: 0, dial: '', handsetUp: false, tied: false, countedAt: -99, counted2: false, status: 'Sit. Breathe. The rules are in your pocket (J).', spin: 0, warned: false };
      this.presence = { active: false, t: 0, next: RT.rand(40, 55), sprite: { x: 0, y: 0, h: 1.05, z: 0, hidden: true, getTex: (t) => RT.Tex.hooded[0] } };
      this.after = { dialed: false, aside: false, thanked: false, cordRemoved: false, burned: false, buried: false, salted: false, cleansed: false };
      this.cleansed1 = false; this.tinged = false;
      this.doors = {};
      for (const [x, y, ext, locked] of [[10, 10], [13, 10], [5, 13], [13, 15], [11, 7, true, true], [5, 18, true, false]]) this.doors[x + ',' + y] = { x, y, open: ext ? 0 : 1, target: ext ? 0 : 1, ext: !!ext, locked: !!locked };
      this.windows = {};
      for (const [x, y, f, front] of [[3, 7, 'S', true], [7, 7, 'S', true], [17, 7, 'S'], [20, 7, 'S'], [0, 15, 'E'], [23, 15, 'W'], [8, 18, 'N'], [19, 18, 'N']]) {
        this.windows[RT.FACE_KEY(x, y, f)] = { x, y, f, front: !!front, open: (x === 20 || x === 0 || x === 23), curtain: false };
      }
      this.setMode('house');
      if (!opts.attract) {
        this.ui.setClock('1:20 A.M.');
        this.ui.say('1:20 a.m. The house is too bright and too loud. Get it ready.', 5);
        setTimeout(() => this.game.world === this && this.phase === 'prep' && this.ui.say('Press J to read the instructions. Follow them exactly.', 4), 5500);
        RT.Audio.setRain(0.08); RT.Audio.music(true, 0.2);
      }
    }

    // ================= world interface =================
    setMode(mode) {
      this.mode = mode;
      this.grid = mode === 'house' ? HOUSE : CAB;
      const L = this, G = this.grid, MW = G[0].length, MH = G.length;
      this.map = {
        W: MW, H: MH,
        isWall(x, y) { const r = G[y]; if (!r || x < 0 || x >= MW) return true; const c = r[x]; return c === '#' || c === 'd' || c === 'F' || c === 'B'; },
        roomAt(x, y) {
          const r = G[y]; if (!r || x < 0 || x >= MW) return null; const c = r[x];
          if (c === '#') return null; if (c === 'c') return 'cab'; if ('dFB'.includes(c)) return 'L3h'; return 'L3' + c;
        },
        doorAt(x, y) { const d = L.doors[x + ',' + y]; return mode === 'house' && d ? d.open : -1; },
        decalAt(x, y, f) { return L.decals.get(RT.FACE_KEY(x, y, f)); },
      };
      const D = RT.Tex.decals, list = [];
      const add = (x, y, f, kind, extra = {}) => list.push(Object.assign({ x, y, f, kind }, extra));
      if (mode === 'house') {
        for (const w of Object.values(this.windows)) add(w.x, w.y, w.f, 'window', { win: w, emissive: 0.1 });
        add(9, 7, 'S', 'switch', { room: 'l' }); add(12, 7, 'S', 'switch', { room: 'h' }); add(14, 7, 'S', 'switch', { room: 'r' });
        add(6, 13, 'S', 'switch', { room: 'k' }); add(14, 13, 'S', 'switch', { room: 'b' });
        add(10, 9, 'E', 'keys');
        add(1, 7, 'S', 'portrait'); add(16, 13, 'S', 'mirror');
        this.props = this.houseProps || (this.houseProps = this.makeHouseProps());
      } else {
        add(2, 1, 'S', 'cabwin', { w: 'front', emissive: 0.9 });
        add(1, 2, 'E', 'cabwin', { w: 'left', emissive: 0.9 });
        add(3, 2, 'W', 'cabwin', { w: 'right', emissive: 0.9, door: true });
        add(2, 3, 'N', 'cabwin', { w: 'rear', emissive: 0.9 });
        this.props = [];
        this.driver = { x: 2.3, y: 2.22, h: 0.5, z: 0.12, hidden: true, getTex: () => RT.Tex.driver[this.ride && this.ride.turn > 0 ? 1 : 0] };
        this.passenger = { x: 2.2, y: 2.86, h: 0.5, z: 0.1, hidden: true, getTex: (t) => this.passengerTex(t) };
        if (!this.winTex) this.winTex = { front: this.newWinTex(), left: this.newWinTex(), right: this.newWinTex(), rear: this.newWinTex() };
      }
      this.decals = new Map(list.map((d) => [RT.FACE_KEY(d.x, d.y, d.f), d]));
      this._cells = null;
    }
    makeHouseProps() {
      const S = RT.Tex.sprites, P = [];
      const prop = (tex, x, y, h, solid, extra = {}) => { const o = Object.assign({ tex, x, y, h, z: 0, solid }, extra); P.push(o); return o; };
      // living room
      prop(null, 2.5, 8.45, 0.7, 0.35, { special: 'tv', getTex: (t) => this.devices.tv ? S.tvOn[((t * 12) | 0) % 2] : S.tv });
      prop(S.sofa, 5, 11.7, 0.5, 0.55); prop(S.armchair, 2.3, 10.8, 0.55, 0.35); prop(RT.Tex.v.coffeetable, 5, 10.3, 0.25, 0.3);
      prop(S.plant, 9.3, 8.5, 0.6, 0.2); prop(S.bookshelf, 8.6, 12.5, 1.0, 0.3);
      // hall
      this.phoneProp = prop(null, 11.3, 11.0, 0.5, 0.25, { special: 'phone', getTex: () => this.ph.handsetUp ? RT.Tex.v.phoneTable_off : RT.Tex.v.phoneTable });
      prop(S.chair, 12.45, 11.0, 0.55, 0);
      prop(S.cabinet3, 12.6, 16.5, 0.5, 0.25, { special: 'stash' });
      prop(S.coatrack, 12.6, 8.4, 0.95, 0.15);
      // bedroom
      prop(S.bed, 18, 11.7, 0.45, 0.6); prop(RT.Tex.v.nightstand, 15.5, 12.4, 0.45, 0.25, { search: 'watch', what: 'nightstand' });
      prop(S.wardrobe, 22.5, 8.5, 1.0, 0.4, { search: 'cord', what: 'wardrobe' });
      prop(null, 19.5, 8.4, 0.6, 0.3, { special: 'laptop', getTex: () => S.laptop(this.devices.laptop) });
      // kitchen
      prop(RT.Tex.v.counter, 2.5, 14.4, 0.6, 0.3, { search: 'cord', what: 'drawer' });
      prop(RT.Tex.v.counter, 4, 14.4, 0.6, 0.3, { search: 'matches', what: 'drawer' });
      prop(RT.Tex.v.counter, 6.6, 14.4, 0.6, 0.3, { special: 'ksink' });
      prop(RT.Tex.v.counter, 8.4, 14.4, 0.6, 0.3);
      prop(null, 8.4, 14.55, 0.32, 0, { z: 0.58, special: 'radio', getTex: () => S.radio(this.devices.radio) });
      prop(RT.Tex.v.table, 5, 16.3, 0.55, 0.45);
      // bathroom
      prop(RT.Tex.v.sink, 17.5, 14.4, 0.7, 0.3, { special: 'bsink' }); prop(S.toilet, 21.4, 14.4, 0.5, 0.3); prop(S.bathtub, 21, 17.3, 0.42, 0.5);
      // outside
      prop(S.lampPost, 4.5, 1.5, 1.4, 0.15, { emissive: 0.8 }); prop(S.lampPost, 18.5, 1.5, 1.4, 0.15, { emissive: 0.8 });
      this.cabProp = prop(S.cab, 11.5, 2.4, 0.6, 0.6, { special: 'cab', hidden: true });
      this.dirtProp = prop(null, 11.5, 21, 0.18, 0, { special: 'dirt', getTex: () => this.after.salted ? S.dirtDone : S.dirt });
      prop(S.plant, 8, 5.5, 0.6, 0.2); prop(S.plant, 15, 5.5, 0.6, 0.2);
      // the presence, when it comes
      P.push(this.presence.sprite);
      this.stalker = { x: 2.5, y: 9.5, h: 1.05, z: 0, hidden: true, getTex: (t) => RT.Tex.hooded[this.stalker.moving ? 1 : 0] };
      P.push(this.stalker);
      return P;
    }
    get sprites() {
      if (this.mode === 'house') return this.props.filter((p) => !p.hidden);
      const out = [];
      if (!this.driver.hidden) out.push(this.driver);
      if (!this.passenger.hidden) out.push(this.passenger);
      return out;
    }
    get solids() { return this.mode === 'house' ? this.props.filter((p) => p.solid && !p.hidden && p !== this.stalker && p !== this.presence.sprite) : []; }
    get viewModel() { return {}; }
    get saltCircleRender() { return null; }
    blocked(cx, cy) {
      const r = this.grid[cy]; if (!r) return true; const c = r[cx];
      if (c === undefined || c === '#') return true;
      if ('dFB'.includes(c)) { const d = this.doors[cx + ',' + cy]; return !d || d.open < 0.75; }
      return false;
    }
    walkable(x, y) { return !this.blocked(x | 0, y | 0); }
    doorTex() { return RT.Tex.houseDoor; }
    decalTex(d) {
      const D = RT.Tex.decals;
      switch (d.kind) {
        case 'window': { const w = d.win; if (w.curtain) return D.win3Curtain; if (w.front && this.tinged) return D.win3Cab; return w.open ? D.win3Open : D.win3Shut; }
        case 'switch': return this.roomLit['L3' + d.room] ? D.switchOn : D.switchOff;
        case 'keys': return this.inv.keys ? D.hookEmpty : D.keysHook;
        case 'cabwin': return this.winTex[d.w];
        default: return D[d.kind];
      }
    }

    // ================= checks =================
    carrying() { return (this.inv.salt ? 1 : 0) + (this.inv.medal ? 1 : 0); }
    winList() { return Object.values(this.windows); }
    doorList() { return Object.values(this.doors); }
    lightsOn() { return ROOMS.filter((r) => this.roomLit['L3' + r]).length; }
    devicesOn() { return Object.values(this.devices).filter(Boolean).length; }
    precautions() {
      const w = this.winList();
      return {
        cleansed: this.cleansed1, unprotected: this.carrying() === 0,
        windows: w.every((x) => !x.open), curtains: w.every((x) => x.curtain),
        doors: this.doorList().every((d) => d.open < 0.05), lights: this.lightsOn() === 0, devices: this.devicesOn() === 0,
      };
    }
    // Every ritual step goes through here: doing anything while it is watching binds it to you.
    ritualStep() {
      if (this.presence.active && !this.presence.sprite.hidden) { this.die('bound'); return false; }
      return true;
    }

    // ================= update =================
    update(dt, input) {
      this.time += dt;
      const p = this.player;
      if (this.phase === 'dead' || this.phase === 'over') return;

      // breathing: eyes shut, pulse comes down
      this.breathing = input.down('wait') && !this.phoneOpen && !this.choiceOpen;
      if (this.breathing) this.pulse = Math.max(58, this.pulse - dt * 10);
      else if (this.pulse > 74) this.pulse -= dt * (this.phase === 'ride' ? 0.8 : 1.4);

      if (this.mode === 'house') this.updateHouse(dt, input);
      else this.updateCab(dt, input);

      if (this.beat) this.updateBeat(dt, input);
      for (const d of this.doorList()) { if (d.open < d.target) d.open = Math.min(d.target, d.open + dt * 2.2); if (d.open > d.target) d.open = Math.max(d.target, d.open - dt * 2.2); }

      if (this.phoneOpen) {
        for (let i = 0; i <= 9; i++) if (input.take('f' + (i === 0 ? 10 : i))) this.phoneAction('d' + i);
        if (this.ph.spin > 0) this.ph.spin = Math.max(0, this.ph.spin - dt * 500);
        this.ui.setPhone(this);
      }
      this.updateHud(dt);
      this.updateAudio(dt);
    }

    updateHouse(dt, input) {
      const p = this.player;
      RT.movePlayer(this, dt, input, { frozen: this.phoneOpen || this.breathing || this.choiceOpen, noSprint: false });
      const target = this.phoneOpen || this.choiceOpen ? null : this.findTarget();
      this.ui.setPrompt(this.breathing ? '' : target ? target.label : '');
      if (!this.beat && input.take('interact')) {
        if (this.phoneOpen) this.closePhone();
        else if (target && target.act) target.act();
      }
      if (input.take('salt') && target && target.alt) target.alt();
      if (input.take('relight')) this.checkWatch();
      if (input.take('talk')) this.ui.say('You say something to the empty house. It does not answer. Yet.', 2.5);

      // lights
      const L = this.lights; L.length = 0;
      for (const lp of this.props) if (lp.tex === RT.Tex.sprites.lampPost) L.push({ x: lp.x, y: lp.y + 0.2, radius: 6.5, intensity: 1.2, r: 1, g: 0.85, b: 0.55 });
      if (this.devices.tv) L.push({ x: 2.5, y: 9.0, radius: 3.5, intensity: 0.5 + Math.random() * 0.25, r: 0.7, g: 0.8, b: 1 });
      if (this.burnT > 0) { this.burnT -= dt; L.push({ x: 6.6, y: 14.7, radius: 3, intensity: 1.2, r: 1, g: 0.6, b: 0.25 }); }
      const outside = p.y < 7 || p.y > 18;
      this.ambient = outside ? (this.tinged ? 0.24 : 0.15) : 0.085;
      if (this.tinged && !this.cabProp.hidden) L.push({ x: 11.5, y: 2.9, radius: 2.4, intensity: 0.8, r: 1, g: 0.85, b: 0.4 });
      this.skyTint = this.tinged ? [1.1, 0.5, 1.3] : [0.7, 0.75, 1];

      if (this.phase === 'prep') this.updatePresence(dt);
      if (this.phase === 'run') this.updateRun(dt);
      if (this.phase === 'after') this.updateStalker(dt);
    }

    // ---------- the presence ----------
    updatePresence(dt) {
      const pr = this.presence, p = this.player, s = pr.sprite;
      if (this.ph.stage >= 7) { s.hidden = true; pr.active = false; return; }
      if (!pr.active) {
        pr.next -= dt;
        if (pr.next <= 0) {
          const cells = [];
          for (let y = 8; y < 18; y++) for (let x = 1; x < 23; x++) {
            if (!'lhrkb'.includes(HOUSE[y][x])) continue;
            const cx = x + 0.5, cy = y + 0.5, d = RT.dist(cx, cy, p.x, p.y);
            if (d < 3 || d > 8) continue;
            const seen = this.los(p.x, p.y, cx, cy);
            cells.push([cx, cy, seen]);
          }
          const vis = cells.filter((c) => c[2]);
          const pick = RT.choice(vis.length ? vis : cells);
          if (pick) {
            s.x = pick[0]; s.y = pick[1]; s.hidden = false; pr.active = true; pr.t = RT.rand(10, 14);
            RT.Audio.breath();
            this.ui.say(this.flags.presenceSeen ? 'You feel watched again.' : 'You feel like you are being watched.', 3);
            this.flags.presenceSeen = true;
          } else pr.next = 5;
        }
        return;
      }
      pr.t -= dt;
      const ang = Math.abs(RT.angleDiff(Math.atan2(s.y - p.y, s.x - p.x), p.a));
      if (ang < 0.5 && this.los(p.x, p.y, s.x, s.y)) this.pulse = Math.min(200, this.pulse + dt * 4);
      if (pr.t <= 0) { pr.active = false; s.hidden = true; pr.next = RT.rand(35, 60); this.ui.say('The feeling passes.', 2); }
    }
    los(ax, ay, bx, by) {
      const d = RT.dist(ax, ay, bx, by), n = Math.ceil(d / 0.1);
      for (let i = 1; i < n; i++) { const t = i / n; if (this.blocked((ax + (bx - ax) * t) | 0, (ay + (by - ay) * t) | 0)) return false; }
      return true;
    }

    // ---------- interaction ----------
    findTarget() {
      const p = this.player, ca = Math.cos(p.a), sa = Math.sin(p.a);
      let best = null, bestD = 9;
      for (let d = 0.1; d < 1.6; d += 0.05) {
        const x = p.x + ca * d, y = p.y + sa * d, cx = x | 0, cy = y | 0;
        const door = this.doors[cx + ',' + cy];
        if (door && this.mode === 'house') { best = this.doorAction(door); bestD = d; break; }
        if (this.map.isWall(cx, cy)) {
          const px = (p.x + ca * (d - 0.05)) | 0, py = (p.y + sa * (d - 0.05)) | 0;
          const f = px < cx ? 'W' : px > cx ? 'E' : py < cy ? 'N' : 'S';
          const dec = this.map.decalAt(cx, cy, f);
          if (dec) { best = this.decalAction(dec); bestD = d; }
          break;
        }
      }
      for (const s of this.props) {
        if (s.hidden || !(s.special || s.search)) continue;
        const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
        if (d > 1.6 || d >= bestD) continue;
        if (Math.abs(RT.angleDiff(Math.atan2(dy, dx), p.a)) > 0.5) continue;
        const a = this.propAction(s); if (a) { best = a; bestD = d; }
      }
      return best;
    }
    doorAction(d) {
      const p = this.player, inCell = (p.x | 0) === d.x && (p.y | 0) === d.y;
      const front = d.x === 11 && d.y === 7, name = front ? 'front door' : d.ext ? 'back door' : 'door';
      if (d.locked) return { label: `[E] Unlock the ${name}`, act: () => {
        if (!this.inv.keys) return this.ui.say('Locked. Your keys are on the hook in the hall.', 2.5);
        d.locked = false; RT.Audio.click(); this.ui.say(`You unlock the ${name}.`, 2);
      } };
      if (d.open > 0.5) return { label: `[E] Close the ${name}`, act: () => { if (inCell) return this.ui.say('You are standing in the doorway.', 1.5); d.target = 0; RT.Audio.knock(0.25); } };
      return { label: d.ext ? `[E] Open the ${name}  ·  [Q] Lock it` : `[E] Open the ${name}`, act: () => {
        if (front && this.phase === 'prep' && this.ph.stage >= 6 && !this.ritualStep()) return;
        d.target = 1; RT.Audio.creak(0);
      }, alt: d.ext ? () => {
        if (!this.inv.keys) return this.ui.say('You need your keys to lock it.', 2);
        d.locked = true; RT.Audio.click(); this.ui.say(`The ${name} is locked.`, 2);
      } : null };
    }
    decalAction(dec) {
      if (dec.kind === 'switch') {
        const k = 'L3' + dec.room, on = this.roomLit[k];
        return { label: `[E] Turn ${on ? 'off' : 'on'} the ${ROOM_NAMES[dec.room]} light`, act: () => { RT.Audio.click(); this.roomLit[k] = !on; } };
      }
      if (dec.kind === 'keys') return this.inv.keys ? null : { label: '[E] Take your keys', act: () => { this.inv.keys = true; RT.Audio.pickup(); this.ui.say('House keys.', 2); } };
      if (dec.kind === 'window') {
        const w = dec.win;
        if (w.open) return { label: '[E] Shut the window', act: () => { w.open = false; RT.Audio.knock(0.3); } };
        if (!w.curtain) return { label: '[E] Close the curtains', act: () => { w.curtain = true; RT.Audio.burst({ freq: 800, type: 'bandpass', dur: 0.5, vol: 0.2, attack: 0.1 }); } };
        return { label: '[E] Open the curtains', act: () => {
          if (w.front && this.phase === 'prep' && this.ph.stage >= 6) {
            if (!this.ritualStep()) return;
            w.curtain = false;
            if (!this.tinged) this.summonCab();
            return;
          }
          w.curtain = false; RT.Audio.burst({ freq: 800, type: 'bandpass', dur: 0.5, vol: 0.2, attack: 0.1 });
        } };
      }
      return null;
    }
    propAction(s) {
      const sp = s.special;
      if (s.search) {
        if (s.searched) return null;
        return { label: `[E] Search the ${s.what}`, act: () => {
          s.searched = true; RT.Audio.pickup();
          if (s.search === 'cord') { this.inv.cords++; this.inv.cordsFound++; this.ui.say(`A black cord, about half a metre long. (${this.inv.cordsFound}/2)`, 2.5); }
          if (s.search === 'watch') { this.inv.watch = true; this.ui.say('Your wristwatch. [R] to check it.', 2.5); }
          if (s.search === 'matches') { this.inv.matches = true; this.ui.say('A box of matches.', 2); }
        } };
      }
      if (sp === 'tv' || sp === 'radio' || sp === 'laptop') {
        const on = this.devices[sp], nm = { tv: 'the television', radio: 'the radio', laptop: 'the laptop' }[sp];
        return { label: `[E] Turn ${on ? 'off' : 'on'} ${nm}`, act: () => { this.devices[sp] = !on; RT.Audio.click(); } };
      }
      if (sp === 'phone') return { label: '[E] Sit down by the telephone', act: () => this.openPhone() };
      if (sp === 'stash') {
        if (this.carrying()) return { label: '[E] Leave your salt and medal in the drawer', act: () => { this.stash.salt = this.stash.salt || this.inv.salt; this.stash.medal = this.stash.medal || this.inv.medal; this.inv.salt = this.inv.medal = false; RT.Audio.pickup(); this.ui.say('You put the salt and the medal away. You feel lighter. Less safe.', 3); } };
        if (this.stash.salt && this.phase === 'after') return { label: '[E] Take the salt back', act: () => { this.stash.salt = false; this.inv.salt = true; RT.Audio.pickup(); } };
        return null;
      }
      if (sp === 'bsink') return { label: '[E] Wash your hands and face', act: () => this.cleanse() };
      if (sp === 'ksink') return this.burnAction();
      if (sp === 'cab') return { label: '[E] Get into the back of the cab', act: () => this.enterCab() };
      if (sp === 'dirt') return this.dirtAction();
      return null;
    }
    cleanse() {
      RT.Audio.burst({ freq: 1500, type: 'bandpass', dur: 1.2, vol: 0.2, attack: 0.2 });
      if (this.phase === 'after') {
        if (!this.after.buried || !this.after.salted) return this.ui.say('Cold water. Not yet. Finish the rest first.', 2.5);
        this.after.cleansed = true; this.ui.say('Clean. It is over.', 3);
        this.phase = 'over'; setTimeout(() => this.game.endLevel('win'), 2500);
        return;
      }
      this.cleansed1 = true; this.ui.say('Cold water on your face. Cleansed.', 2.5);
    }
    burnAction() {
      const burnable = (this.inv.usedCord && !this.inv.usedBurned) || this.inv.cordOnPhone;
      if (!burnable) return null;
      return { label: '[E] Burn the black cord in the sink', act: () => {
        if (!this.inv.matches) return this.ui.say('You need matches. Try the kitchen drawers.', 2.5);
        this.burnT = 2.5; RT.Audio.strike(true);
        if (this.inv.usedCord && !this.inv.usedBurned) {
          this.inv.usedBurned = true;
          if (this.phase === 'after' && !this.stalker.hidden) { this.stalker.hidden = true; this.ui.say('The first cord curls and spits. Somewhere in the house, something sighs and is gone.', 4); }
          else this.ui.say('The first cord curls in the flame. The connection is cut.', 3);
        }
        if (this.inv.cordOnPhone) { this.inv.cordOnPhone = false; this.after.burned = true; this.inv.ashes = true; this.ui.say('The cord burns down to a black twist of ash.', 3); }
      } };
    }
    dirtAction() {
      const a = this.after;
      if (this.phase !== 'after') return { label: 'A patch of turned earth', act: () => this.ui.say('Someone dug here once.', 2) };
      if (!a.buried) return { label: '[E] Bury the ashes', act: () => { if (!this.inv.ashes) return this.ui.say('You have nothing to bury yet. Burn the cord first.', 2.5); a.buried = true; this.inv.ashes = false; RT.Audio.burst({ freq: 300, dur: 0.6, vol: 0.3, src: 'brown' }); } };
      if (!a.salted) return { label: '[E] Sprinkle salt over them', act: () => { if (!this.inv.salt) return this.ui.say('You need salt. You left it in the hall drawer.', 2.5); a.salted = true; this.inv.salt = false; RT.Audio.burst({ freq: 3000, type: 'highpass', dur: 1, vol: 0.2 }); this.ui.say('Salt over ash. Now cleanse yourself.', 3); } };
      return null;
    }
    checkWatch() {
      if (!this.inv.watch) return this.ui.say('You are not wearing a watch.', 1.5);
      if (this.phase === 'wake') return this.wakeCheck();
      this.ui.bigText(this.phase === 'after' ? '3:58 A.M.' : '1:2' + Math.min(9, Math.floor(this.time / 60)) + ' A.M.', 1.5);
    }

    // ================= the telephone =================
    openPhone() {
      this.phoneOpen = true;
      this.player.x = 12.35; this.player.y = 11.0; this.player.a = Math.PI;
      this.game.keepUnlocked = true;
      if (document.pointerLockElement) document.exitPointerLock();
      this.ui.setPhone(this);
    }
    closePhone() {
      if (!this.phoneOpen) return;
      if (this.beat) { this.beat = null; this.ui.setBeat(null); }
      this.phoneOpen = false; this.ui.setPhone(null);
      this.game.keepUnlocked = false;
      if (!RT.Input.touch && this.game.state === 'play') this.game.canvas.requestPointerLock?.();
    }
    handlePause() {
      if (this.choiceOpen) return true;
      if (this.phoneOpen) { this.closePhone(); return true; }
      return false;
    }
    status(t) { this.ph.status = t; this.ui.setPhone(this); }
    phoneAction(a) {
      if (!this.phoneOpen || this.beat || this.choiceOpen) return;
      if (a === 'back') return this.closePhone();
      if (this.phase === 'after') return this.phoneAfter(a);
      const ph = this.ph;
      if (ph.stage >= 6) return this.status('It is done. Burn the first cord. Open the curtains.');
      if (a === 'count') {
        if (ph.stage !== 0 && ph.stage !== 3) return this.status(ph.stage < 3 ? 'Not now.' : 'You have counted enough.');
        if (!this.ritualStep()) return;
        if (this.pulse > 100) return this.status('Your heart is pounding. You are too nervous to begin. Breathe (hold SPACE).');
        return this.startBeat(ph.stage === 0 ? 'c1' : 'c2');
      }
      if (a[0] === 'd') {
        const digit = a[1];
        if (!this.ritualStep()) return;
        ph.spin = 60 + (digit === '0' ? 10 : +digit) * 25; RT.Audio.burst({ freq: 2000, type: 'bandpass', q: 4, dur: 0.3 + (+digit || 10) * 0.04, vol: 0.15 });
        if (ph.stage === 0) return this.status('Count to thirteen first.');
        if (ph.stage === 1) {
          if (this.time - ph.countedAt > 6 && ph.dial === '') { ph.stage = 0; return this.status('You waited too long after the last count. Count again.'); }
          ph.dial += digit;
          if (!NUM_A.startsWith(ph.dial)) { ph.dial = ''; ph.stage = 0; this.pulse += 8; return this.status('Wrong number. The line clicks. Start again from the count.'); }
          if (ph.dial === NUM_A) return this.firstCall();
          return this.status('');
        }
        if (ph.stage === 2) {
          if (!ph.tied) return this.status('The cord first.');
          if (!ph.handsetUp) return this.status('Lift the handset first.');
          ph.dial += digit;
          if (!NUM_B.startsWith(ph.dial)) { ph.dial = ''; this.pulse += 6; return this.status('Wrong number. Silence. Try that number again.'); }
          if (ph.dial === NUM_B) {
            ph.stage = 3; ph.dial = '';
            RT.Audio.tone(440, 2.5, 0.05, 'sine', 0.5); setTimeout(() => RT.Audio.breath(), 1500);
            this.pulse += 12;
            return this.status('It rings once. Then breathing. Leave the handset off.');
          }
          return this.status('');
        }
        return this.status('Not now.');
      }
      if (a === 'handset') {
        if (!this.ritualStep()) return;
        if (ph.stage <= 1 && !ph.handsetUp) {
          if (ph.stage === 1 || ph.dial) { ph.stage = 0; ph.dial = ''; this.pulse += 15; RT.Audio.knock(0.3); return this.status('You touched the handset. The tone dies. Start again from the count.'); }
          return this.status('Not yet.');
        }
        if (ph.stage === 2) { if (!ph.tied) return this.status('Tie the cord to it first.'); ph.handsetUp = true; RT.Audio.click(); return this.status('The handset lifts on its cord. Dial the second number.'); }
        if (ph.stage === 3) {
          if (!ph.counted2) return this.status('Count to thirteen before you put it back.');
          ph.handsetUp = false; ph.stage = 4; RT.Audio.knock(0.25);
          return this.status('Click. Now say it. Quietly.');
        }
        return this.status('Leave it.');
      }
      if (a === 'tie') {
        if (ph.stage !== 2) return this.status(ph.stage < 2 ? 'Not yet.' : 'Already tied.');
        if (ph.tied) return this.status('It is already tied, tight.');
        if (this.inv.cords < 1) return this.status('You need a black cord.');
        if (!this.ritualStep()) return;
        this.inv.cords--; ph.tied = true; RT.Audio.pickup();
        return this.status('You knot the cord tight around the handset.');
      }
      if (a === 'speak') {
        if (ph.stage !== 4) return this.status('Not now.');
        if (!this.ritualStep()) return;
        return this.ask('Say it quietly, slowly, carefully:', ['Hello? I need a cab.', 'Hello. I need a cab.', 'Hello? I need a taxi.', 'Hello? I need a ride.'], 0, (ok) => {
          if (!ok) return this.die('wrongwords');
          ph.stage = 5; this.pulse += 10; RT.Audio.breath();
          this.status('Something on the line exhales. Now swap the cords.');
        });
      }
      if (a === 'swap') {
        if (ph.stage !== 5) return this.status('Not now.');
        if (this.inv.cords < 1) return this.status('You need the second cord.');
        if (!this.ritualStep()) return;
        this.inv.cords--; this.inv.usedCord = true; ph.stage = 6; RT.Audio.pickup();
        this.ui.say('The first cord is in your pocket, still warm. Burn it as soon as you can.', 4);
        return this.status('Done. Burn the first cord. Then open the curtains.');
      }
      if (a === 'remove') return this.status('Not now.');
    }
    firstCall() {
      const ph = this.ph;
      ph.dial = '';
      if (this.carrying()) {
        if (!ph.warned) {
          ph.warned = true; ph.stage = 0; this.pulse += 35;
          RT.Audio.scream(); this.ui.flash('rgba(120,0,0,0.5)');
          return this.status('The receiver SHRIEKS. Something in your pocket is burning hot. Start again.');
        }
        return this.die('protection');
      }
      this.prep = this.precautions();
      ph.stage = 2;
      RT.Audio.tone(330, 3, 0.05, 'sawtooth', 0.6, 300);
      this.pulse += 10;
      this.status('A long, low tone. Tie a cord to the handset, lift it, dial the second number.');
    }
    phoneAfter(a) {
      const af = this.after, ph = this.ph;
      if (a[0] === 'd') {
        if (af.dialed) return this.status('You have dialled it.');
        ph.spin = 60 + (a[1] === '0' ? 10 : +a[1]) * 25; RT.Audio.burst({ freq: 2000, type: 'bandpass', q: 4, dur: 0.4, vol: 0.15 });
        ph.dial += a[1];
        if (!NUM_C.startsWith(ph.dial)) { ph.dial = ''; this.pulse += 5; return this.status('Wrong number. Again.'); }
        if (ph.dial === NUM_C) { af.dialed = true; ph.dial = ''; return this.status('It connects to nothing. Lift the handset and set it aside.'); }
        return this.status('');
      }
      if (a === 'handset') {
        if (!af.dialed) return this.status('Dial first.');
        if (af.aside) return this.status('It lies on its side, humming.');
        af.aside = true; ph.handsetUp = true; RT.Audio.click(); return this.status('You set the handset aside. Now speak.');
      }
      if (a === 'speak') {
        if (!af.aside) return this.status('Not yet.');
        if (af.thanked) return this.status('You have said it.');
        return this.ask('Say it:', ['Thank you for the ride.', 'Thanks for the ride.', 'Thank you for driving.', 'Thank you. Goodbye.'], 0, (ok) => {
          if (!ok) { this.pulse += 25; RT.Audio.breath(); return this.status('The line goes very cold. That was not right. Say it properly.'); }
          af.thanked = true; ph.handsetUp = false; this.status('A click. The line is dead for good. Remove the cord.');
        });
      }
      if (a === 'remove') {
        if (!af.thanked) return this.status('Not yet.');
        if (af.cordRemoved) return this.status('It is in your pocket.');
        af.cordRemoved = true; this.inv.cordOnPhone = true; RT.Audio.pickup();
        return this.status('You untie the black cord. Burn it. Bury the ashes. Salt.');
      }
      return this.status('Not now.');
    }
    ask(title, opts, correct, cb) {
      const order = opts.map((o, i) => i).sort(() => Math.random() - 0.5);
      this.choiceOpen = true;
      this.game.keepUnlocked = true;
      if (document.pointerLockElement) document.exitPointerLock();
      this.ui.choice(title, order.map((i) => opts[i]), (k) => {
        this.choiceOpen = false;
        if (!this.phoneOpen) { this.game.keepUnlocked = false; if (!RT.Input.touch) this.game.canvas.requestPointerLock?.(); }
        if (this.phase === 'dead') return;
        cb(order[k] === correct);
      });
    }

    // ---------- counting to thirteen ----------
    startBeat(kind) {
      this.beat = { kind, n: 0, t: 0, period: 0.95, scared: false };
      this.status('Count with the rings. [E] on each beat. Stay calm.');
    }
    updateBeat(dt, input) {
      const b = this.beat;
      b.t += dt;
      this.ui.setBeat(b);
      const k = Math.round(b.t / b.period);                       // nearest beat
      const off = Math.abs(b.t - k * b.period);
      if (input.take('interact')) {
        if (off < 0.17 && k === b.n + 1) { b.n++; RT.Audio.click(); }
        else return this.failBeat('You lost count.');
      }
      if (b.t > (b.n + 1) * b.period + 0.25) return this.failBeat('You lost count.');
      // the house does not want you to finish
      if (!b.scared && b.n >= 6 && Math.random() < dt * 0.6) { b.scared = true; RT.Audio.thud(); this.pulse += RT.rand(10, 22); }
      if (this.pulse > 105) return this.failBeat('Your heart is hammering. You lose your place. Breathe (hold SPACE), then count again.');
      if (!this.ritualStep()) return;
      if (b.n >= 13) {
        this.beat = null; this.ui.setBeat(null);
        if (b.kind === 'c1') { this.ph.stage = 1; this.ph.countedAt = this.time; this.status('Thirteen. Dial the first number. Now. Do not touch the handset.'); }
        else { this.ph.counted2 = true; this.status('Thirteen. Put the handset back.'); }
      }
    }
    failBeat(msg) { this.beat = null; this.ui.setBeat(null); this.pulse += 6; this.status(msg); }

    // ================= the cab =================
    summonCab() {
      this.tinged = true; this.cabProp.hidden = false;
      RT.Audio.stinger(); RT.Audio.music(false);
      this.ui.bigText('THE CAB IS HERE', 3, 'The sky is the colour of a bruise.');
      this.ui.say('A black cab idles outside, lights off. Take your watch and keys. Lock up. Get in.', 5);
    }
    enterCab() {
      if (this.phase === 'run') return this.ui.say('Inside. Get INSIDE.', 1.5);
      if (!this.tinged) return;
      if (!this.ritualStep()) return;
      if (!this.inv.watch) return this.ui.say('Bring a watch. You will need to know the time when you wake.', 3);
      const p = this.player;
      this.cabReturn = { x: p.x, y: p.y + 0.6 };
      this.setMode('cab');
      Object.assign(p, { x: 2.7, y: 2.8, a: -Math.PI / 2 });
      this.phase = 'cab'; this.cabLocked = false; this.sleepT = 0;
      this.ride = { stage: -1, t: 0, dist: 0, moving: false, turn: 0, ev: [] };
      this.ui.say('Cold leather. The cab is empty. Lock the door.', 3);
    }
    leaveCab() {
      this.setMode('house');
      Object.assign(this.player, { x: this.cabReturn.x, y: this.cabReturn.y, a: Math.PI / 2 });
      if (this.phase === 'cab') this.phase = 'prep';
    }
    updateCab(dt, input) {
      const p = this.player, R = this.ride;
      // you can look around and lean forward, nothing more
      p.a += input.consumeLook() + ((input.down('turnR') ? 1 : 0) - (input.down('turnL') ? 1 : 0)) * 2.2 * dt;
      const lean = (input.down('fwd') || input.moveY > 0.4) && !this.breathing && this.phase === 'ride';
      const ty = lean ? 2.5 : 2.8;
      p.y += (ty - p.y) * Math.min(1, dt * 6); p.x = 2.7;
      p.bob = this.pulse > 130 ? Math.round((Math.random() - 0.5) * (this.pulse - 130) / 12) : 0;
      this.leaning = p.y < 2.62;
      this.ui.setStamina(1, false);

      // where you are looking
      const ang = RT.angleDiff(p.a, -Math.PI / 2);
      const atDriver = this.leaning && Math.abs(RT.angleDiff(p.a, Math.atan2(this.driver.y - p.y, this.driver.x - p.x))) < 0.45;
      const atDoor = Math.abs(RT.angleDiff(p.a, 0)) < 0.55;
      let label = '';
      if (this.phase === 'cab') {
        if (atDoor) label = this.cabLocked ? '[E] Unlock the door' : '[E] Lock the cab door  ·  [Q] Get out';
        else if (this.cabLocked) label = 'Hold [SPACE]. Let yourself fall asleep.';
      } else if (this.phase === 'wake') label = '[R] Check your watch';
      else if (this.phase === 'run') label = atDoor ? (this.cabLocked ? '[E] Unlock the door' : '[E] Get out') : 'Your door is on the right.';
      else if (this.phase === 'ride') {
        if (this.talkWin > 0) label = '[T] Answer';
        else if (atDriver) label = '[E] Lift his hood  ·  [Q] Whisper';
        else if (atDoor) label = '[E] Open the door';
        else if (!this.leaning && Math.abs(ang) < 0.5 && !this.flags.leanHint) label = 'Hold [W] to lean forward';
      }
      this.ui.setPrompt(this.breathing || this.choiceOpen ? '' : label);

      if (!this.choiceOpen && input.take('interact')) {
        if (this.phase === 'cab' && atDoor) { this.cabLocked = !this.cabLocked; RT.Audio.click(); this.ui.say(this.cabLocked ? 'Locked.' : 'Unlocked.', 1.5); }
        else if (this.phase === 'run' && atDoor) { if (this.cabLocked) { this.cabLocked = false; RT.Audio.click(); } else this.leaveCab(); }
        else if (this.phase === 'ride' && atDriver) this.sentHome('hood');
        else if (this.phase === 'ride' && atDoor) this.die('jumped');
      }
      if (!this.choiceOpen && input.take('salt')) {
        if (this.phase === 'cab' && atDoor && !this.cabLocked) this.leaveCab();
        else if (this.phase === 'ride') this.tryWhisper(atDriver);
      }
      if (input.take('talk') && this.phase === 'ride') { if (!this.passenger.hidden) this.die('stabbed'); else this.sentHome('spoke'); return; }
      if (input.take('relight')) this.checkWatch();

      // falling asleep in the parked cab
      if (this.phase === 'cab') {
        if (this.cabLocked && this.breathing && this.pulse < 95) {
          this.sleepT += dt;
          if (this.sleepT > 3) this.fallAsleep();
        } else this.sleepT = Math.max(0, this.sleepT - dt);
        if (this.breathing && this.pulse >= 95 && !this.flags.calmHint) { this.flags.calmHint = true; this.ui.say('Too wired to sleep. Keep breathing.', 2.5); }
      }
      if (this.phase === 'wake') { this.wakeT += dt; if (this.wakeT > 20 && this.prepOK) this.wakeCheck(true); }
      if (this.phase === 'asleep2') { this.wakeT -= dt; if (this.wakeT <= 0) this.startRide(); }
      if (this.phase === 'run') this.updateRun(dt);
      if (this.phase === 'ride') this.updateRide(dt, input);

      this.drawWindows(dt);
      // a dim dome light, flickering on bad roads
      this.ambient = this.ride && this.ride.dark > 0 ? 0.02 : 0.2;
      this.ambientTint = [1, 0.85, 0.7];
      this.lights.length = 0;
      if (this.ride) this.ride.dark = Math.max(0, (this.ride.dark || 0) - dt);
    }
    fallAsleep() {
      const pre = this.prep || this.precautions();
      const fr = this.doors['11,7'], bk = this.doors['5,18'];
      this.prepOK = Object.values(pre).every(Boolean) && fr.locked && fr.open < 0.05 && bk.locked && bk.open < 0.05 && this.cabLocked;
      this.phase = 'sleeping';
      this.ui.say('Your eyes close.', 2);
      setTimeout(() => {
        if (this.game.world !== this) return;
        this.phase = 'wake'; this.wakeT = 0;
        this.ui.flash('rgba(0,0,0,1)');
        this.ui.say('You wake. The cab has not moved. Check your watch.', 4);
      }, 3500);
    }
    wakeCheck(auto) {
      if (this.prepOK) {
        if (!auto) this.ui.bigText('3:30 A.M.', 3);
        this.ui.say(auto ? 'Sleep pulls at you again before you can look...' : '3:30. Your eyelids are already falling.', 3);
        this.phase = 'asleep2'; this.wakeT = 6;
      } else {
        this.ui.bigText('1:47 A.M.', 3, 'The real time.');
        this.ui.say('It did not work. Get out and get back inside your house. Two minutes.', 5);
        this.phase = 'run'; this.runT = 120;
      }
    }
    updateRun(dt) {
      this.runT -= dt;
      this.ui.setAlarm({ text: `GET INSIDE  ${Math.ceil(this.runT)}`, frac: this.runT / 120 });
      if (this.mode === 'house' && this.player.y > 8.2 && this.player.y < 18) { this.phase = 'over'; this.ui.setAlarm(null); setTimeout(() => this.game.endLevel('nocab'), 1200); }
      if (this.runT <= 0) this.die('late');
    }

    // ---------- the ride ----------
    startRide() {
      this.phase = 'ride';
      this.ui.flash('rgba(0,0,0,1)');
      const R = this.ride;
      Object.assign(R, { stage: 0, t: 0, moving: true, stop: null, nextEv: 7, firstStopDone: false, faceT: 0, turn: 0, dark: 0 });
      this.driver.hidden = false;
      this.pulse = Math.max(this.pulse, 92);
      RT.Audio.setHum(0.25);
      this.ui.say('You wake on a highway. Someone is driving. A hood, a pair of hands on the wheel.', 5);
      setTimeout(() => this.phase === 'ride' && this.ui.say('Stay calm (hold SPACE to breathe). Do not speak. Do not look under the hood.', 5), 5500);
    }
    passengerTex(t) {
      const R = this.ride;
      if (R && R.stop && R.stop.who === 'woman') return RT.Tex.woman[this.passengerLook > 0.5 ? 1 : 0];
      return RT.Tex.passenger[this.talkWin > 0 ? 1 : 0];
    }
    updateRide(dt, input) {
      const R = this.ride, p = this.player;
      R.t += dt;
      if (R.moving) R.dist += dt * (R.stage === 3 ? 1.8 : 1.2);
      // stages
      if (R.t > STAGE_LEN[R.stage]) {
        if (R.stage === 3) return this.lastStop();
        R.stage++; R.t = 0; R.stopped = false;
        RT.Audio.thud(); this.ui.flash('rgba(255,255,255,0.4)'); this.pulse += 12;
        this.ui.say(STAGE_TEXT[R.stage], 4);
      }
      if (R.t < 0.1 && R.stage === 0 && !this.flags.stage0) { this.flags.stage0 = true; }
      // passengers: stage 0 at 25s, stage 2 at 15s
      const stopAt = R.stage === 0 ? 25 : R.stage === 2 ? 15 : -1;
      if (!R.stop && !R.stopped && R.t > stopAt && stopAt > 0) {
        R.stopped = true; R.moving = false;
        R.stop = { t: 0, who: R.stage === 0 ? 'man' : 'woman', in: false };
        RT.Audio.setHum(0.08);
        this.ui.say('The cab slows. Stops. Someone is standing at the side of the road.', 3.5);
      }
      if (R.stop) {
        const s = R.stop; s.t += dt;
        if (!s.in && s.t > 3) { s.in = true; this.passenger.hidden = false; RT.Audio.knock(0.4); this.pulse += 15; this.ui.say(s.who === 'man' ? 'The far door opens. A man in a hat gets in and sits beside you. The door was never unlocked.' : 'She gets in beside you. Wet hair. A white dress. You know her.', 4); this.nextLine = 3; }
        if (s.in) {
          this.nextLine -= dt;
          if (this.nextLine <= 0) {
            this.nextLine = RT.rand(4.5, 7);
            this.ui.say(`"${RT.choice(s.who === 'man' ? PASSENGER_LINES : WOMAN_LINES)}"`, 3, 'her');
            this.talkWin = 3; this.pulse += 6;
          }
          if (s.t > 4) R.moving = true, RT.Audio.setHum(0.25);
        }
        if (s.t > 26) {
          this.passenger.hidden = true; R.stop = null; this.talkWin = 0;
          RT.Audio.knock(0.3);
          if (!R.firstStopDone) { R.firstStopDone = true; this.ui.say('At the next bend it is simply gone. You realise you can say it now, if you want this to end.', 5); }
          else this.ui.say('Gone again. The seat beside you is wet.', 3);
        }
      }
      this.talkWin = Math.max(0, (this.talkWin || 0) - dt);
      // looking at things you shouldn't
      this.passengerLook = 0;
      if (!this.passenger.hidden) {
        const a = Math.abs(RT.angleDiff(p.a, Math.atan2(this.passenger.y - p.y, this.passenger.x - p.x)));
        if (a < 0.45 && !this.breathing) { this.pulse += dt * 9; this.passengerLook = 1; }
      }
      if (R.turn > 0) { R.turn -= dt; if (Math.abs(RT.angleDiff(p.a, -Math.PI / 2)) < 0.5 && !this.breathing) this.pulse += dt * 10; }
      if (R.faceT > 0) { R.faceT -= dt; const wa = R.faceSide === 'left' ? Math.PI : 0; if (Math.abs(RT.angleDiff(p.a, wa)) < 0.7 && !this.breathing) this.pulse += dt * 12; }
      // events
      R.nextEv -= dt;
      if (R.nextEv <= 0) {
        R.nextEv = RT.rand(5, 9) * (R.stage === 3 ? 0.6 : 1);
        const k = R.stage * 0.15 + 1;
        const ev = RT.choice(['thud', 'face', 'turn', 'radio', 'unlock', 'swerve', 'lights', 'roof']);
        switch (ev) {
          case 'thud': R.hand = { side: RT.choice(['left', 'right', 'rear']), t: 2 }; RT.Audio.thud(); this.pulse += 13 * k; break;
          case 'face': R.faceSide = RT.choice(['left', 'right']); R.faceT = 4; RT.Audio.gasp(); this.pulse += 6 * k; break;
          case 'turn': R.turn = 3.5; RT.Audio.creak(0); this.pulse += 8 * k; this.ui.say('The driver\'s head turns, slowly, towards you.', 2.5); break;
          case 'radio': RT.Audio.burst({ freq: 1500, type: 'bandpass', dur: 2, vol: 0.2, attack: 0.1 }); this.ui.say(RT.choice(['The radio crackles on: "...three thirty... three thirty..."', 'The radio whispers an address. It is yours.', 'The radio plays a song you heard at a funeral.']), 3); this.pulse += 7 * k; break;
          case 'unlock': RT.Audio.click(); this.ui.say('Your door lock pops up by itself.', 2.5); this.pulse += 5 * k; break;
          case 'swerve': this.swerve = 0.8; RT.Audio.burst({ freq: 500, dur: 0.8, vol: 0.4, src: 'brown' }); this.pulse += 16 * k; break;
          case 'lights': R.dark = 3; RT.Audio.click(); this.pulse += 6 * k; break;
          case 'roof': for (let i = 0; i < 3; i++) setTimeout(() => RT.Audio.knock(0.5), i * 400); this.pulse += 10 * k; this.ui.say('Something is knocking on the roof.', 2.5); break;
        }
      }
      if (this.swerve > 0) { this.swerve -= dt; p.a += Math.sin(this.time * 30) * dt * 1.2; }
      if (R.hand) { R.hand.t -= dt; if (R.hand.t <= 0) R.hand = null; }
      if (this.pulse >= 170) return this.die('panic');
    }
    tryWhisper(atDriver) {
      const R = this.ride;
      if (!atDriver) return this.ui.say('Lean in to his ear first. Hold [W] and face him.', 2.5);
      if (!R.firstStopDone) return this.ui.say('Not yet. The ride has barely begun.', 2.5);
      if (!this.passenger.hidden) return this.ui.say('Not with someone sitting beside you.', 2.5);
      if (this.pulse > 115) return this.ui.say('Your voice would shake. Breathe first.', 2.5);
      this.ask('Whisper into his ear, slowly and carefully:', ['I have reached my destination.', 'I\'ve reached my destination.', 'I have arrived at my destination.', 'This is my destination.'], 0, (ok) => {
        if (!ok) return this.sentHome('spoke');
        this.reachedStage = R.stage;
        this.phase = 'leaving'; this.driver.hidden = false; R.turn = 2;
        this.ui.say('He nods, once. You are so tired...', 3);
        setTimeout(() => this.game.world === this && this.wakeHome(), 3200);
      });
    }
    wakeHome() {
      this.setMode('house');
      this.phase = 'after'; this.tinged = false; this.cabProp.hidden = true;
      RT.Audio.setHum(0); RT.Audio.music(false);
      Object.assign(this.player, { x: 12.35, y: 11.0, a: Math.PI });
      for (const w of this.winList()) if (w.front) w.curtain = false;
      const fr = this.doors['11,7']; fr.locked = false;
      this.ui.flash('rgba(0,0,0,1)');
      this.ui.setClock('3:58 A.M.');
      this.ui.bigText('HOME', 3, 'You wake in the chair by the telephone.');
      this.ui.say('Finish it properly. Telephone first.', 4);
      if (this.inv.usedCord && !this.inv.usedBurned) {
        this.stalker.hidden = false; this.stalker.x = 2.5; this.stalker.y = 9.5;
        setTimeout(() => this.game.world === this && this.ui.say('You never burned the first cord. Something followed it home. Burn it FIRST.', 5), 4500);
      }
    }
    // after the ride, if the first cord is still whole, the hooded man is in the house.
    // He moves only when you are not looking at him.
    updateStalker(dt) {
      const s = this.stalker, p = this.player;
      if (s.hidden) return;
      const d = RT.dist(s.x, s.y, p.x, p.y);
      const ang = Math.abs(RT.angleDiff(Math.atan2(s.y - p.y, s.x - p.x), p.a));
      const lit = this.roomLit[this.map.roomAt(s.x | 0, s.y | 0)];
      const seen = ang < 0.6 && this.los(p.x, p.y, s.x, s.y) && (d < 3 || lit);
      s.moving = !seen;
      if (!seen) {
        const dx = p.x - s.x, dy = p.y - s.y, l = Math.hypot(dx, dy) || 1;
        // drift towards you, through doors if they are open, never through walls
        const step = Math.min(l, 0.85 * dt);
        const nx = s.x + dx / l * step, ny = s.y + dy / l * step;
        if (!this.blocked(nx | 0, s.y | 0)) s.x = nx; if (!this.blocked(s.x | 0, ny | 0)) s.y = ny;
      }
      if (d < 0.6) this.die('followed');
      this.fx.cold += ((d < 5 ? 1 - d / 5 : 0) - this.fx.cold) * Math.min(1, dt * 2);
    }
    lastStop() {
      this.phase = 'over';
      RT.Audio.setHum(0); this.ui.flash('rgba(255,255,255,1)');
      this.ui.say('The cab stops. The engine dies. The driver opens your door.', 4);
      setTimeout(() => this.game.endLevel('laststop'), 3500);
    }
    sentHome(why) {
      if (this.phase === 'dead' || this.phase === 'over') return;
      this.phase = 'over';
      this.sentWhy = why;
      this.ui.flash('rgba(0,0,0,1)');
      this.ui.say(why === 'hood' ? 'Your fingers touch the hood. Everything goes black.' : 'The moment you speak, sleep slams down on you.', 3);
      setTimeout(() => this.game.endLevel('senthome', why), 2500);
    }

    // ================= windows of the cab =================
    newWinTex() { const c = document.createElement('canvas'); c.width = c.height = 64; return { w: 64, h: 64, data: new Uint32Array(64 * 64), canvas: c, g: c.getContext('2d', { willReadFrequently: true }) }; }
    drawWindows() {
      const R = this.ride || { stage: -1, dist: 0 };
      for (const k of ['front', 'left', 'right', 'rear']) {
        const T = this.winTex[k], g = T.g;
        this.paintWindow(g, k, R);
        const id = g.getImageData(0, 0, 64, 64);
        T.data = new Uint32Array(id.data.buffer);
      }
    }
    paintWindow(g, k, R) {
      const st = this.phase === 'ride' || this.phase === 'leaving' ? R.stage : -1;
      const s = R.dist * 40, side = k === 'left' || k === 'right', dir = k === 'left' ? 1 : -1;
      g.fillStyle = '#141010'; g.fillRect(0, 0, 64, 64);              // door/frame
      const x0 = 4, y0 = side ? 6 : 6, w = 56, h = side ? 30 : 40;
      g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
      const sky = (a, b) => { const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(x0, y0, w, h); };
      if (st === -1) {
        sky('#3a1450', '#120618'); g.fillStyle = '#05030a'; g.fillRect(x0, y0 + h * 0.6, w, h);
        g.fillStyle = '#e8d090'; g.fillRect(20, y0 + 8, 2, 2); g.fillStyle = '#111'; g.fillRect(20, y0 + 10, 1, 20);
      } else if (st === 0) {
        sky('#05070f', '#0b0f1a'); g.fillStyle = '#060606'; g.fillRect(x0, y0 + h * 0.62, w, h);
        if (side) for (let i = -1; i < 4; i++) { const x = ((i * 26 + s * dir) % 78 + 78) % 78 - 8; g.fillStyle = '#111'; g.fillRect(x, y0 + 4, 2, h); g.fillStyle = '#ffb860'; g.fillRect(x - 2, y0 + 3, 6, 3); g.fillStyle = 'rgba(255,170,80,0.15)'; g.fillRect(x - 10, y0, 22, h); }
        else { g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(30, y0 + h * 0.62); g.lineTo(34, y0 + h * 0.62); g.lineTo(60, y0 + h); g.lineTo(4, y0 + h); g.fill(); g.fillStyle = '#c8b050'; for (let i = 0; i < 5; i++) { const z = ((i * 0.2 + R.dist * (k === 'rear' ? -0.6 : 0.6)) % 1 + 1) % 1; const yy = y0 + h * 0.62 + z * z * h * 0.38; g.fillRect(31, yy, 2, 1 + z * 3); } if (k === 'rear') { g.fillStyle = 'rgba(200,20,20,0.25)'; g.fillRect(x0, y0 + h * 0.6, w, h); } }
      } else if (st === 1) {
        sky('#4a0606', '#1a0202'); g.fillStyle = '#080202'; g.fillRect(x0, y0 + h * 0.65, w, h);
        if (side) for (let i = -1; i < 4; i++) { const x = ((i * 23 + s * 0.8 * dir) % 72 + 72) % 72 - 6; g.fillStyle = '#000'; g.fillRect(x, y0 + 8, 2, h); g.fillRect(x - 4, y0 + 12, 4, 1); g.fillRect(x + 2, y0 + 15, 5, 1); }
        else { g.fillStyle = '#d8d0c8'; g.fillRect(40, y0 + h * 0.65 - 26, 2, 26); g.fillRect(39, y0 + h * 0.65 - 29, 4, 4); }
        if (Math.random() < 0.01) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x0, y0, w, h); }
      } else if (st === 2) {
        sky('#0a1410', '#020806');
        for (let i = 0; i < 5; i++) { const x = ((i * 15 + s * 0.3 * (side ? dir : 0.1)) % 70 + 70) % 70 - 6; const bh = 8 + (i * 7) % 12; g.fillStyle = '#010302'; g.fillRect(x, y0, 9, bh); g.fillStyle = (this.time * 2 + i) % 3 < 0.3 ? '#fff' : '#c8c060'; g.fillRect(x + 3, y0 + bh - 4, 2, 1); }
        g.fillStyle = '#04110c'; g.fillRect(x0, y0 + h * 0.55, w, h);
        g.fillStyle = 'rgba(120,200,160,0.25)'; for (let i = 0; i < 8; i++) g.fillRect(((i * 9 + s * dir) % 60 + 60) % 60, y0 + h * 0.6 + (i % 4) * 3, 4, 1);
      } else {
        g.fillStyle = '#c8c8c8'; g.fillRect(x0, y0, w, h);
        for (let i = 0; i < 160; i++) { const v = Math.random() * 120 + 100; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x0 + Math.random() * w, y0 + Math.random() * h, 2, 1); }
        if (side) { g.fillStyle = '#000'; for (let i = 0; i < 3; i++) { const x = 10 + i * 17 + Math.sin(this.time + i) * 3, y = y0 + 6 + (i % 2) * 8; g.fillRect(x, y, 5, 7); for (let f = 0; f < 4; f++) g.fillRect(x + f * 1.3, y - 5, 1, 5); } }
      }
      // face pressed against the glass
      if (R.faceT > 0 && k === R.faceSide) {
        g.fillStyle = '#d8d2c6'; g.beginPath(); g.ellipse(32, y0 + h / 2 + 2, 11, 14, 0, 0, 7); g.fill();
        g.fillStyle = '#000'; g.fillRect(26, y0 + h / 2 - 2, 4, 3); g.fillRect(35, y0 + h / 2 - 2, 4, 3); g.fillRect(28, y0 + h / 2 + 8, 9, 3);
      }
      if (R.hand && R.hand.side === k) { g.fillStyle = 'rgba(200,190,170,0.85)'; g.fillRect(24, y0 + 10, 12, 12); for (let f = 0; f < 4; f++) g.fillRect(24 + f * 3, y0 + 2, 2, 9); }
      g.restore();
      if (side) { g.fillStyle = '#2a2020'; g.fillRect(0, 44, 64, 20); if (k === 'right') { g.fillStyle = '#8a8a8a'; g.fillRect(42, 48, 10, 3); g.fillStyle = this.cabLocked ? '#555' : '#c8b060'; g.fillRect(8, 40, 3, 5); } }
    }

    // ================= endings & death =================
    die(reason) {
      if (this.phase === 'dead' || this.phase === 'over') return;
      this.phase = 'dead';
      this.closePhone(); this.ui.hideChoice(); this.choiceOpen = false; this.beat = null; this.ui.setBeat(null);
      this.ui.flash('rgba(160,0,0,0.6)');
      const face = reason === 'stabbed' ? RT.Tex.faces.passenger : RT.Tex.faces.hood;
      this.ui.jumpscare(face, 1.4);
      RT.Audio.scream(); RT.Audio.setHum(0); RT.Audio.music(false); RT.Audio.setRain(0);
      setTimeout(() => this.game.endLevel(reason === 'late' ? 'dead' : 'dead', reason), 1600);
    }
    ending(kind, reason) {
      const stats = `Pulse at the end: ${Math.round(this.pulse)} bpm`;
      if (kind === 'win') {
        const far = this.reachedStage >= 2;
        return { win: true, title: 'THANK YOU FOR THE RIDE', text: far ? 'You rode further than anyone sensible would, and you came back. The cords are ash, the ash is under salt, and the line is dead. Mostly, you sleep fine.' : 'The cords are ash, the ash is under salt, and the line is dead. Your neighbour asks how you slept. You say fine.', stats, next: 'Next: <b>Level 4 &mdash; Three Kings</b> (not in this demo)' };
      }
      if (kind === 'nocab') return { title: 'THE RIDE NEVER CAME', text: 'Something in the house was wrong: a window, a door, a light, a pocket. The watch told the truth and you listened. You are home, alive, and the cab outside is gone. Do it properly next time. Or don\'t.', stats };
      if (kind === 'senthome') return { title: 'SENT HOME', text: reason === 'hood' ? 'Your fingers brushed the hood and the world went out. You woke in the chair by the telephone with your hand still raised. You never finished it. Some nights the phone rings at 3:30.' : 'You spoke, and sleep took you mid-word. You woke at home, the ritual unfinished, the cord still tied to the phone. It is still tied there. You daren\'t touch it.', stats };
      if (kind === 'laststop') return { title: 'THE LAST STOP', text: 'Nobody knows what happens when the cab stops. Now you do. You are not going to tell anyone.', stats };
      const D = {
        bound: ['IT BOUND ITSELF TO YOU', 'You felt it watching and you carried on anyway. Now it goes where you go.'],
        protection: ['YOU BROUGHT PROTECTION', 'You were told not to carry anything. The thing on the line took that as an insult.'],
        wrongwords: ['WRONG WORDS', 'Something answered. It was not a cab company.'],
        late: ['TWO MINUTES', 'You took too long. The street lamps went out one by one, and so did you.'],
        panic: ['YOU PANICKED', 'Your heart would not slow down. You screamed, and the hooded man turned all the way around in his seat.'],
        jumped: ['YOU TRIED TO GET OUT', 'The door opened onto a road moving faster than anything should.'],
        stabbed: ['YOU SPOKE TO HIM', 'You answered the man beside you. He smiled, and you saw what was in his hand.'],
        followed: ['IT FOLLOWED YOU HOME', 'You never burned the first cord. It came through after you.'],
      };
      const [title, text] = D[reason] || ['YOU DID NOT SURVIVE', ''];
      return { title, text, stats };
    }

    // ================= HUD & audio =================
    updateHud() {
      this.ui.setPulse(this.pulse);
      this.ui.setOverlays({ cold: Math.max(this.fx.cold, this.presence.active ? 0.45 : 0), drowsy: this.breathing ? 0.95 : (this.phase === 'sleeping' || this.phase === 'asleep2') ? 1 : 0, dark: RT.clamp((this.pulse - 120) / 60, 0, 0.8) });
      if (this.phase !== 'run') this.ui.setAlarm(null);
      const i = this.inv, pre = this.precautions(), ph = this.ph;
      const wl = this.winList(), dl = this.doorList();
      const inv = [];
      if (i.salt) inv.push('Salt'); if (i.medal) inv.push('Saint\'s medal');
      if (i.cords) inv.push(`Black cord ×${i.cords}`); if (i.usedCord && !i.usedBurned) inv.push('Used cord'); if (i.cordOnPhone) inv.push('Black cord (from the phone)');
      if (i.ashes) inv.push('Ashes'); if (i.watch) inv.push('Watch'); if (i.keys) inv.push('Keys'); if (i.matches) inv.push('Matches');
      this.ui.setInventory(inv);
      if (this.phase === 'prep' || this.phase === 'cab') {
        if (ph.stage < 6) {
          this.ui.setObjectives([
            [pre.cleansed, 'Cleanse yourself'],
            [pre.unprotected, 'Carry nothing protective'],
            [i.cordsFound >= 2, `Find two black cords (${i.cordsFound}/2)`],
            [pre.windows, `Shut every window (${wl.filter((w) => !w.open).length}/${wl.length})`],
            [pre.curtains, `Close every curtain (${wl.filter((w) => w.curtain).length}/${wl.length})`],
            [pre.doors, `Shut every door (${dl.filter((d) => d.open < 0.05).length}/${dl.length})`],
            [pre.lights, `Turn off every light (${5 - this.lightsOn()}/5)`],
            [pre.devices, `Turn off every device (${3 - this.devicesOn()}/3)`],
            [false, 'Then: the telephone. Follow the instructions (J).'],
          ]);
        } else {
          const fr = this.doors['11,7'], bk = this.doors['5,18'];
          this.ui.setObjectives([
            [i.usedBurned, 'Burn the first cord'],
            [this.tinged, 'Open the curtains'],
            [i.watch, 'Bring your watch'],
            [bk.locked, 'Lock the back door'],
            [fr.locked && this.player.y < 7, 'Leave, and lock the front door behind you'],
            [this.cabLocked, 'Get in the back of the cab and lock it'],
            [false, 'Sleep'],
          ]);
        }
      } else if (this.phase === 'after') {
        const a = this.after;
        this.ui.setObjectives([
          [!this.stalker || this.stalker.hidden, 'Burn the first cord. NOW.'],
          [a.dialed && a.aside && a.thanked, 'Dial 200082, set the handset aside, thank him'],
          [a.cordRemoved, 'Remove the black cord'],
          [a.burned, 'Burn it'],
          [a.buried, 'Bury the ashes in the back garden'],
          [a.salted, 'Sprinkle salt over them'],
          [a.cleansed, 'Cleanse yourself'],
        ].filter((x, k) => k > 0 || !this.stalker.hidden));
      } else {
        const t = { ride: 'Stay calm. Say nothing. Whisper the destination when you are ready.', wake: 'Check your watch.', run: 'Get back inside your house.', cab: 'Lock the door. Sleep.' }[this.phase] || '...';
        this.ui.setObjectives(null, t);
      }
      this.ui.setMarker(this, null);
    }
    updateAudio(dt) {
      let whisper = 0, heart = RT.clamp((this.pulse - 75) / 80, 0, 1);
      if (this.presence.active) whisper = 0.4;
      if (this.mode === 'cab' && this.ride && this.ride.turn > 0) whisper = 0.5;
      if (this.stalker && !this.stalker.hidden) whisper = Math.max(whisper, this.fx.cold * 0.7);
      RT.Audio.update(dt, { drone: this.mode === 'cab' ? 0.3 : 0.15, whisper, heart });
      if (this.mode === 'house') RT.Audio.setRain(this.devices.tv ? 0.08 : 0);
      RT.Audio.music(this.devices.radio && this.mode === 'house' && this.phase === 'prep', 0.2);
    }
  }

  RT.Level3 = Level3;
  RT.RULES3 = `
    <h2>The Hooded Man</h2>
    <p class="dim">Printed from a forum post. Someone has underlined half of it in red pen.</p>
    <h3>You need</h3>
    <ul><li>Two black cords, about half a metre long. A telephone (rotary works best). A watch. Your house keys.</li></ul>
    <h3>Precautions</h3>
    <ul>
      <li>Do a <b>cleansing</b> (wash your hands and face) before you begin, and again after.</li>
      <li><b>Shut all doors and windows</b>, close the curtains, and turn off <b>all lights and electronic devices</b>.</li>
      <li>Do <b>not</b> carry salt or any other item of protection. Put them away somewhere.</li>
      <li>If at any point you feel <b>watched or stalked</b> by a presence, <b>stop</b>. Do not carry on with any step until it has gone, or it will bind itself to you.</li>
    </ul>
    <h3>At the telephone</h3>
    <ol>
      <li>Sit by the phone. Be calm: not agitated, not scared. <b>Count to thirteen.</b> On the last count, dial <b>20496888</b>. <b>Do not touch the handset</b> while you dial.</li>
      <li><b>Tie one black cord</b> tightly to the handset, <b>lift it</b>, and dial <b>25515823</b>. Leave the handset off, whether or not it connects.</li>
      <li><b>Count to thirteen</b> again and <b>put the handset back</b>. Then say quietly into the receiver: <b>"Hello? I need a cab."</b></li>
      <li><b>Swap the first cord</b> for the second. <b>Burn the first cord</b> as soon as you can.</li>
    </ol>
    <h3>The cab</h3>
    <ul>
      <li><b>Open the curtains.</b> The sky will be tinged, and a black cab will be parked outside.</li>
      <li>Take your watch. Leave the house and <b>lock all your doors</b>. Get in the back of the cab, <b>lock the cab door</b>, and let yourself fall asleep.</li>
      <li>When you wake, <b>check your watch</b>. If it reads <b>3:30</b>, you will sleep again and wake on a highway with a hooded man driving.</li>
      <li>If it shows any other time, get out and get back inside your house <b>within two minutes</b>.</li>
    </ul>
    <h3>The ride</h3>
    <ul>
      <li>Do not <b>speak</b> to the driver. Do not <b>lift his hood</b>. Either one sends you home.</li>
      <li>Do not <b>panic</b>. Do not try to <b>get out</b> while the cab is moving. Either one kills you.</li>
      <li>If the cab stops and <b>someone else gets in</b>, do not speak to them.</li>
      <li>To end it, lean in to the driver's ear and whisper, slowly and carefully: <b>"I have reached my destination."</b></li>
      <li>The longer you ride, the stranger it gets. Nobody knows what happens when the cab stops.</li>
    </ul>
    <h3>After</h3>
    <ol>
      <li>Dial <b>200082</b>. Lift the handset, set it aside, and say <b>"Thank you for the ride."</b></li>
      <li>Remove the black cord and <b>burn it</b>. <b>Bury the ashes</b> in the back garden and <b>sprinkle salt</b> over them.</li>
      <li>Cleanse yourself again.</li>
    </ol>`;
})(window.RT);

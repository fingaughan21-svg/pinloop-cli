// LEVEL 1 - THE MIDNIGHT MAN
// Pre-ritual (untimed) -> 12:00 a.m. -> survive to 3:33 a.m.
// One in-game minute = 2 real seconds (one hour = 2 minutes; a full night is ~7 minutes).
(function (RT) {
  const M = RT.Map;
  const SECONDS_PER_GAME_MINUTE = 2;
  const END_MINUTE = 3 * 60 + 33;
  const RELIGHT_WINDOW = 10;     // rules: relight within ten seconds
  const SALT_WINDOW = 5;         // "immediately" surround yourself with salt
  const SALT_POUR_TIME = 2.2;
  const ROOMS = ['c', 's', 'r', 'b', 'k', 'h', 'l'];

  function buildMap() {
    const decals = new Map();
    for (const d of M.DECALS) {
      const dd = Object.assign({}, d);
      if (d.kind === 'window') dd.emissive = 0.13;
      if (d.kind === 'windowFrost') dd.emissive = 0.1;
      decals.set(RT.FACE_KEY(d.x, d.y, d.f), dd);
    }
    return {
      W: M.W, H: M.H,
      isWall(x, y) { if (x < 0 || y < 0 || x >= M.W || y >= M.H) return true; const c = M.GRID[y][x]; return c === '#' || c === 'D'; },
      roomAt(x, y) { if (x < 0 || y < 0 || x >= M.W || y >= M.H) return null; const c = M.GRID[y][x]; return c === '#' || c === 'D' ? null : c; },
      decalAt(x, y, f) { return decals.get(RT.FACE_KEY(x, y, f)); },
      decals,
    };
  }

  class Level1 {
    constructor(game, opts = {}) {
      this.game = game;
      this.ui = game.ui;
      this.timeScaleDebug = opts.speed || 1;
      this.map = buildMap();
      const s = M.START;
      this.player = { x: s.x, y: s.y, a: s.a, bob: 0, walkPhase: 0, stepAcc: 0 };
      this.inv = { paper: false, needle: false, candle: false, matches: 0, salt: false, lighter: false, flashlight: false };
      this.roomLit = {}; for (const r of ROOMS) this.roomLit[r] = true;
      this.phase = 'prep';
      this.prep = { name: null, blood: false, paperTaken: false, offering: -1, knocks: 0, knockCD: 0, doorOpen: false, blown: false, closed: false };
      this.candleLit = false;
      this.flashOn = false;
      this.minutes = 0;
      this.time = 0;
      this.strike = null;
      this.smoke = 0;
      this.candleOut = null; // {t} while the candle is out during the game
      this.saltWin = null;   // {t, pour}
      this.saltCircle = null;
      this.timeScale = 1;
      this.fx = { cold: 0, hallucinate: 0 };
      this.flags = {};
      this.lights = [];
      this.ambient = 0.05;
      this.positions = [];
      this.posTimer = 0;
      this.dead = false;

      // sprites
      this.sprites = [];
      this.props = M.PROPS.map((p) => {
        const sp = Object.assign({ z: 0 }, p, { taken: false });
        sp.getTex = () => {
          const T = RT.Tex;
          if (T.v[p.tex]) return T.v[p.tex + (p.item && !sp.taken ? '_item' : '')];
          return T.sprites[p.tex];
        };
        this.sprites.push(sp);
        return sp;
      });
      this.offering = { x: M.OFFERING_POS.x, y: M.OFFERING_POS.y, h: 0.2, z: 0, hidden: true, getTex: (t) => {
        const st = this.prep.offering; if (st < 0) return null;
        if (st === 2) return RT.Tex.offering[2 + ((t * 6) | 0) % 2];
        return RT.Tex.offering[st];
      } };
      this.sprites.push(this.offering);
      this.mm = { x: 11.5, y: 16, state: 'gone', timer: 40, speed: 0.9, field: null, fieldTarget: -1, fieldT: 0, goal: null, nextVisit: 75, sprite: null, angle: 0 };
      this.mm.sprite = { x: 0, y: 0, h: 1.15, z: 0, black: true, hidden: true, shake: 0, getTex: (t) => {
        const d = RT.dist(this.mm.x, this.mm.y, this.player.x, this.player.y);
        if ((this.mm.state === 'close' && d < 2.2) || this.phase === 'dead') return RT.Tex.mm[2];
        // twitchy, irregular head movement
        return RT.Tex.mm[(Math.sin(t * 2.3) + Math.sin(t * 7.1) * 0.6 > 0.9) ? 1 : 0];
      } };
      this.sprites.push(this.mm.sprite);
      this.phantoms = [];

      if (!opts.attract) {
        this.ui.setClock('11:59 P.M.');
        this.ui.say('It is almost midnight. Gather what the ritual needs.', 5);
        setTimeout(() => this.phase === 'prep' && this.game.world === this && this.ui.say('Press J to read the rules.', 4), 5200);
      }
    }

    // ---------- world interface for the renderer ----------
    decalTex(d) {
      const T = RT.Tex.decals;
      switch (d.kind) {
        case 'switch': return this.roomLit[d.room] ? T.switchOn : T.switchOff;
        case 'frontDoor': d.emissive = this.prep.doorOpen ? 0.1 : 0; return this.prep.doorOpen ? T.doorOpen : T.door;
        default: return T[d.kind];
      }
    }
    get viewModel() {
      return {
        candle: this.inv.candle && this.phase !== 'dead',
        lit: this.candleLit, smoke: this.smoke,
        match: this.strike ? Math.min(1, this.strike.t / 0.25) : 0,
        matchFlame: this.strike && this.strike.flame,
        lower: this.saltWin && this.saltWin.pour > 0 ? 30 : 0,
      };
    }

    // ---------- helpers ----------
    walkable(x, y) { return !this.map.isWall(x | 0, y | 0); }
    blocked(cx, cy) { return this.map.isWall(cx, cy); }
    get solids() { return this.props; }
    // 0 at midnight -> 1 at 3:33; everything gets nastier smoothly
    diff() { return this.phase === 'prep' ? 0 : RT.clamp(this.minutes / END_MINUTE, 0, 1); }
    lightsOnCount() { return ROOMS.filter((r) => this.roomLit[r]).length; }
    los(ax, ay, bx, by) {
      const d = RT.dist(ax, ay, bx, by), n = Math.ceil(d / 0.1);
      for (let i = 1; i < n; i++) { const t = i / n; if (this.map.isWall((ax + (bx - ax) * t) | 0, (ay + (by - ay) * t) | 0)) return false; }
      return true;
    }
    // BFS distance field (4-neighbour) to a target cell
    field(tx, ty) {
      const W = M.W, H = M.H, f = new Int16Array(W * H).fill(-1), q = [ty * W + tx];
      f[ty * W + tx] = 0;
      for (let qi = 0; qi < q.length; qi++) {
        const c = q[qi], cx = c % W, cy = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (this.map.isWall(nx, ny)) continue;
          const ni = ny * W + nx; if (f[ni] >= 0) continue;
          f[ni] = f[c] + 1; q.push(ni);
        }
      }
      return f;
    }
    walkableCells() {
      if (this._cells) return this._cells;
      const out = []; for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) if (!this.map.isWall(x, y)) out.push([x, y]);
      return (this._cells = out);
    }

    // ---------- main update ----------
    update(dt, input) {
      this.time += dt;
      const p = this.player;
      if (this.phase === 'dead' || this.phase === 'over') return;

      RT.movePlayer(this, dt, input, { frozen: !!this.swing || (this.saltWin && input.down('salt')) });
      this.updateStrike(dt);
      if (this.swing) this.swing.update(dt, input);
      if (this.smoke > 0) this.smoke = Math.max(0, this.smoke - dt * 0.4);
      if (this.prep.knockCD > 0) this.prep.knockCD -= dt;

      // actions
      const target = this.findTarget();
      this.ui.setPrompt(target ? target.label : '');
      if (!this.swing) {
        if (input.take('interact') && target) target.act();
        else if (target && target.repeat && input.down('interact') && this.prep.knockCD <= 0) target.act();
        if (input.take('relight')) this.tryRelight();
      }
      if (input.take('flashlight')) this.useFlashlight();
      if (input.take('salt') && !this.saltWin && this.phase === 'game') this.ui.say(this.candleOut ? 'Relight the candle first. Salt is the last resort.' : 'Salt is only for when the candle cannot be relit.', 2.5);

      if (this.phase === 'game' || this.phase === 'trapped' || this.phase === 'halluc') this.updateClock(dt, input);
      if (this.phase === 'game') this.updateGame(dt, input);
      if (this.phase === 'trapped') this.updateTrapped(dt);
      if (this.phase === 'halluc') this.updateHalluc(dt);

      // lights for renderer
      const L = this.lights; L.length = 0;
      const fl = 0.85 + Math.sin(this.time * 17) * 0.06 + Math.sin(this.time * 29) * 0.05 + (Math.random() - 0.5) * 0.06;
      if (this.candleLit && this.inv.candle) L.push({ x: p.x + Math.cos(p.a) * 0.2, y: p.y + Math.sin(p.a) * 0.2, radius: 5.2, intensity: 1.35 * fl, r: 1, g: 0.7, b: 0.4 });
      if (this.prep.offering === 2) L.push({ x: this.offering.x, y: this.offering.y - 0.1, radius: 4.2, intensity: 1.2 * fl, r: 1, g: 0.7, b: 0.4 });
      if (this.strike && this.strike.flame) L.push({ x: p.x, y: p.y, radius: 2.6, intensity: 0.9, r: 1, g: 0.75, b: 0.45 });
      if (this.flashOn) L.push({ x: p.x, y: p.y, radius: 9, intensity: 1.8, r: 0.95, g: 0.95, b: 0.88, cone: true, dx: Math.cos(p.a), dy: Math.sin(p.a) });
      this.ambient = this.phase === 'prep' ? 0.07 : this.phase === 'halluc' ? 0.6 + Math.sin(this.time * 1.7) * 0.15 : 0.04;
      this.saltCircleRender = this.saltCircle || (this.saltWin && this.saltWin.pour > 0 ? { x: this.saltWin.x, y: this.saltWin.y, r: 0.75, progress: this.saltWin.pour / SALT_POUR_TIME } : null);

      this.updateHud();
      this.updateAudio(dt);
    }

    // ---------- interaction ----------
    findTarget() {
      const p = this.player, ca = Math.cos(p.a), sa = Math.sin(p.a);
      if (this.phase === 'halluc' || this.phase === 'trapped') return null;
      let best = null, bestD = 1e9;
      // wall decal straight ahead
      for (let d = 0.1; d < 1.6; d += 0.05) {
        const x = p.x + ca * d, y = p.y + sa * d, cx = x | 0, cy = y | 0;
        if (this.map.isWall(cx, cy)) {
          const px = (p.x + ca * (d - 0.05)) | 0, py = (p.y + sa * (d - 0.05)) | 0;
          const f = px < cx ? 'W' : px > cx ? 'E' : py < cy ? 'N' : 'S';
          const dec = this.map.decalAt(cx, cy, f);
          if (dec && (dec.kind === 'switch' || dec.kind === 'frontDoor')) { best = this.decalAction(dec); bestD = d; }
          break;
        }
      }
      const cand = [];
      for (const s of this.props) if (s.special || (s.item && !s.taken)) cand.push(s);
      if (this.prep.offering >= 0) cand.push(this.offering);
      if (this.phase === 'game' && !this.mm.sprite.hidden) cand.push(this.mm);
      for (const s of cand) {
        const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
        const reach = s === this.mm ? 3 : 1.7;
        if (d > reach || d >= bestD + 0.3) continue;
        if (Math.abs(RT.angleDiff(Math.atan2(dy, dx), p.a)) > (s === this.mm ? 0.3 : 0.5)) continue;
        const act = s === this.mm ? this.mmAction() : s === this.offering ? this.offeringAction() : this.propAction(s);
        if (act && d < bestD) { best = act; bestD = d; }
      }
      return best;
    }

    decalAction(dec) {
      if (dec.kind === 'switch') {
        const on = this.roomLit[dec.room];
        return { label: `[E] Turn ${on ? 'off' : 'on'} the ${RT.Map.ROOM_NAMES[dec.room].toLowerCase()} light`, act: () => {
          RT.Audio.click();
          this.roomLit[dec.room] = !on;
          if (!on && this.phase !== 'prep') this.die('light');
        } };
      }
      // front door
      const pr = this.prep;
      if (this.phase !== 'prep') return { label: '[E] Front door', act: () => this.ui.say('The handle will not turn. It is not 3:33 yet.', 3) };
      if (pr.offering < 0) {
        return { label: '[E] Place your name before the door', act: () => {
          if (!pr.paperTaken) return this.ui.say('You need your name, written and marked with your blood.', 3);
          const n = this.lightsOnCount();
          if (n > 0) return this.ui.say(`Every light in the house must be off first. (${n} still on)`, 3.5);
          if (this.flashOn) return this.ui.say('Switch the flashlight off. The house must be dark.', 3);
          pr.offering = 0; this.offering.hidden = false; this.inv.paper = false; RT.Audio.pickup();
          this.ui.say('You lay the paper on the floor before the door.', 3);
        } };
      }
      if (pr.offering === 0 && !pr.blown) {
        return { label: '[E] Place the candle on your name', act: () => {
          if (!this.inv.candle) return this.ui.say('You need a candle.', 2.5);
          pr.offering = this.candleLit ? 2 : 1; this.inv.candle = false; this.candleLit = false; RT.Audio.pickup();
          this.ui.say(pr.offering === 2 ? 'The candle burns on your name.' : 'Now light it.', 3);
        } };
      }
      if (pr.offering === 1 && !pr.blown) {
        return { label: '[E] Light the candle', act: () => {
          if (this.inv.matches <= 0) return this.ui.say(this.inv.lighter ? 'Not the lighter. Matches. It must be done properly.' : 'You need matches.', 3);
          this.beginSwing(() => { pr.offering = 2; this.ui.say('Knock on the door. Twenty-two times.', 4); });
        } };
      }
      if (pr.offering === 2 && pr.knocks < 22) {
        return { label: `[E] Knock  (${pr.knocks}/22)  — hold to keep knocking`, repeat: true, act: () => {
          if (pr.knockCD > 0) return;
          pr.knockCD = 0.16; pr.knocks++; RT.Audio.knock(0.6 + pr.knocks / 40);
          if (pr.knocks === 22) {
            this.ui.setClock('12:00 A.M.');
            this.ui.bigText('12:00 A.M.', 3);
            setTimeout(() => { if (this.phase === 'prep') { RT.Audio.knock(0.5); this.ui.say('Something knocks back. Once.', 4); } }, 2600);
          }
        } };
      }
      if (pr.knocks >= 22 && !pr.doorOpen && !pr.blown) {
        return { label: '[E] Open the door', act: () => { pr.doorOpen = true; RT.Audio.creak(0); this.ui.say('Cold air pours in. Blow out the candle.', 4); } };
      }
      if (pr.doorOpen && pr.offering === 2) {
        return { label: '[E] Blow out the candle', act: () => {
          pr.offering = 0; pr.blown = true; this.inv.candle = true; this.candleLit = false; this.smoke = 1; RT.Audio.blow();
          this.ui.say('You take the candle. Close the door.', 3);
        } };
      }
      if (pr.doorOpen && pr.blown) {
        return { label: '[E] Close the door', act: () => {
          pr.doorOpen = false; pr.closed = true; RT.Audio.knock(0.4);
          this.ui.say('You have let the Midnight Man into your house.', 4);
          setTimeout(() => this.phase === 'prep' && this.ui.say('Relight your candle. Now.  [R]', 5), 2500);
          if (this.candleLit) this.startGame();
        } };
      }
      return { label: 'Front door', act: () => {} };
    }

    offeringAction() {
      // looking down at the paper/candle is the same as using the door
      const dec = this.map.decalAt(M.FRONT_DOOR.x, M.FRONT_DOOR.y, 'N');
      const a = this.decalAction(dec);
      return a && a.label !== 'Front door' ? a : null;
    }

    propAction(s) {
      if (s.special === 'desk') return this.deskAction(s);
      if (s.special === 'bed') {
        if (this.phase === 'game') return { label: '[E] Lie down. Just for a minute.', act: () => this.die('sleep') };
        return { label: 'Your bed', act: () => this.ui.say('Not tonight.', 2) };
      }
      if (!s.item || s.taken) return null;
      const names = { matches: 'a box of matches', matches2: 'a few loose matches', salt: 'the salt', candle: 'the candle', lighter: 'a lighter', flashlight: 'a flashlight', needle: 'a sewing needle' };
      return { label: `[E] Take ${names[s.item]}`, act: () => {
        s.taken = true; RT.Audio.pickup();
        const i = this.inv;
        switch (s.item) {
          case 'matches': i.matches += 20; this.ui.say('Matches. 20 of them.', 2.5); break;
          case 'matches2': i.matches += 10; this.ui.say('10 more matches.', 2.5); break;
          case 'salt': i.salt = true; this.ui.say('A full canister of salt.', 2.5); break;
          case 'candle': i.candle = true; this.ui.say('A plain white candle.', 2.5); break;
          case 'lighter': i.lighter = true; this.ui.say('A lighter. Easier than matches...', 3); break;
          case 'flashlight': i.flashlight = true; this.ui.say('A flashlight. [F]', 2.5); break;
          case 'needle': i.needle = true; this.ui.say('A sewing needle from the first-aid kit.', 2.5); break;
        }
      } };
    }

    deskAction(s) {
      const pr = this.prep;
      if (pr.paperTaken) return null;
      if (!pr.name) return { label: '[E] Write your full name', act: () => {
        this.game.askName((name) => { pr.name = name; this.ui.say(`"${name}"`, 3); });
      } };
      if (!pr.blood) return { label: this.inv.needle ? '[E] Prick your finger' : 'You need something sharp', act: () => {
        if (!this.inv.needle) return this.ui.say('Something sharp... the bathroom first-aid kit?', 3);
        RT.Audio.burst({ freq: 3000, type: 'bandpass', dur: 0.05, vol: 0.2 });
        this.ui.flash('rgba(120,0,0,0.35)');
        pr.blood = true; this.ui.say('A drop of your blood soaks into the paper.', 3.5);
      } };
      return { label: '[E] Take the paper', act: () => { pr.paperTaken = true; s.taken = true; this.inv.paper = true; RT.Audio.pickup(); this.ui.say('Your name, in ink and blood.', 2.5); } };
    }

    propOf(item, name) {
      const s = this.props.find((q) => q.item === item);
      if (!s) return null;
      return { x: s.x, y: s.y, name: name || (s.special === 'desk' ? 'Study desk' : item) };
    }
    nearestSwitch() {
      const p = this.player; let best = null, bd = 1e9;
      for (const d of RT.Map.DECALS) {
        if (d.kind !== 'switch' || !this.roomLit[d.room]) continue;
        const o = { N: [0.5, -0.05], S: [0.5, 1.05], E: [1.05, 0.5], W: [-0.05, 0.5] }[d.f];
        const x = d.x + o[0], y = d.y + o[1], dd = RT.dist(x, y, p.x, p.y);
        if (dd < bd) { bd = dd; best = { x, y, name: RT.Map.ROOM_NAMES[d.room] + ' light' }; }
      }
      return best;
    }

    // ending copy for the shared ending screen
    ending(kind, reason) {
      const name = (this.prep.name || 'You').split(' ')[0];
      const DEATHS = {
        light: ['YOU TURNED ON A LIGHT', 'The rules were simple. In the sudden glare he was already standing beside you.'],
        flashlight: ['YOU USED A FLASHLIGHT', 'The beam found him at the end of the corridor. Then it found nothing at all.'],
        sleep: ['YOU FELL ASLEEP', 'You only closed your eyes for a moment. You never opened them again.'],
        provoke: ['YOU PROVOKED HIM', 'You reached out to it. It reached back.'],
        caught: ['HE FOUND YOU', 'Cold fingers in the dark. The Midnight Man does not lose his own game.'],
        circle: ['YOU LEFT THE CIRCLE', 'One step past the salt. He had been waiting for it.'],
      };
      const stats = this.phase === 'dead' && this.minutes === 0 ? '' : `Clock: ${RT.fmtClock(Math.min(this.minutes, END_MINUTE))}  ·  Matches left: ${this.inv.matches}`;
      if (kind === 'win') return { win: true, title: '3:33 A.M.', text: `The cold lifts. The whispering stops. The Midnight Man leaves your house, and the sky outside begins to grey. ${name}, you won the Midnight Game.`, stats, next: 'Next: <b>Level 2 &mdash; The Elevator</b>' };
      if (kind === 'trapped') return { title: 'SURVIVED. NOT WON.', text: 'You spent the rest of the night inside the salt while it circled you, whispering your name. At 3:33 it was gone. But you did not win the game, and it knows where you live.', stats };
      if (kind === 'lost') return { title: 'YOUR GREATEST FEAR', text: 'It held you until 3:33. When morning came you were still sitting in the dark, and you have not been able to sleep with the lights off since.', stats };
      const [title, text] = DEATHS[reason] || ['YOU DID NOT SURVIVE', ''];
      return { title, text, stats };
    }

    mmAction() {
      const d = RT.dist(this.mm.x, this.mm.y, this.player.x, this.player.y);
      if (d > 3) return null;
      return { label: '[E] Reach out to it', act: () => this.die('provoke') };
    }

    // ---------- candle ----------
    // Strike a match: a timing meter. The zone shrinks and the marker speeds
    // up as the night goes on, and again when he is close.
    beginSwing(done) {
      if (this.strike || this.swing) return;
      const f = this.diff();
      const near = this.phase === 'game' && !this.mm.sprite.hidden && RT.dist(this.mm.x, this.mm.y, this.player.x, this.player.y) < 2.5;
      const zone = this.phase === 'prep' ? 0.3 : RT.lerp(0.24, 0.12, f) * (near ? 0.75 : 1);
      const speed = this.phase === 'prep' ? 0.9 : RT.lerp(1.1, 2.0, f) * (near ? 1.2 : 1);
      this.ui.say('Strike the match: press [E] or [R] in the marked zone.', 2.5);
      this.swing = new RT.SwingMeter(this.ui, { zone, speed, timeout: 3.2, onDone: (ok, timedOut) => {
        this.swing = null;
        this.inv.matches--;
        this.strike = { t: 0, success: ok, done, flame: false, timedOut };
        RT.Audio.strike(ok);
      } });
    }
    updateStrike(dt) {
      const s = this.strike; if (!s) return;
      s.t += dt;
      s.flame = s.t > 0.3 && (s.success || s.t < 0.42);
      if (s.t > 1.0) {
        this.strike = null;
        if (s.success) s.done && s.done();
        else this.ui.say(s.timedOut ? 'Your hands shake too much. The match snaps.' : RT.choice(['The match sputters and dies.', 'The head crumbles off the match.', 'Too hard. The match snaps.']), 1.8);
      }
    }
    tryRelight() {
      if (this.strike || this.swing) return;
      if (this.phase === 'halluc' || this.phase === 'dead') return;
      if (!this.inv.candle) return this.ui.say(this.prep.offering >= 1 ? 'The candle is at the door.' : 'You have no candle.', 2);
      if (this.candleLit) return;
      if (this.inv.matches <= 0) {
        if (this.inv.lighter) {
          RT.Audio.lighterFail();
          this.strike = { t: 0.5, success: false, flame: false };
          return this.ui.say('The lighter sparks, but the wick will not take it. It will not work.', 3);
        }
        return this.ui.say('You are out of matches.', 2.5);
      }
      this.beginSwing(() => {
        this.candleLit = true;
        if (this.phase === 'prep' && this.prep.closed) this.startGame();
        else if (this.phase === 'game' && this.candleOut) this.onRelit();
        else if (this.phase === 'trapped') this.ui.say('The flame does not make you any less trapped.', 3);
      });
    }
    useFlashlight() {
      if (!this.inv.flashlight) return;
      if (this.phase === 'game') return this.die('flashlight');
      if (this.phase !== 'prep') return;
      this.flashOn = !this.flashOn; RT.Audio.click();
    }
    blowOut(reason) {
      this.candleLit = false; this.smoke = 1; RT.Audio.blow();
      this.candleOut = { t: 0 };
      this.ui.say(RT.choice(['Your candle goes out.', 'The flame dies. Something is near.', 'A breath, cold as a cellar, and the flame is gone.']), 2.5);
      setTimeout(() => this.candleOut && this.ui.say('Relight it. Ten seconds.  [R]', 3), 1200);
    }
    onRelit() {
      this.candleOut = null;
      this.ui.say('The flame holds. It draws back.', 2.5);
      this.mmRetreat();
    }

    // Debug helper (?skip in the URL): jump straight to 12:00 a.m. in the hall.
    skipPrep() {
      Object.assign(this.inv, { candle: true, matches: 30, salt: true });
      for (const r of ROOMS) this.roomLit[r] = false;
      Object.assign(this.prep, { name: 'Test Subject One', blood: true, paperTaken: true, offering: 0, knocks: 22, blown: true, closed: true });
      this.offering.hidden = false;
      for (const s of this.props) if (['paper', 'candle', 'matches', 'salt'].includes(s.item)) s.taken = true;
      this.player.x = 11.5; this.player.y = 14; this.player.a = -Math.PI / 2;
      this.candleLit = true;
      this.startGame();
    }

    // ---------- the game proper ----------
    startGame() {
      this.phase = 'game';
      this.minutes = 0;
      this.ui.setClock(RT.fmtClock(0));
      this.ui.bigText('THE MIDNIGHT GAME', 3.5, 'Survive until 3:33 A.M.');
      RT.Audio.stinger();
      this.mm.state = 'gone'; this.mm.timer = 20; this.mm.nextVisit = RT.rand(40, 55);
      this.positions = [];
      this.game.input.lastInput = performance.now();
    }

    updateClock(dt, input) {
      let scale = this.timeScaleDebug;
      if (this.phase === 'trapped' || this.phase === 'halluc') {
        scale *= this.phase === 'halluc' && this.haTime > 6 ? 20 : 1;
        if (input.down('wait')) scale *= this.phase === 'halluc' ? 3 : 40;
      }
      const before = this.minutes;
      this.minutes += dt * scale / SECONDS_PER_GAME_MINUTE;
      for (const h of [60, 120, 180]) if (before < h && this.minutes >= h) { RT.Audio.chime(h / 60); this.ui.bigText(RT.fmtClock(h), 2.5); }
      this.ui.setClock(RT.fmtClock(Math.min(this.minutes, END_MINUTE)));
      if (this.minutes >= END_MINUTE) {
        RT.Audio.chime(3);
        if (this.phase === 'game') this.game.endLevel('win');
        else if (this.phase === 'trapped') this.game.endLevel('trapped');
        else this.game.endLevel('lost');
        this.phase = 'over';
      }
    }

    hour() { return Math.min(3, Math.floor(this.minutes / 60)); }

    updateGame(dt, input) {
      const p = this.player, mm = this.mm;
      // sleep: doing nothing for too long
      const idle = (performance.now() - input.lastInput) / 1000;
      this.drowsy = RT.clamp((idle - 30) / 20, 0, 1);
      if (idle > 30 && !this.flags.drowsy) { this.flags.drowsy = true; this.ui.say('Your eyelids are so heavy...', 3); }
      if (idle < 5) this.flags.drowsy = false;
      if (idle > 50) return this.die('sleep');

      // standing still: he will find you
      this.posTimer += dt;
      if (this.posTimer > 1) {
        this.posTimer = 0; this.positions.push([p.x, p.y]);
        const lim = this.stillLimit();
        while (this.positions.length > lim) this.positions.shift();
        if (this.positions.length >= lim && this.positions.every(([x, y]) => RT.dist(x, y, p.x, p.y) < 1.8)) {
          this.positions = [];
          if (!this.flags.stillWarn) { this.flags.stillWarn = true; this.ui.say('You have stayed in one place too long.', 3); }
          this.mmFind();
        }
      }

      // candle out countdown
      if (this.candleOut) {
        this.candleOut.t += dt;
        if (this.candleOut.t > RELIGHT_WINDOW && !this.strike) {
          this.candleOut = null;
          if (!this.inv.salt) return this.startHalluc();
          this.saltWin = { t: 0, pour: 0, x: p.x, y: p.y };
          this.ui.say('Too late. SALT. Surround yourself. HOLD [Q]', 4);
        }
      }
      if (this.saltWin) {
        const sw = this.saltWin;
        if (input.down('salt')) {
          if (sw.pour === 0) { sw.x = p.x; sw.y = p.y; }
          sw.pour += dt;
          if (sw.pour >= SALT_POUR_TIME) {
            this.saltCircle = { x: sw.x, y: sw.y, r: 0.75, progress: 1 };
            this.saltWin = null;
            return this.startTrapped();
          }
        } else { sw.pour = 0; sw.t += dt; }
        if (sw.t > SALT_WINDOW) { this.saltWin = null; return this.startHalluc(); }
      }
      this.updateMM(dt);
    }

    // ---------- the Midnight Man ----------
    showMM(on) { this.mm.sprite.hidden = !on; }
    placeMM(x, y) { this.mm.x = x; this.mm.y = y; this.mm.field = null; }
    pickSpot(minD, maxD, hidden) {
      const p = this.player, f = this.field(p.x | 0, p.y | 0), W = M.W;
      const ok = [], fallback = [];
      for (const [x, y] of this.walkableCells()) {
        const d = f[y * W + x]; if (d < minD || d > maxD) continue;
        const cx = x + 0.5, cy = y + 0.5;
        const ang = Math.abs(RT.angleDiff(Math.atan2(cy - p.y, cx - p.x), p.a));
        const seen = ang < 0.9 && this.los(p.x, p.y, cx, cy);
        (hidden && seen ? fallback : ok).push([cx, cy]);
      }
      return RT.choice(ok.length ? ok : fallback.length ? fallback : [[11.5, 8]]);
    }
    farRoomSpot() {
      const p = this.player;
      const cells = this.walkableCells().filter(([x, y]) => RT.dist(x, y, p.x, p.y) > 9);
      const [x, y] = RT.choice(cells); return [x + 0.5, y + 0.5];
    }
    mmFind() {
      const mm = this.mm;
      if (mm.state === 'close' || mm.state === 'retreat') return;
      const d = RT.dist(mm.x, mm.y, this.player.x, this.player.y);
      if (mm.state === 'gone' || d > 8) { const [x, y] = this.pickSpot(6, 9, true); this.placeMM(x, y); }
      mm.state = 'hunt'; mm.goal = [this.player.x, this.player.y]; this.showMM(true);
      RT.Audio.creak(0);
    }
    mmRetreat() {
      const mm = this.mm;
      mm.state = 'retreat'; mm.timer = 2.5;
      mm.nextVisit = this.visitDelay();
    }
    visitDelay() { const f = this.diff(); return RT.lerp(52, 20, f) * RT.rand(0.8, 1.25); }
    huntSpeed() { return RT.lerp(1.25, 2.0, this.diff()); }
    blowRadius() { return RT.lerp(2.5, 3.6, this.diff()); }
    stillLimit() { return Math.round(RT.lerp(22, 12, this.diff())); }

    stepToward(gx, gy, speed, dt) {
      const mm = this.mm, W = M.W;
      const tc = (gy | 0) * W + (gx | 0);
      mm.fieldT -= dt;
      if (!mm.field || mm.fieldTarget !== tc || mm.fieldT <= 0) { mm.field = this.field(gx | 0, gy | 0); mm.fieldTarget = tc; mm.fieldT = 0.5; }
      const cx = mm.x | 0, cy = mm.y | 0;
      let tx = gx, ty = gy;
      const here = mm.field[cy * W + cx];
      if (here > 1) {
        let best = here, bx = cx, by = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const v = mm.field[(cy + dy) * W + cx + dx];
          if (v >= 0 && v < best) { best = v; bx = cx + dx; by = cy + dy; }
        }
        tx = bx + 0.5; ty = by + 0.5;
      }
      const dx = tx - mm.x, dy = ty - mm.y, d = Math.hypot(dx, dy);
      if (d > 0.01) { const s = Math.min(d, speed * dt); mm.x += dx / d * s; mm.y += dy / d * s; }
      return RT.dist(mm.x, mm.y, gx, gy);
    }

    updateMM(dt) {
      const mm = this.mm, p = this.player;
      const d = RT.dist(mm.x, mm.y, p.x, p.y);
      mm.sprite.x = mm.x; mm.sprite.y = mm.y;

      if (!this.candleOut && !this.saltWin) mm.nextVisit -= dt;
      if (mm.nextVisit <= 0 && this.candleLit && mm.state !== 'close') {
        // "Should your candle ever go out, then that means the Midnight Man is nearby."
        const [x, y] = this.pickSpot(4, 6, true);
        this.placeMM(x, y); this.showMM(true);
        mm.state = 'close';
        mm.closeSpeed = Math.max(0.25, (RT.dist(x, y, p.x, p.y) - 1.1) / 9);
        this.blowOut();
        return;
      }

      switch (mm.state) {
        case 'gone':
          this.showMM(false);
          mm.timer -= dt;
          if (mm.timer <= 0) { const [x, y] = this.farRoomSpot(); this.placeMM(x, y); mm.state = 'wander'; mm.goal = null; this.showMM(true); }
          break;
        case 'wander': {
          if (!mm.goal || RT.dist(mm.x, mm.y, mm.goal[0], mm.goal[1]) < 0.3) { const [x, y] = RT.choice(this.walkableCells()); mm.goal = [x + 0.5, y + 0.5]; }
          this.stepToward(mm.goal[0], mm.goal[1], RT.lerp(0.8, 1.3, this.diff()), dt);
          const sees = this.candleLit && d < RT.lerp(7, 11, this.diff()) && this.los(mm.x, mm.y, p.x, p.y);
          if (sees || (this.sprinting && d < 9)) { mm.state = 'hunt'; mm.goal = [p.x, p.y]; }
          break;
        }
        case 'hunt': {
          const sees = (this.candleLit || this.sprinting) && d < 10 && this.los(mm.x, mm.y, p.x, p.y);
          if (sees || this.sprinting && d < 9) mm.goal = [p.x, p.y];
          const left = this.stepToward(mm.goal[0], mm.goal[1], this.huntSpeed(), dt);
          if (left < 0.4 && !sees) { mm.state = 'wander'; mm.goal = null; }
          break;
        }
        case 'close': {
          // He closes in while the flame is out, then waits just out of reach.
          // Walking into him is another matter.
          if (!this.saltWin && d > 1.1) this.stepToward(p.x, p.y, mm.closeSpeed, dt);
          break;
        }
        case 'retreat': {
          mm.timer -= dt;
          const dx = mm.x - p.x, dy = mm.y - p.y, l = Math.hypot(dx, dy) || 1;
          const nx = mm.x + dx / l * 1.1 * dt, ny = mm.y + dy / l * 1.1 * dt;
          if (this.walkable(nx, ny)) { mm.x = nx; mm.y = ny; }
          if (mm.timer <= 0) { mm.state = 'gone'; mm.timer = RT.lerp(14, 4, this.diff()) * RT.rand(0.7, 1.3); }
          break;
        }
      }

      // a lit candle near him goes out
      const d2 = RT.dist(mm.x, mm.y, p.x, p.y);
      if (this.candleLit && mm.state !== 'gone' && mm.state !== 'retreat' && d2 < this.blowRadius() && !this.strike && !this.swing) {
        mm.state = 'close'; mm.closeSpeed = Math.max(0.25, (d2 - 1.1) / 9);
        this.blowOut();
      }
      // being touched = attacked
      if (mm.state !== 'gone' && mm.state !== 'retreat' && d2 < 0.55) this.die('caught');

      // he doesn't walk so much as skip: every so often he lurches forward
      if ((mm.state === 'hunt' || mm.state === 'close') && Math.random() < dt * 0.35 && d2 > 1.6) {
        const k = 0.35 / Math.max(0.01, d2); const nx = mm.x + (p.x - mm.x) * k, ny = mm.y + (p.y - mm.y) * k;
        if (this.walkable(nx, ny)) { mm.x = nx; mm.y = ny; }
      }
      mm.sprite.shake = d2 < 4 ? (4 - d2) * 1.5 : 0;
      mm.sprite.x = mm.x; mm.sprite.y = mm.y;
      // floor creaks as he moves
      if (mm.state !== 'gone' && d < 10 && Math.random() < dt * 0.25) RT.Audio.creak(RT.clamp(Math.sin(RT.angleDiff(Math.atan2(mm.y - p.y, mm.x - p.x), p.a)), -1, 1));
    }

    // ---------- salt circle / hallucination ----------
    startTrapped() {
      this.phase = 'trapped';
      this.mm.state = 'circle'; this.showMM(true);
      this.mm.angle = Math.atan2(this.mm.y - this.saltCircle.y, this.mm.x - this.saltCircle.x);
      RT.Audio.stinger();
      this.ui.say('The circle is closed. It cannot cross the salt.', 4);
      setTimeout(() => this.phase === 'trapped' && this.ui.say('You must stay inside until 3:33.  Hold [SPACE] to wait it out.', 6), 4200);
    }
    updateTrapped(dt) {
      const c = this.saltCircle, p = this.player, mm = this.mm;
      mm.angle += dt * 0.35;
      mm.x = c.x + Math.cos(mm.angle) * 1.5; mm.y = c.y + Math.sin(mm.angle) * 1.5;
      if (!this.walkable(mm.x, mm.y)) { mm.x = c.x + Math.cos(mm.angle) * 1.0; mm.y = c.y + Math.sin(mm.angle) * 1.0; }
      mm.sprite.x = mm.x; mm.sprite.y = mm.y;
      if (RT.dist(p.x, p.y, c.x, c.y) > c.r - 0.1) this.die('circle');
    }
    startHalluc() {
      this.phase = 'halluc'; this.haTime = 0;
      this.showMM(false); this.mm.state = 'gone';
      RT.Audio.scream();
      this.ui.say('You failed both. He shows you what you fear most.', 5);
      for (let i = 0; i < 7; i++) {
        const ph = { x: 0, y: 0, h: RT.rand(0.9, 1.6), z: 0, black: true, getTex: (t) => RT.Tex.mm[((t * 4 + i) | 0) % 3], life: 0 };
        this.phantoms.push(ph); this.sprites.push(ph); this.respawnPhantom(ph);
      }
    }
    respawnPhantom(ph) {
      const p = this.player, a = p.a + RT.rand(-1.2, 1.2), d = RT.rand(1.5, 5);
      ph.x = p.x + Math.cos(a) * d; ph.y = p.y + Math.sin(a) * d; ph.life = RT.rand(0.6, 2.5);
    }
    updateHalluc(dt) {
      this.haTime += dt;
      this.fx.hallucinate = Math.min(1, this.haTime / 3);
      this.candleLit = false;
      for (const ph of this.phantoms) {
        ph.life -= dt;
        const dx = this.player.x - ph.x, dy = this.player.y - ph.y, l = Math.hypot(dx, dy) || 1;
        ph.x += dx / l * dt * 1.5; ph.y += dy / l * dt * 1.5;
        if (ph.life <= 0 || l < 0.6) this.respawnPhantom(ph);
      }
      if (Math.random() < dt * 0.6) {
        const nm = (this.prep.name || '').split(' ');
        this.ui.say(RT.choice([`${nm[0] || ''}...`, 'You let me in.', 'Look behind you.', `${(this.prep.name || '').toUpperCase()}`, 'You are still in the dark.', 'It is not 3:33.']), 1.2);
      }
      if (this.haTime > 6 && !this.flags.haHint) { this.flags.haHint = true; this.ui.say('It will not stop until 3:33. Hold [SPACE] to endure.', 5); }
    }

    die(reason) {
      if (this.phase === 'dead' || this.phase === 'over') return;
      this.phase = 'dead';
      this.candleOut = null; this.saltWin = null;
      // the jumpscare: he is in your face
      const p = this.player;
      this.placeMM(p.x + Math.cos(p.a) * 0.45, p.y + Math.sin(p.a) * 0.45);
      this.mm.sprite.x = this.mm.x; this.mm.sprite.y = this.mm.y; this.mm.sprite.hidden = false; this.mm.sprite.h = 1.5; this.mm.state = 'close';
      this.ui.flash('rgba(160,0,0,0.6)');
      this.ui.jumpscare(RT.Tex.faces.mm, 1.3);
      // a burst of light so you see exactly what took you
      this.ambient = 0.9; this.lights.length = 0; this.fx.hallucinate = 0.35;
      RT.Audio.scream();
      setTimeout(() => this.game.endLevel('dead', reason), 1500);
    }

    // ---------- HUD + audio ----------
    updateHud() {
      const pr = this.prep, i = this.inv;
      if (this.phase === 'prep') {
        const lightsLeft = this.lightsOnCount();
        const desk = this.propOf('paper'), door = { x: 11.5, y: 16.7, name: 'Front door' };
        const sw = this.nearestSwitch();
        const steps = [
          [!!pr.name, 'Write your full name on paper', desk],
          [pr.blood, 'Add a drop of your own blood', i.needle ? desk : this.propOf('needle', 'Needle')],
          [pr.paperTaken, 'Take the paper', desk],
          [i.candle || pr.offering >= 1, 'Find a candle', this.propOf('candle', 'Candle')],
          [i.matches > 0 || pr.offering >= 2, 'Find matches', this.propOf('matches', 'Matches')],
          [i.salt, 'Find salt', this.propOf('salt', 'Salt')],
          [lightsLeft === 0, `Turn off every light in the house  (${7 - lightsLeft}/7)`, sw],
          [pr.offering >= 2 || pr.blown, 'At the front door: lay down your name, set the candle on it, light it', door],
          [pr.knocks >= 22, `Knock 22 times  (${pr.knocks}/22)`, door],
          [pr.closed, 'Open the door, blow out the candle, close the door', door],
          [false, 'Immediately relight your candle  [R]', null],
        ];
        const p = this.player;
        let marker = null;
        for (const st of steps) {
          const tg = st[2];
          if (!st[0] && tg) {
            const m = (RT.dist(p.x, p.y, tg.x, tg.y) * 1.5).toFixed(0);
            st[1] += `  ·  ${m} m`;
            if (!marker) marker = { x: tg.x, y: tg.y, label: `${tg.name || ''} ${m} m` };
          }
          if (!st[0] && !marker && !tg) break;
        }
        this.ui.setObjectives(steps);
        this.ui.setMarker(this, marker);
      } else {
        this.ui.setMarker(this, null);
        this.ui.setObjectives(null, this.phase === 'trapped' ? 'Stay inside the salt until 3:33 A.M.' : this.phase === 'halluc' ? '...' : 'Survive until 3:33 A.M.  Keep moving. Keep the flame.');
      }
      let alarm = null;
      if (this.candleOut) alarm = { text: `RELIGHT  [R]`, frac: 1 - this.candleOut.t / RELIGHT_WINDOW };
      else if (this.saltWin) alarm = { text: this.saltWin.pour > 0 ? 'POURING SALT...' : 'SALT  [HOLD Q]', frac: this.saltWin.pour > 0 ? this.saltWin.pour / SALT_POUR_TIME : 1 - this.saltWin.t / SALT_WINDOW, salt: true };
      this.ui.setAlarm(alarm);
      const inv = [];
      if (i.candle) inv.push(this.candleLit ? 'Candle (lit)' : 'Candle');
      if (i.paper) inv.push('Your name');
      if (i.matches > 0 || this.phase !== 'prep') inv.push(`Matches ×${i.matches}`);
      if (i.salt) inv.push('Salt');
      if (i.needle && !pr.blood) inv.push('Needle');
      if (i.lighter) inv.push('Lighter');
      if (i.flashlight) inv.push(this.flashOn ? 'Flashlight (on)' : 'Flashlight');
      this.ui.setInventory(inv);
      this.ui.setOverlays({ cold: this.fx.cold, drowsy: this.drowsy || 0, dark: this.phase === 'halluc' ? 0.3 : 0 });
    }

    updateAudio(dt) {
      const p = this.player, mm = this.mm;
      let cold = 0, whisper = 0, pan = 0, heart = 0;
      if (this.phase === 'game' || this.phase === 'trapped' || this.phase === 'dead') {
        if (!mm.sprite.hidden) {
          const d = RT.dist(mm.x, mm.y, p.x, p.y);
          cold = RT.clamp(1 - d / 6.5, 0, 1);
          whisper = Math.pow(RT.clamp(1 - d / 9, 0, 1), 1.4);
          pan = RT.clamp(Math.sin(RT.angleDiff(Math.atan2(mm.y - p.y, mm.x - p.x), p.a)), -1, 1);
          heart = cold;
        }
        if (this.candleOut || this.saltWin) heart = Math.max(heart, 0.6);
        if (this.phase === 'trapped') { whisper = Math.max(whisper, 0.5); }
      }
      if (this.phase === 'halluc') { whisper = 1; heart = 1; cold = 0.6; pan = Math.sin(this.time * 2); }
      if (this.prep.doorOpen) { cold = Math.max(cold, 0.5); whisper = Math.max(whisper, 0.25); }
      this.fx.cold += (cold - this.fx.cold) * Math.min(1, dt * 2);
      if (cold > 0.45 && !this.flags.coldMsg && this.phase === 'game') { this.flags.coldMsg = true; this.ui.say('The air turns cold. Your breath fogs. Move away.', 3.5); }
      RT.Audio.update(dt, { drone: this.phase === 'prep' ? 0.18 : 0.35, wind: this.prep.doorOpen ? 0.35 : 0, whisper, whisperPan: pan, heart, salt: this.saltWin && this.saltWin.pour > 0 });
    }
  }

  RT.Level1 = Level1;
})(window.RT);

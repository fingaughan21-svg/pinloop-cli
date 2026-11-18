// Shared player controller (movement, stamina) and the relight swing meter.
(function (RT) {
  const SPRINT_SECONDS = 3.5;   // full tank
  const RECHARGE_SECONDS = 5;   // empty -> full once exhausted

  // world must provide: player, blocked(cx, cy), solids (array of {x,y,solid}), ui
  RT.movePlayer = function (w, dt, input, opts = {}) {
    const p = w.player;
    if (p.stamina === undefined) { p.stamina = 1; p.exhausted = false; p.stepAcc = 0; p.walkPhase = p.walkPhase || 0; }
    p.a += input.consumeLook() + ((input.down('turnR') ? 1 : 0) - (input.down('turnL') ? 1 : 0)) * 2.4 * dt;
    let fwd = (input.down('fwd') ? 1 : 0) - (input.down('back') ? 1 : 0) + input.moveY;
    let str = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0) + input.moveX;
    if (opts.frozen) fwd = str = 0;
    const m = Math.hypot(fwd, str); if (m > 1) { fwd /= m; str /= m; }
    const moving = m > 0.1;
    const wantSprint = input.down('sprint') && fwd > 0.3 && !p.exhausted && !opts.noSprint;
    if (wantSprint && moving) {
      p.stamina -= dt / SPRINT_SECONDS;
      if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; w.ui.say('You are out of breath.', 2); RT.Audio.breath && RT.Audio.breath(); }
    } else {
      p.stamina = Math.min(1, p.stamina + dt / (p.exhausted ? RECHARGE_SECONDS : RECHARGE_SECONDS * 0.8));
      if (p.exhausted && p.stamina >= 1) p.exhausted = false;
    }
    const sprint = wantSprint && moving;
    w.sprinting = sprint;
    const speed = (opts.speed || 2.0) * (sprint ? 1.65 : 1) * (p.exhausted ? 0.8 : 1);
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    const vx = (ca * fwd - sa * str) * speed * dt, vy = (sa * fwd + ca * str) * speed * dt;
    RT.collideMove(w, vx, vy);
    const moved = Math.hypot(vx, vy);
    p.walkPhase += moved * 4.2;
    p.bob = Math.round(Math.sin(p.walkPhase) * 1.5);
    p.stepAcc += moved;
    if (p.stepAcc > (sprint ? 0.85 : 0.65)) { p.stepAcc = 0; RT.Audio.step(); }
    w.ui.setStamina(p.stamina, p.exhausted);
  };

  RT.collideMove = function (w, vx, vy) {
    const p = w.player, r = 0.22;
    const free = (x, y) => !w.blocked((x - r) | 0, (y - r) | 0) && !w.blocked((x + r) | 0, (y - r) | 0) && !w.blocked((x - r) | 0, (y + r) | 0) && !w.blocked((x + r) | 0, (y + r) | 0);
    if (free(p.x + vx, p.y)) p.x += vx;
    if (free(p.x, p.y + vy)) p.y += vy;
    for (const s of w.solids || []) {
      if (!s.solid || s.hidden) continue;
      const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), min = s.solid + r * 0.6;
      if (d < min && d > 0.0001) {
        const nx = s.x + dx / d * min, ny = s.y + dy / d * min;
        if (free(nx, p.y)) p.x = nx; if (free(p.x, ny)) p.y = ny;
      }
    }
  };

  // Golf-swing style timing meter. A marker sweeps back and forth; stop it
  // inside the target zone. Returns a controller; call update() each frame.
  RT.SwingMeter = class {
    constructor(ui, { zone = 0.2, speed = 1.2, timeout = 3, onDone }) {
      this.ui = ui; this.pos = 0; this.dir = 1; this.t = 0;
      this.zoneW = zone; this.zoneC = RT.rand(0.25 + zone / 2, 0.95 - zone / 2);
      this.speed = speed; this.timeout = timeout; this.onDone = onDone; this.done = false;
      ui.setSwing(this);
    }
    update(dt, input) {
      if (this.done) return;
      this.t += dt;
      this.pos += this.dir * this.speed * dt;
      if (this.pos > 1) { this.pos = 2 - this.pos; this.dir = -1; }
      if (this.pos < 0) { this.pos = -this.pos; this.dir = 1; }
      this.ui.setSwing(this);
      if (this.t > 0.15 && (input.take('interact') || input.take('relight'))) return this.finish(Math.abs(this.pos - this.zoneC) <= this.zoneW / 2);
      if (this.t > this.timeout) return this.finish(false, true);
    }
    finish(ok, timedOut) { this.done = true; this.ui.setSwing(null); this.onDone(ok, timedOut); }
    cancel() { this.done = true; this.ui.setSwing(null); }
  };
})(window.RT);

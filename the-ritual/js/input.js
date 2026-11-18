// Keyboard + mouse (pointer lock) + touch controls behind one action API.
(function (RT) {
  const KEYS = {
    KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnL', ArrowRight: 'turnR',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    KeyE: 'interact', Enter: 'interact', KeyR: 'relight', KeyQ: 'salt', KeyF: 'flashlight',
    Escape: 'pause', KeyP: 'pause', KeyJ: 'journal', Tab: 'journal', Space: 'wait',
    KeyT: 'talk', KeyC: 'close', KeyO: 'open',
    Digit1: 'f1', Digit2: 'f2', Digit3: 'f3', Digit4: 'f4', Digit5: 'f5', Digit6: 'f6', Digit7: 'f7', Digit8: 'f8', Digit9: 'f9', Digit0: 'f10',
    Numpad1: 'f1', Numpad2: 'f2', Numpad3: 'f3', Numpad4: 'f4', Numpad5: 'f5', Numpad6: 'f6', Numpad7: 'f7', Numpad8: 'f8', Numpad9: 'f9', Numpad0: 'f10',
  };
  const I = {
    held: {}, pressed: {}, lookDX: 0, moveX: 0, moveY: 0, lastInput: 0, sensitivity: 1, touch: false,
    down(a) { return !!this.held[a]; },
    take(a) { const v = this.pressed[a]; this.pressed[a] = false; return !!v; },
    press(a) { if (!this.held[a]) this.pressed[a] = true; this.held[a] = true; this.lastInput = performance.now(); },
    release(a) { this.held[a] = false; },
    clear() { this.held = {}; this.pressed = {}; this.lookDX = 0; this.moveX = this.moveY = 0; },
    consumeLook() { const d = this.lookDX; this.lookDX = 0; return d; },

    init(canvas) {
      this.canvas = canvas;
      this.lastInput = performance.now();
      window.addEventListener('keydown', (e) => {
        const a = KEYS[e.code]; if (!a) return;
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        e.preventDefault(); if (!e.repeat) this.press(a);
      });
      window.addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) this.release(a); });
      window.addEventListener('blur', () => this.clear());
      canvas.addEventListener('click', () => { if (RT.Game && RT.Game.state === 'play' && !this.touch && !RT.Game.keepUnlocked) canvas.requestPointerLock?.(); });
      document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas) { this.lookDX += RT.clamp(e.movementX, -200, 200) * 0.0025 * this.sensitivity; this.lastInput = performance.now(); }
      });
      document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === canvas && e.button === 0) this.press('interact');
      });
      document.addEventListener('mouseup', (e) => { if (e.button === 0) this.release('interact'); });
      document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement && RT.Game && RT.Game.state === 'play' && !this.touch && !RT.Game.keepUnlocked) RT.Game.pause();
      });
      this.initTouch();
    },

    initTouch() {
      const zone = document.getElementById('touch');
      const stick = document.getElementById('stick'), knob = document.getElementById('knob');
      let moveId = null, lookId = null, ox = 0, oy = 0, lx = 0;
      const enable = () => { if (!this.touch) { this.touch = true; document.body.classList.add('touch'); } };
      window.addEventListener('touchstart', enable, { passive: true });
      zone.addEventListener('touchstart', (e) => {
        for (const t of e.changedTouches) {
          if (t.target.closest('.tbtn')) continue;
          if (t.clientX < window.innerWidth * 0.45 && moveId === null) {
            moveId = t.identifier; ox = t.clientX; oy = t.clientY;
            stick.style.left = ox + 'px'; stick.style.top = oy + 'px'; stick.style.display = 'block';
          } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; }
        }
        this.lastInput = performance.now();
        e.preventDefault();
      }, { passive: false });
      zone.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === moveId) {
            let dx = t.clientX - ox, dy = t.clientY - oy; const m = Math.hypot(dx, dy), R = 50;
            if (m > R) { dx *= R / m; dy *= R / m; }
            knob.style.transform = `translate(${dx}px,${dy}px)`;
            this.moveX = dx / R; this.moveY = -dy / R;
            this.held.sprint = m > R * 0.98;
          } else if (t.identifier === lookId) { this.lookDX += (t.clientX - lx) * 0.006 * this.sensitivity; lx = t.clientX; }
        }
        this.lastInput = performance.now();
        e.preventDefault();
      }, { passive: false });
      const end = (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === moveId) { moveId = null; this.moveX = this.moveY = 0; this.held.sprint = false; stick.style.display = 'none'; knob.style.transform = ''; }
          if (t.identifier === lookId) lookId = null;
        }
      };
      zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
      for (const b of document.querySelectorAll('.tbtn')) {
        const a = b.dataset.act;
        b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.press(a); b.classList.add('on'); }, { passive: false });
        b.addEventListener('touchend', (e) => { e.preventDefault(); this.release(a); b.classList.remove('on'); });
      }
    },
  };
  RT.Input = I;
})(window.RT);

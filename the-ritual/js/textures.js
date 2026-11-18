// Procedural pixel-art textures. No image files: every wall, floor, prop and
// the Midnight Man himself are generated at startup.
(function (RT) {
  const { rgba, hash, fbm, noise, clamp } = RT;

  function makeTex(w, h, fn) {
    const d = new Uint32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = fn(x, y);
        d[y * w + x] = rgba(clamp(c[0], 0, 255) | 0, clamp(c[1], 0, 255) | 0, clamp(c[2], 0, 255) | 0, c[3] === undefined ? 255 : c[3]);
      }
    return { w, h, data: d };
  }

  // Draw with the 2D canvas API, then threshold alpha and add grit so shapes
  // read as chunky pixel art.
  function canvasTex(w, h, draw, grit = 0.12, seed = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    draw(g, w, h);
    const id = g.getImageData(0, 0, w, h);
    const px = id.data;
    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      if (px[i + 3] < 110) { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; continue; }
      const k = 1 + (hash(p % w, (p / w) | 0, seed) - 0.5) * grit * 2;
      px[i] = clamp(px[i] * k, 0, 255); px[i + 1] = clamp(px[i + 1] * k, 0, 255);
      px[i + 2] = clamp(px[i + 2] * k, 0, 255); px[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return { w, h, data: new Uint32Array(px.buffer.slice(0)), canvas: c };
  }

  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // ---------- Walls ----------
  function stains(x, y, s) {
    const n = fbm(x / 14, y / 14, s, 3);
    return n > 0.72 ? 0.84 + (0.72 - n) * 0.4 : 1;
  }
  function dado(x, y, base, s) {
    // chair rail + baseboard shared by several rooms
    if (y >= 58) return shade([70, 48, 32], 0.8 + hash(x, y, s) * 0.2);
    if (y === 57) return [40, 28, 20];
    return null;
  }

  function wallpaper(base, accent, s, pattern) {
    return makeTex(64, 64, (x, y) => {
      const d = dado(x, y, base, s); if (d) return d;
      let c = base;
      if (pattern === 'stripe') { if (x % 16 < 3) c = accent; }
      else if (pattern === 'damask') {
        const cx = (x % 16) - 8, cy = (y % 20) - 10;
        const r = Math.abs(cx) * 1.6 + Math.abs(cy);
        if (r < 7 && r > 4) c = accent;
        if (Math.abs(cx) < 1 && Math.abs(cy) < 2) c = accent;
      } else if (pattern === 'floral') {
        const ox = (Math.floor(y / 16) % 2) * 8;
        const cx = ((x + ox) % 16) - 8, cy = (y % 16) - 8;
        if (cx * cx + cy * cy < 6) c = accent;
        if (cx * cx + cy * cy < 2) c = [accent[0] * 0.6, accent[1] * 0.6, accent[2] * 0.6];
      }
      const k = (0.86 + hash(x, y, s) * 0.18) * stains(x, y, s) * (y < 4 ? 0.8 : 1);
      return shade(c, k);
    });
  }
  function plaster(base, s) {
    return makeTex(64, 64, (x, y) => {
      if (y >= 36) {
        // wainscot panels
        if (y === 36 || y === 37) return [55, 38, 26];
        if (y >= 60) return shade([60, 40, 28], 0.85);
        const edge = x % 32 < 2 || y === 39 || y === 58;
        const gr = 0.85 + noise(x / 2, y / 9, s) * 0.25;
        return shade(edge ? [70, 47, 30] : [96, 64, 40], gr);
      }
      const k = (0.85 + fbm(x / 6, y / 6, s, 2) * 0.25) * stains(x, y, s);
      const crack = Math.abs(noise(x / 9, y / 3, s + 5) - 0.5) < 0.012 && y < 30;
      return shade(crack ? [60, 55, 45] : base, k);
    });
  }
  function tiles(base, grout, size, s) {
    return makeTex(64, 64, (x, y) => {
      if (y >= 60) return shade(grout, 0.7);
      const g = x % size === 0 || y % size === 0;
      const tone = 0.88 + hash(Math.floor(x / size), Math.floor(y / size), s) * 0.18;
      const k = tone * stains(x, y, s) * (0.95 + hash(x, y, s) * 0.08);
      return shade(g ? grout : base, g ? 0.9 : k);
    });
  }
  function panels(s) {
    return makeTex(64, 64, (x, y) => {
      const px = x % 32, py = y % 64;
      const frame = px < 3 || px > 28 || py < 3 || (py > 28 && py < 33) || py > 60;
      const grain = 0.75 + noise(x / 1.5, y / 12, s) * 0.4;
      const base = frame ? [80, 50, 30] : [105, 68, 42];
      const bevel = (px === 3 || py === 3 || py === 33) ? 1.25 : (px === 28 || py === 28 || py === 60) ? 0.6 : 1;
      return shade(base, grain * bevel * stains(x, y, s));
    });
  }

  // ---------- Floors / ceiling ----------
  function planks(s, base = [92, 62, 38]) {
    return makeTex(64, 64, (x, y) => {
      const row = Math.floor(y / 8);
      const off = (row * 23) % 64;
      const seamX = (x + off) % 32 === 0;
      if (y % 8 === 0 || seamX) return shade(base, 0.45);
      const tone = 0.8 + hash(row, Math.floor((x + off) / 32), s) * 0.3;
      const grain = 0.82 + noise(x / 10, y * 1.2, s) * 0.3;
      return shade(base, tone * grain);
    });
  }
  function carpet(base, accent, s, border) {
    return makeTex(64, 64, (x, y) => {
      let c = base;
      if (border) {
        const cx = Math.abs((x % 32) - 16), cy = Math.abs((y % 32) - 16);
        if (cx + cy === 10 || cx + cy === 11) c = accent;
        if (cx + cy < 3) c = accent;
      }
      return shade(c, 0.78 + hash(x, y, s) * 0.3 * (0.6 + noise(x / 5, y / 5, s) * 0.6));
    });
  }
  function checker(a, b, size, s) {
    return makeTex(64, 64, (x, y) => {
      const c = ((Math.floor(x / size) + Math.floor(y / size)) & 1) ? a : b;
      return shade(c, (0.82 + hash(x, y, s) * 0.16) * stains(x, y, s + 3));
    });
  }
  function ceiling(s) {
    return makeTex(64, 64, (x, y) => {
      const k = 0.85 + fbm(x / 8, y / 8, s, 2) * 0.2;
      const beam = (x % 64 < 2) ? 0.7 : 1;
      return shade([110, 104, 96], k * beam * stains(x, y, s));
    });
  }

  // ---------- Wall decals (alpha 0 = show wall underneath) ----------
  function switchDecal(on) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = '#b8b0a0'; g.fillRect(27, 28, 10, 15);
      g.fillStyle = '#7d766a'; g.fillRect(27, 42, 10, 1); g.fillRect(36, 28, 1, 15);
      g.fillStyle = '#e9e2d0'; g.fillRect(30, on ? 31 : 36, 4, 5);
      g.fillStyle = '#6a645a'; g.fillRect(30, on ? 35 : 36, 4, 1);
    }, 0.05, 3);
  }
  function windowDecal(frosted) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = '#3a2618'; g.fillRect(10, 8, 44, 42);
      const sky = g.createLinearGradient(0, 10, 0, 48);
      sky.addColorStop(0, frosted ? '#4b5a66' : '#1b2a44');
      sky.addColorStop(1, frosted ? '#2c3540' : '#0a0f1a');
      g.fillStyle = sky; g.fillRect(13, 11, 38, 36);
      if (!frosted) {
        g.fillStyle = '#c9d6e8'; g.beginPath(); g.arc(41, 19, 4, 0, 7); g.fill();
        g.fillStyle = '#05070c';
        // bare tree branches
        g.fillRect(16, 30, 2, 17); g.fillRect(18, 34, 8, 1); g.fillRect(22, 30, 1, 5);
        g.fillRect(14, 38, 3, 1); g.fillRect(26, 33, 1, 2);
        g.fillRect(13, 44, 38, 3);
      }
      g.fillStyle = '#3a2618'; g.fillRect(31, 11, 2, 36); g.fillRect(13, 28, 38, 2);
      g.fillStyle = '#5a3c26'; g.fillRect(8, 49, 48, 4);
      // curtains
      g.fillStyle = '#3b1414'; g.fillRect(4, 6, 7, 50); g.fillRect(53, 6, 7, 50);
      g.fillStyle = '#521d1d'; g.fillRect(6, 6, 2, 50); g.fillRect(56, 6, 2, 50);
    }, 0.08, 4);
  }
  function frontDoor(open) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = '#2b1a0e'; g.fillRect(8, 2, 48, 62);
      if (open) {
        const grd = g.createLinearGradient(0, 4, 0, 64);
        grd.addColorStop(0, '#0b1018'); grd.addColorStop(0.7, '#05070b'); grd.addColorStop(1, '#10141a');
        g.fillStyle = grd; g.fillRect(12, 5, 40, 59);
        // distant street lamp and fog
        g.fillStyle = '#c9b47a'; g.fillRect(43, 24, 2, 2);
        g.fillStyle = 'rgba(160,170,190,0.35)'; g.fillRect(12, 46, 40, 6);
        // the door swung inward
        g.fillStyle = '#5c3a1f'; g.fillRect(12, 5, 7, 59);
        g.fillStyle = '#3d2614'; g.fillRect(18, 5, 1, 59);
        return;
      }
      g.fillStyle = '#6b4424'; g.fillRect(12, 5, 40, 59);
      g.fillStyle = '#56361c';
      for (const [x, y, w, h] of [[16, 9, 13, 16], [35, 9, 13, 16], [16, 30, 13, 14], [35, 30, 13, 14], [16, 49, 13, 12], [35, 49, 13, 12]]) {
        g.fillRect(x, y, w, h);
        g.fillStyle = '#7a4f2b'; g.fillRect(x + 2, y + 2, w - 4, h - 4); g.fillStyle = '#56361c';
      }
      g.fillStyle = '#c7a24a'; g.fillRect(44, 40, 4, 3); g.fillRect(28, 46, 9, 2); // knob + letterbox
      g.fillStyle = '#1a1a1a'; g.fillRect(31, 18, 2, 2); // peephole
    }, 0.12, 5);
  }
  function painting(kind) {
    return canvasTex(64, 64, (g) => {
      g.fillStyle = '#5a4120'; g.fillRect(16, 12, 32, 30);
      g.fillStyle = '#8a6a2e'; g.fillRect(17, 13, 30, 28);
      if (kind === 0) { // portrait whose face has been scratched out
        g.fillStyle = '#1c1612'; g.fillRect(19, 15, 26, 24);
        g.fillStyle = '#3a2e26'; g.beginPath(); g.ellipse(32, 25, 6, 8, 0, 0, 7); g.fill();
        g.fillStyle = '#2a201c'; g.fillRect(24, 32, 16, 7);
        g.fillStyle = '#0a0808'; g.fillRect(28, 22, 8, 3); g.fillRect(27, 26, 10, 2);
      } else if (kind === 1) { // dark landscape
        g.fillStyle = '#26303a'; g.fillRect(19, 15, 26, 24);
        g.fillStyle = '#161c14'; g.fillRect(19, 30, 26, 9);
        g.fillStyle = '#0b0d0a'; g.fillRect(30, 21, 2, 10); g.fillRect(28, 24, 6, 1);
        g.fillStyle = '#8a8f80'; g.fillRect(38, 18, 2, 2);
      } else { // mirror
        g.fillStyle = '#3d4246'; g.fillRect(19, 15, 26, 24);
        g.fillStyle = '#596066'; g.fillRect(22, 17, 3, 8); g.fillRect(25, 17, 1, 3);
      }
    }, 0.1, 6 + kind);
  }

  // ---------- Sprites ----------
  const S = {};
  const wood = '#5b3a20', woodD = '#3c2513', woodL = '#7a5130';

  function itemOn(g, item, x, y) {
    // tiny items drawn on top of furniture
    switch (item) {
      case 'paper': g.fillStyle = '#e8e2cf'; g.fillRect(x, y, 10, 3); g.fillStyle = '#20202a'; g.fillRect(x + 7, y - 1, 6, 1); break;
      case 'matches': g.fillStyle = '#b8332a'; g.fillRect(x, y, 6, 3); g.fillStyle = '#e0d4a0'; g.fillRect(x + 1, y + 1, 4, 1); break;
      case 'salt': g.fillStyle = '#2d5fa8'; g.fillRect(x, y - 6, 6, 9); g.fillStyle = '#e8e8e8'; g.fillRect(x, y - 3, 6, 3); g.fillStyle = '#9aa'; g.fillRect(x + 1, y - 7, 4, 1); break;
      case 'candle': g.fillStyle = '#b08a3a'; g.fillRect(x - 1, y, 8, 2); g.fillStyle = '#efe6cc'; g.fillRect(x + 1, y - 9, 4, 9); g.fillStyle = '#222'; g.fillRect(x + 3, y - 10, 1, 1); break;
      case 'lighter': g.fillStyle = '#c0c4c8'; g.fillRect(x, y - 1, 3, 1); g.fillStyle = '#c0392b'; g.fillRect(x, y, 3, 4); break;
      case 'flashlight': g.fillStyle = '#222'; g.fillRect(x, y, 11, 3); g.fillStyle = '#bba'; g.fillRect(x + 10, y - 1, 3, 5); break;
      case 'needle': g.fillStyle = '#e8e8e8'; g.fillRect(x, y - 3, 9, 6); g.fillStyle = '#c03030'; g.fillRect(x + 3, y - 2, 3, 3); g.fillStyle = '#dde'; g.fillRect(x + 4, y - 6, 1, 4); break;
    }
  }

  function furniture() {
    S.desk = (item) => canvasTex(64, 44, (g) => {
      g.fillStyle = woodD; g.fillRect(4, 18, 4, 26); g.fillRect(56, 18, 4, 26);
      g.fillStyle = wood; g.fillRect(2, 14, 60, 6); g.fillRect(40, 20, 18, 16);
      g.fillStyle = woodL; g.fillRect(2, 14, 60, 2); g.fillStyle = '#c7a24a'; g.fillRect(48, 27, 3, 2);
      g.fillStyle = '#3a3226'; g.fillRect(8, 6, 3, 8); g.fillStyle = '#6a5a32'; g.fillRect(5, 2, 9, 5); // dead lamp
      if (item) itemOn(g, 'paper', 26, 11);
    }, 0.12, 11);
    S.bookshelf = canvasTex(40, 64, (g) => {
      g.fillStyle = woodD; g.fillRect(0, 0, 40, 64);
      g.fillStyle = '#1a120a'; for (let r = 0; r < 4; r++) g.fillRect(3, 3 + r * 15, 34, 12);
      const cols = ['#5a1e1e', '#1e3a2a', '#2a2a4a', '#6a5a2a', '#3a2a1a', '#4a1a3a'];
      for (let r = 0; r < 4; r++) for (let x = 4; x < 36; x += 3 + (x % 2)) {
        g.fillStyle = cols[(x * 7 + r * 3) % cols.length]; const h = 8 + ((x * 13 + r) % 4);
        g.fillRect(x, 15 + r * 15 - h, 2 + (x % 2), h);
      }
    }, 0.15, 12);
    S.armchair = canvasTex(48, 44, (g) => {
      g.fillStyle = '#4a2a22'; g.fillRect(6, 2, 36, 28); g.fillRect(0, 16, 10, 22); g.fillRect(38, 16, 10, 22);
      g.fillStyle = '#5e372c'; g.fillRect(10, 24, 28, 12); g.fillStyle = '#2a1712'; g.fillRect(4, 38, 4, 6); g.fillRect(40, 38, 4, 6);
    }, 0.15, 13);
    S.bed = canvasTex(64, 34, (g) => {
      g.fillStyle = woodD; g.fillRect(0, 0, 6, 34); g.fillRect(58, 8, 6, 26);
      g.fillStyle = '#c8c2b0'; g.fillRect(6, 10, 52, 14);
      g.fillStyle = '#4a5878'; g.fillRect(18, 10, 40, 16); g.fillStyle = '#3a4560'; g.fillRect(18, 20, 40, 6);
      g.fillStyle = '#e4dece'; g.fillRect(7, 6, 12, 7);
      g.fillStyle = woodD; g.fillRect(6, 24, 52, 4); g.fillRect(6, 28, 3, 6); g.fillRect(55, 28, 3, 6);
    }, 0.12, 14);
    S.nightstand = (item) => canvasTex(32, 40, (g) => {
      g.fillStyle = wood; g.fillRect(2, 14, 28, 26); g.fillStyle = woodL; g.fillRect(2, 14, 28, 2);
      g.fillStyle = woodD; g.fillRect(4, 20, 24, 8); g.fillRect(4, 30, 24, 8); g.fillStyle = '#c7a24a'; g.fillRect(15, 23, 3, 2); g.fillRect(15, 33, 3, 2);
      g.fillStyle = '#3a3a3a'; g.fillRect(4, 8, 8, 6); g.fillStyle = '#ddd'; g.fillRect(5, 9, 6, 3); // alarm clock
      if (item) itemOn(g, 'matches', 18, 11);
    }, 0.12, 15);
    S.wardrobe = canvasTex(44, 64, (g) => {
      g.fillStyle = woodD; g.fillRect(0, 0, 44, 64); g.fillStyle = wood; g.fillRect(3, 4, 18, 56); g.fillRect(23, 4, 18, 56);
      g.fillStyle = '#c7a24a'; g.fillRect(19, 30, 2, 4); g.fillRect(23, 30, 2, 4);
      g.fillStyle = '#0a0705'; g.fillRect(21, 4, 2, 56); // door ajar
    }, 0.12, 16);
    S.bathtub = canvasTex(64, 30, (g) => {
      g.fillStyle = '#d8d8d0'; g.fillRect(0, 6, 64, 20); g.fillStyle = '#b0b0a8'; g.fillRect(0, 6, 64, 3);
      g.fillStyle = '#2a2420'; g.fillRect(4, 7, 56, 2);
      g.fillStyle = '#9a9a90'; g.fillRect(4, 26, 5, 4); g.fillRect(55, 26, 5, 4);
      g.fillStyle = '#5e6a5a'; g.fillRect(2, 0, 3, 6); // tap
    }, 0.1, 17);
    S.toilet = canvasTex(32, 40, (g) => {
      g.fillStyle = '#dcdcd4'; g.fillRect(6, 0, 20, 16); g.fillRect(4, 18, 24, 8); g.fillRect(10, 26, 12, 14);
      g.fillStyle = '#b8b8b0'; g.fillRect(4, 16, 24, 3);
    }, 0.08, 18);
    S.sink = (item) => canvasTex(36, 50, (g) => {
      g.fillStyle = '#e0e0d8'; g.fillRect(0, 10, 36, 8); g.fillStyle = '#9ab'; g.fillRect(16, 4, 4, 7);
      g.fillStyle = '#6b6b60'; g.fillRect(4, 18, 28, 32); g.fillStyle = '#7d7d72'; g.fillRect(6, 20, 11, 28); g.fillRect(19, 20, 11, 28);
      if (item) { g.fillStyle = '#d8d8d8'; g.fillRect(24, 3, 11, 7); g.fillStyle = '#c03030'; g.fillRect(28, 4, 3, 5); g.fillRect(27, 5, 5, 3); }
    }, 0.1, 19);
    S.fridge = canvasTex(34, 64, (g) => {
      g.fillStyle = '#c8c4b4'; g.fillRect(0, 0, 34, 64); g.fillStyle = '#9a968a'; g.fillRect(0, 22, 34, 2);
      g.fillStyle = '#6a665a'; g.fillRect(28, 8, 2, 10); g.fillRect(28, 28, 2, 16);
      g.fillStyle = '#e0d070'; g.fillRect(6, 30, 6, 6); g.fillStyle = '#c05050'; g.fillRect(14, 34, 5, 5); // notes
    }, 0.08, 20);
    S.counter = (item) => canvasTex(40, 42, (g) => {
      g.fillStyle = '#d8d0b8'; g.fillRect(0, 8, 40, 5); g.fillStyle = '#6a4a2c'; g.fillRect(0, 13, 40, 29);
      g.fillStyle = '#7d5a38'; g.fillRect(3, 16, 16, 24); g.fillRect(21, 16, 16, 24); g.fillStyle = '#c7a24a'; g.fillRect(16, 26, 2, 3); g.fillRect(22, 26, 2, 3);
      if (item) itemOn(g, 'matches', 14, 5);
    }, 0.1, 21);
    S.stove = canvasTex(36, 42, (g) => {
      g.fillStyle = '#d8d4c8'; g.fillRect(0, 8, 36, 34); g.fillStyle = '#222'; g.fillRect(4, 8, 10, 2); g.fillRect(20, 8, 10, 2);
      g.fillStyle = '#1a1a1a'; g.fillRect(5, 18, 26, 18); g.fillStyle = '#555'; g.fillRect(6, 12, 3, 3); g.fillRect(14, 12, 3, 3); g.fillRect(22, 12, 3, 3);
    }, 0.08, 22);
    S.table = (item) => canvasTex(56, 36, (g) => {
      g.fillStyle = '#e4dcc8'; g.fillRect(2, 8, 52, 4); g.fillStyle = '#c8bca0'; g.fillRect(2, 12, 52, 3);
      g.fillStyle = woodD; g.fillRect(6, 15, 4, 21); g.fillRect(46, 15, 4, 21);
      if (item) itemOn(g, 'salt', 24, 6);
    }, 0.1, 23);
    S.chair = canvasTex(24, 44, (g) => {
      g.fillStyle = wood; g.fillRect(4, 0, 3, 44); g.fillRect(17, 0, 3, 44); g.fillRect(4, 4, 16, 3); g.fillRect(4, 12, 16, 3);
      g.fillStyle = woodL; g.fillRect(2, 24, 20, 4);
    }, 0.12, 24);
    S.sofa = canvasTex(64, 36, (g) => {
      g.fillStyle = '#3d4a2e'; g.fillRect(4, 2, 56, 18); g.fillRect(0, 10, 8, 22); g.fillRect(56, 10, 8, 22);
      g.fillStyle = '#4c5c3a'; g.fillRect(8, 18, 24, 10); g.fillRect(32, 18, 24, 10);
      g.fillStyle = '#26301c'; g.fillRect(31, 18, 2, 10); g.fillStyle = '#1a1208'; g.fillRect(4, 32, 4, 4); g.fillRect(56, 32, 4, 4);
    }, 0.14, 25);
    S.coffeetable = (item) => canvasTex(48, 22, (g) => {
      g.fillStyle = woodL; g.fillRect(0, 6, 48, 4); g.fillStyle = woodD; g.fillRect(3, 10, 4, 12); g.fillRect(41, 10, 4, 12);
      g.fillStyle = '#7a1c1c'; g.fillRect(6, 3, 10, 3); // book
      if (item) itemOn(g, 'lighter', 30, 2);
    }, 0.12, 26);
    S.tv = canvasTex(44, 50, (g) => {
      g.fillStyle = woodD; g.fillRect(0, 30, 44, 20); g.fillStyle = '#222'; g.fillRect(4, 4, 36, 26);
      g.fillStyle = '#0d1410'; g.fillRect(7, 7, 30, 20); g.fillStyle = '#1c2a22'; g.fillRect(9, 9, 6, 2);
      g.fillStyle = '#555'; g.fillRect(18, 0, 1, 4); g.fillRect(25, 0, 1, 4);
    }, 0.1, 27);
    S.sideboard = (item) => canvasTex(52, 40, (g) => {
      g.fillStyle = wood; g.fillRect(0, 12, 52, 28); g.fillStyle = woodL; g.fillRect(0, 12, 52, 2);
      g.fillStyle = woodD; g.fillRect(3, 17, 22, 20); g.fillRect(27, 17, 22, 20);
      g.fillStyle = '#6a6a7a'; g.fillRect(38, 2, 8, 10); // photo frame
      if (item) itemOn(g, 'candle', 10, 10);
    }, 0.12, 28);
    S.lamp = canvasTex(24, 64, (g) => {
      g.fillStyle = '#8a7a50'; g.fillRect(4, 2, 16, 12); g.fillStyle = '#a89868'; g.fillRect(6, 2, 12, 3);
      g.fillStyle = '#333'; g.fillRect(11, 14, 2, 46); g.fillRect(6, 60, 12, 4);
    }, 0.1, 29);
    S.plant = canvasTex(32, 44, (g) => {
      g.fillStyle = '#6a3a22'; g.fillRect(8, 30, 16, 14);
      g.fillStyle = '#2e2a1a';
      for (let i = 0; i < 9; i++) { g.save(); g.translate(16, 30); g.rotate(-1.2 + i * 0.3); g.fillRect(-1, -24, 3, 24); g.restore(); }
    }, 0.2, 30);
    S.clock = canvasTex(24, 64, (g) => {
      g.fillStyle = woodD; g.fillRect(2, 0, 20, 64); g.fillStyle = wood; g.fillRect(4, 22, 16, 34);
      g.fillStyle = '#d8ceb0'; g.beginPath(); g.arc(12, 11, 8, 0, 7); g.fill();
      g.fillStyle = '#111'; g.fillRect(11, 4, 2, 8); g.fillRect(12, 10, 5, 2); // hands near 12
      g.fillStyle = '#c7a24a'; g.fillRect(11, 30, 2, 16); g.beginPath(); g.arc(12, 47, 3, 0, 7); g.fill();
    }, 0.12, 31);
    S.cabinet = (item) => canvasTex(36, 36, (g) => {
      g.fillStyle = wood; g.fillRect(0, 8, 36, 28); g.fillStyle = woodL; g.fillRect(0, 8, 36, 2);
      g.fillStyle = woodD; g.fillRect(3, 13, 30, 9); g.fillRect(3, 24, 30, 10);
      if (item) itemOn(g, 'flashlight', 12, 4);
    }, 0.12, 32);
    S.coatrack = canvasTex(24, 64, (g) => {
      g.fillStyle = woodD; g.fillRect(11, 4, 2, 58); g.fillRect(5, 60, 14, 4);
      g.fillStyle = '#1e1e24'; g.fillRect(3, 6, 9, 30); g.fillStyle = '#3a2a1e'; g.fillRect(13, 8, 8, 22);
    }, 0.12, 33);

    // The paper/candle placed at the front door.
    S.doorOffering = (state, flame) => canvasTex(32, 20, (g) => {
      g.fillStyle = '#e8e2cf'; g.fillRect(6, 16, 20, 4);
      g.fillStyle = '#7a1010'; g.fillRect(17, 17, 2, 2);
      if (state >= 1) {
        g.fillStyle = '#b08a3a'; g.fillRect(11, 14, 10, 3);
        g.fillStyle = '#efe6cc'; g.fillRect(14, 4, 4, 10);
        g.fillStyle = '#222'; g.fillRect(16, 2, 1, 2);
        if (state === 2) {
          g.fillStyle = '#ffb040'; g.fillRect(15, flame ? 0 : 1, 3, 3);
          g.fillStyle = '#fff4c0'; g.fillRect(16, 1, 1, 2);
        }
      }
    }, 0.05, 34);
  }

  function midnightMan(frame) {
    // Pure black humanoid. Ragged edges come from noise in the outline.
    return canvasTex(32, 64, (g) => {
      g.fillStyle = '#060507';
      const sway = frame === 1 ? 1 : 0;
      g.beginPath(); g.ellipse(16 + sway, 7, 4.5, 6, 0, 0, 7); g.fill();       // head
      g.fillRect(14 + sway, 11, 4, 4);                                          // neck
      g.beginPath();                                                            // torso, long and thin
      g.moveTo(7 + sway, 15); g.lineTo(25 + sway, 15); g.lineTo(22, 38); g.lineTo(10, 38); g.closePath(); g.fill();
      g.fillRect(10, 37, 5, 27); g.fillRect(17, 37, 5, 27);                     // legs
      if (frame === 2) { // reaching
        g.save(); g.translate(8, 17); g.rotate(-0.5); g.fillRect(-3, -16, 3, 20); g.restore();
        g.save(); g.translate(24, 17); g.rotate(0.5); g.fillRect(0, -16, 3, 20); g.restore();
        g.fillRect(2, 0, 4, 4); g.fillRect(26, 0, 4, 4);
      } else {
        g.fillRect(5 + sway, 16, 3, 30); g.fillRect(24 + sway, 16, 3, 30);   // arms, too long
        g.fillRect(4 + sway, 45, 2, 5); g.fillRect(26 + sway, 45, 2, 5);     // fingers
      }
      // ragged smoke edges
      const id = g.getImageData(0, 0, 32, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4;
        if (id.data[i + 3] > 0 && hash(x, y, 77 + frame) > 0.86) id.data[i + 3] = 0;
        if (id.data[i + 3] === 0 && hash(x, y, 91 + frame) > 0.93 && y > 4) {
          const j = ((y - 1) * 32 + x) * 4; if (j >= 0 && id.data[j + 3] > 0) { id.data[i] = 6; id.data[i + 3] = 255; }
        }
      }
      g.putImageData(id, 0, 0);
    }, 0, 40 + frame);
  }

  // ---------- First-person view models (drawn onto the low-res canvas) ----------
  function handCandle(dark) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 72;
    const g = c.getContext('2d');
    const k = dark ? 0.22 : 1;
    const col = (r, gg, b) => `rgb(${r * k | 0},${gg * k | 0},${b * k | 0})`;
    g.fillStyle = col(239, 230, 204); g.fillRect(26, 14, 10, 30);  // candle
    g.fillStyle = col(214, 204, 176); g.fillRect(33, 14, 3, 30);
    g.fillStyle = col(250, 244, 226); g.fillRect(26, 14, 10, 3);
    g.fillStyle = col(30, 26, 22); g.fillRect(30, 10, 2, 5);        // wick
    g.fillStyle = col(176, 138, 58); g.fillRect(14, 42, 34, 6);    // brass holder
    g.fillStyle = col(130, 98, 40); g.fillRect(14, 46, 34, 2);
    g.fillStyle = col(150, 96, 70); g.fillRect(18, 48, 26, 24);    // hand
    g.fillStyle = col(176, 118, 88); g.fillRect(20, 48, 6, 10); g.fillRect(28, 48, 6, 12); g.fillRect(36, 48, 6, 10);
    g.fillStyle = col(120, 76, 56); g.fillRect(18, 60, 26, 2);
    g.fillStyle = col(40, 36, 50); g.fillRect(14, 64, 34, 8);      // sleeve
    return c;
  }
  function handMatch() {
    const c = document.createElement('canvas'); c.width = 48; c.height = 56;
    const g = c.getContext('2d');
    g.save(); g.translate(26, 30); g.rotate(-0.6);
    g.fillStyle = '#d8c48a'; g.fillRect(-1, -22, 3, 22); g.fillStyle = '#8a1e14'; g.fillRect(-2, -26, 5, 5);
    g.restore();
    g.fillStyle = '#9a6046'; g.fillRect(14, 30, 20, 26); g.fillStyle = '#b07658'; g.fillRect(16, 30, 6, 8); g.fillRect(24, 28, 6, 8);
    g.fillStyle = '#28242f'; g.fillRect(10, 48, 28, 8);
    return c;
  }

  RT.TexUtil = { makeTex, canvasTex, shade, wallpaper, plaster, tiles, panels, planks, carpet, checker, ceiling, stains };
  RT.Tex = {};
  RT.buildTextures = function () {
    const T = RT.Tex;
    T.walls = {
      c: plaster([150, 136, 112], 1),
      s: wallpaper([38, 66, 48], [58, 92, 66], 2, 'stripe'),
      r: wallpaper([128, 92, 96], [150, 70, 80], 3, 'floral'),
      b: tiles([176, 204, 198], [80, 92, 92], 8, 4),
      k: tiles([206, 196, 164], [110, 100, 84], 16, 5),
      h: panels(6),
      l: wallpaper([132, 108, 58], [96, 76, 36], 7, 'damask'),
    };
    T.floors = {
      c: planks(8), s: planks(9, [80, 54, 34]), h: planks(10, [86, 56, 34]),
      r: carpet([52, 60, 88], [70, 80, 110], 11, false),
      l: carpet([96, 30, 30], [140, 110, 60], 12, true),
      k: checker([200, 196, 186], [36, 34, 32], 16, 13),
      b: checker([210, 210, 204], [30, 40, 44], 8, 14),
    };
    T.ceiling = ceiling(15);
    T.decals = {
      switchOn: switchDecal(true), switchOff: switchDecal(false),
      window: windowDecal(false), windowFrost: windowDecal(true),
      door: frontDoor(false), doorOpen: frontDoor(true),
      portrait: painting(0), landscape: painting(1), mirror: painting(2),
    };
    furniture();
    T.sprites = S;
    T.mm = [midnightMan(0), midnightMan(1), midnightMan(2)];
    T.hand = { lit: handCandle(false), dark: handCandle(true), match: handMatch() };
    // cache item-variant furniture
    T.v = {};
    for (const name of ['desk', 'nightstand', 'sink', 'counter', 'table', 'coffeetable', 'sideboard', 'cabinet']) {
      T.v[name] = S[name](false); T.v[name + '_item'] = S[name](true);
    }
    T.offering = [S.doorOffering(0), S.doorOffering(1), S.doorOffering(2, 0), S.doorOffering(2, 1)];
    if (RT.buildTextures2) RT.buildTextures2(T);
  };
})(window.RT);

// Second batch of procedural art: the reworked Midnight Man, jumpscare faces,
// and everything for Level 2 (elevator, corridors, the Other World).
(function (RT) {
  const { hash, rgba, clamp } = RT;

  function cnv(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h); return c;
  }
  function limb(g, x1, y1, x2, y2, w) {
    g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  function ragged(g, w, h, seed, amount = 0.14) {
    const id = g.getImageData(0, 0, w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 0 && hash(x, y, seed) < amount) {
        // only nibble pixels that touch transparency, so the outline frays
        const n = ((y * w + x - 1) * 4), e = ((y * w + x + 1) * 4);
        if ((x > 0 && d[n + 3] === 0) || (x < w - 1 && d[e + 3] === 0)) d[i + 3] = 0;
      }
    }
    g.putImageData(id, 0, 0);
  }

  // ---------------- The Midnight Man, reworked ----------------
  // Emaciated, too tall, joints wrong. Pure black except for faint pinprick
  // eyes and, when he is close, a grin that is far too wide.
  function midnightMan(frame) {
    return RT.TexUtil.canvasTex(48, 96, (g) => {
      g.fillStyle = g.strokeStyle = '#050405';
      const tilt = frame === 1 ? 0.55 : frame === 2 ? -0.15 : -0.45;
      const hx = 24 + Math.sin(tilt) * 9, hy = 12;
      // spine: hunched, shoulders up around the head
      g.beginPath(); g.moveTo(14, 22); g.quadraticCurveTo(24, 12, 34, 22); g.lineTo(30, 58); g.lineTo(19, 58); g.closePath(); g.fill();
      limb(g, 24, 22, hx, hy + 4, 3);                                        // long bent neck
      g.save(); g.translate(hx, hy); g.rotate(tilt); g.beginPath(); g.ellipse(0, 0, 5, 8, 0, 0, 7); g.fill(); g.restore();
      // ribs showing through as gaps
      g.fillStyle = '#000'; 
      // legs: thin, knees bending the wrong way
      g.strokeStyle = '#050405';
      limb(g, 21, 57, 15, 76, 3); limb(g, 15, 76, 19, 95, 3);
      limb(g, 28, 57, 34, 76, 3); limb(g, 34, 76, 30, 95, 3);
      if (frame === 2) {
        // reaching: arms out at you, fingers spread
        limb(g, 15, 24, 3, 36, 3); limb(g, 3, 36, 2, 14, 2.5);
        limb(g, 33, 24, 45, 36, 3); limb(g, 45, 36, 46, 14, 2.5);
        for (let i = -2; i <= 2; i++) { limb(g, 2, 14, 2 + i * 2, 4, 1); limb(g, 46, 14, 46 + i * 2, 4, 1); }
      } else {
        const sw = frame === 1 ? 2 : 0;
        limb(g, 15, 24, 9 + sw, 50, 3); limb(g, 9 + sw, 50, 8 + sw, 78, 2.5);    // arms past the knees
        limb(g, 33, 24, 39 - sw, 50, 3); limb(g, 39 - sw, 50, 41 - sw, 78, 2.5);
        for (let i = 0; i < 4; i++) { limb(g, 8 + sw, 78, 5 + i * 2 + sw, 88, 1); limb(g, 41 - sw, 78, 38 + i * 2 - sw, 88, 1); }
      }
      // eyes: two pale pinpricks; a grin when close
      g.save(); g.translate(hx, hy); g.rotate(tilt);
      g.fillStyle = '#d8d8d0'; g.fillRect(-3, -2, 1, 1); g.fillRect(2, -2, 1, 1);
      if (frame === 2) {
        g.fillStyle = '#050405'; g.fillRect(-6, 2, 12, 5);
        g.fillStyle = '#c8c4b8';
        for (let i = -5; i <= 4; i += 2) { g.fillRect(i, 2, 1, 2); g.fillRect(i + 1, 5, 1, 2); }
      }
      g.restore();
      ragged(g, 48, 96, 50 + frame);
    }, 0, 60 + frame);
  }

  // ---------------- Jumpscare faces (full-screen overlays) ----------------
  function mmFace() {
    return cnv(96, 96, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 96, 96);
      // head: lumpy, too big, leaning
      g.fillStyle = '#070607';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(48 + Math.sin(i * 2.1) * 8, 44 + Math.cos(i * 1.7) * 9, 30 + (i % 3) * 4, 40 + (i % 2) * 6, 0.15, 0, 7); g.fill(); }
      // veins / cracks
      g.strokeStyle = '#1d191d'; g.lineWidth = 1;
      for (let k = 0; k < 14; k++) {
        let x = 20 + hash(k, 1, 7) * 56, y = 6 + hash(k, 2, 7) * 70; g.beginPath(); g.moveTo(x, y);
        for (let st = 0; st < 8; st++) { x += (hash(k, st, 8) - 0.5) * 8; y += (hash(k, st, 9) - 0.3) * 6; g.lineTo(x, y); }
        g.stroke();
      }
      // sunken sockets, one lower and larger than the other
      const eye = (x, y, rx, ry) => {
        g.fillStyle = '#141114'; g.beginPath(); g.ellipse(x, y, rx + 3, ry + 3, 0, 0, 7); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
        g.fillStyle = '#f4f0e0'; g.fillRect(x - 1, y, 2, 2);
        g.fillStyle = 'rgba(255,255,240,0.25)'; g.fillRect(x - 2, y - 1, 4, 4);
      };
      eye(33, 30, 7, 8); eye(63, 34, 9, 11);
      // the mouth: a ragged gash nearly the width of the face
      g.fillStyle = '#1c0303';
      g.beginPath(); g.moveTo(10, 58);
      for (let x = 10; x <= 86; x += 4) g.lineTo(x, 56 + Math.sin(x * 0.4) * 2 - (x > 30 && x < 70 ? 2 : 0));
      for (let x = 86; x >= 10; x -= 4) g.lineTo(x, 70 + Math.sin((x - 10) / 76 * Math.PI) * 16 + Math.cos(x) * 2);
      g.closePath(); g.fill();
      // needle teeth of different lengths, some missing
      g.fillStyle = '#d6cfb4';
      for (let x = 13; x < 84; x += 3) {
        if (hash(x, 3, 11) < 0.15) continue;
        const top = 57 + Math.sin(x * 0.4) * 2, len = 4 + hash(x, 4, 11) * 9;
        g.beginPath(); g.moveTo(x, top); g.lineTo(x + 2, top); g.lineTo(x + 1, top + len); g.fill();
        const bot = 70 + Math.sin((x - 10) / 76 * Math.PI) * 16, l2 = 3 + hash(x, 5, 11) * 8;
        g.beginPath(); g.moveTo(x, bot); g.lineTo(x + 2, bot); g.lineTo(x + 1, bot - l2); g.fill();
      }
      g.fillStyle = '#3a0505'; for (let k = 0; k < 4; k++) g.fillRect(30 + k * 11, 74 + k % 2 * 6, 1, 10 + k * 3);
      // film burn
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${40 + Math.random() * 30},10,10,${Math.random() * 0.35})`; g.fillRect(Math.random() * 96, Math.random() * 96, 1, 1); }
    });
  }
  function womanFace() {
    return cnv(96, 96, (g) => {
      g.fillStyle = '#050505'; g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#cfcac0'; g.beginPath(); g.ellipse(48, 50, 26, 36, 0, 0, 7); g.fill();
      g.fillStyle = '#b8b2a6'; g.fillRect(30, 60, 36, 20);
      // hollow eyes, streaking black
      for (const ex of [37, 59]) {
        g.fillStyle = '#000'; g.beginPath(); g.ellipse(ex, 42, 7, 9, 0, 0, 7); g.fill();
        g.fillRect(ex - 1, 48, 2, 22 + (ex % 3) * 4);
      }
      // mouth stretched open too far
      g.fillStyle = '#0a0000'; g.beginPath(); g.ellipse(48, 72, 9, 16, 0, 0, 7); g.fill();
      // hair hanging over everything
      g.fillStyle = '#020202';
      g.fillRect(0, 0, 96, 16); g.fillRect(0, 0, 24, 96); g.fillRect(72, 0, 24, 96);
      for (let i = 0; i < 14; i++) { const x = 20 + i * 4 + (i % 3); g.fillRect(x, 10, 1 + (i % 2), 20 + (i * 37 % 40)); }
    });
  }
  function otherFace() {
    return cnv(96, 96, (g) => {
      g.fillStyle = '#100404'; g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#d9d4cc'; g.beginPath(); g.ellipse(48, 48, 30, 42, 0, 0, 7); g.fill();
      // no eyes, just smooth dents
      g.fillStyle = '#c4beb4'; g.beginPath(); g.ellipse(36, 38, 7, 4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(60, 38, 7, 4, 0, 0, 7); g.fill();
      // the face splits vertically into a mouth
      g.fillStyle = '#2a0000'; g.beginPath(); g.ellipse(48, 62, 7, 26, 0, 0, 7); g.fill();
      g.fillStyle = '#efe8d8'; for (let y = 40; y < 86; y += 4) { g.fillRect(42, y, 4, 2); g.fillRect(50, y + 2, 4, 2); }
    });
  }

  // ---------------- People ----------------
  function person({ coat, skin, hair, pants, wrong, child }) {
    return RT.TexUtil.canvasTex(32, 64, (g) => {
      const top = child ? 22 : 0, k = child ? 0.65 : 1;
      g.save(); g.translate(16, top); g.scale(k, k); g.translate(-16, 0);
      g.fillStyle = skin; g.beginPath(); g.ellipse(16, 8, 5, 6.5, 0, 0, 7); g.fill();
      g.fillStyle = hair; g.fillRect(11, 1, 10, 4); g.fillRect(11, 3, 2, 6);
      if (wrong) { g.fillStyle = '#000'; g.fillRect(13, 7, 2, 2); g.fillRect(17, 7, 2, 2); g.fillRect(14, 11, 4, 1); }
      else { g.fillStyle = '#2a1a14'; g.fillRect(13, 7, 1, 1); g.fillRect(18, 7, 1, 1); }
      g.fillStyle = coat; g.fillRect(9, 15, 14, 24); g.fillRect(6, 16, 3, 20); g.fillRect(23, 16, 3, 20);
      g.fillStyle = skin; g.fillRect(6, 36, 3, 3); g.fillRect(23, 36, 3, 3);
      g.fillStyle = pants; g.fillRect(10, 39, 5, 22); g.fillRect(17, 39, 5, 22);
      g.fillStyle = '#151515'; g.fillRect(9, 61, 6, 3); g.fillRect(17, 61, 6, 3);
      g.restore();
    }, 0.1, 70);
  }
  function woman(frame) {
    // frame 0: head bowed, hair over the face. 1: head raised. 2: facing away.
    return RT.TexUtil.canvasTex(32, 64, (g) => {
      g.fillStyle = '#d6d0c4'; g.beginPath(); g.moveTo(10, 16); g.lineTo(22, 16); g.lineTo(26, 62); g.lineTo(6, 62); g.closePath(); g.fill(); // dress
      g.fillStyle = '#b5ae9f'; g.fillRect(9, 40, 14, 2); g.fillRect(8, 52, 16, 1);
      g.fillStyle = '#7a6a5a'; g.fillRect(12, 46, 3, 4); // stain
      g.fillStyle = '#cbc5b8'; g.fillRect(7, 18, 3, 22); g.fillRect(22, 18, 3, 22); // arms hanging
      g.fillStyle = '#e2ddd2'; g.fillRect(7, 39, 3, 4); g.fillRect(22, 39, 3, 4);
      g.fillStyle = '#d8d3c8'; g.fillRect(12, 61, 3, 3); g.fillRect(18, 61, 3, 3); // bare feet
      const hy = frame === 0 ? 9 : 7;
      g.fillStyle = '#e0dbd0'; g.beginPath(); g.ellipse(16, hy, 5, 6.5, 0, 0, 7); g.fill();
      g.fillStyle = '#060606';
      if (frame === 2) { g.beginPath(); g.ellipse(16, hy, 6, 7, 0, 0, 7); g.fill(); g.fillRect(10, hy, 12, 26); }
      else if (frame === 0) { g.fillRect(10, hy - 7, 12, 8); g.fillRect(10, hy, 3, 22); g.fillRect(19, hy, 3, 22); g.fillRect(13, hy, 6, 14); for (let x = 13; x < 19; x += 2) g.fillRect(x, hy + 14, 1, 6 + (x % 3) * 2); }
      else { g.fillRect(10, hy - 7, 12, 4); g.fillRect(10, hy - 4, 3, 26); g.fillRect(19, hy - 4, 3, 26); g.fillStyle = '#000'; g.fillRect(13, hy - 1, 2, 3); g.fillRect(17, hy - 1, 2, 3); g.fillRect(14, hy + 3, 4, 2); }
    }, 0.06, 80 + frame);
  }
  function other(frame) {
    return RT.TexUtil.canvasTex(32, 64, (g) => {
      g.fillStyle = g.strokeStyle = '#bdb6ac';
      g.beginPath(); g.ellipse(16, 8, 5, 7.5, 0, 0, 7); g.fill();
      g.fillRect(11, 16, 10, 24);
      const a = frame ? 3 : 0;
      limb(g, 11, 17, 6 - a, 44, 2.5); limb(g, 21, 17, 26 + a, 44, 2.5);
      limb(g, 13, 39, 12, 63, 3); limb(g, 19, 39, 20, 63, 3);
      g.fillStyle = '#a49c92'; g.fillRect(15, 6, 2, 7); // the seam where a mouth should be
      if (frame) { g.fillStyle = '#300'; g.fillRect(15, 7, 2, 6); }
    }, 0.12, 90 + frame);
  }

  // ---------------- Elevator & building surfaces ----------------
  function build(T) {
    const U = RT.TexUtil;
    const steel = (x, y, s) => { const v = 132 + (hash(x, 0, s) - 0.5) * 30 + (hash(x, y, s + 1) - 0.5) * 10; return [v, v + 2, v + 6]; };
    T.walls.e = U.makeTex(64, 64, (x, y) => {
      if (y >= 56) return [70, 72, 76];
      if (y >= 36 && y <= 38) return y === 36 ? [210, 210, 214] : [90, 92, 96];          // handrail
      if (x % 32 === 0) return [80, 82, 86];
      return steel(x, y, 1);
    });
    T.floors.e = U.makeTex(64, 64, (x, y) => {
      const sx = x % 8 - 4, sy = y % 8 - 4; const stud = sx * sx + sy * sy < 4;
      const v = (stud ? 58 : 44) + hash(x, y, 2) * 8; return [v, v, v + 2];
    });
    T.ceilings = T.ceilings || {};
    T.ceilings.e = U.makeTex(64, 64, (x, y) => {
      const diff = x > 6 && x < 58 && y > 6 && y < 58 && (x % 16 > 2) && (y % 16 > 2);
      return diff ? [255, 250, 230] : [60, 60, 62];
    });
    T.liftDoor = U.makeTex(64, 64, (x, y) => {
      if (x === 31 || x === 32) return [40, 40, 44];
      if (y < 3 || y > 60) return [70, 70, 74];
      const refl = Math.abs(x - 32) > 20 && Math.abs(x - 32) < 24 ? 25 : 0;
      const [r, g, b] = steel(x, y, 9); return [r + refl, g + refl, b + refl];
    });
    // corridor styles: p normal, p6 sickly, q other-world, y lobby, o office
    T.walls.p = U.wallpaper([150, 132, 100], [128, 110, 80], 21, 'stripe');
    T.walls.p6 = U.wallpaper([96, 112, 80], [70, 86, 58], 22, 'damask');
    T.walls.q = U.makeTex(64, 64, (x, y) => {
      const base = U.stains(x, y, 23) < 1 ? [40, 6, 6] : [86, 22, 20];
      const drip = hash(x, 0, 24) > 0.9 && y < 20 + hash(x, 1, 24) * 40 ? 0.5 : 1;
      return U.shade(base, (0.8 + hash(x, y, 25) * 0.3) * drip);
    });
    T.walls.y = U.panels(26);
    T.walls.o = U.makeTex(64, 64, (x, y) => {
      if (y > 58) return [40, 40, 44];
      const v = 70 + hash(x >> 1, y >> 1, 27) * 18; return U.shade([v, v, v + 6], U.stains(x, y, 28));
    });
    T.floors.p = U.carpet([86, 30, 34], [120, 96, 50], 31, true);
    T.floors.p6 = U.carpet([50, 60, 40], [90, 80, 40], 32, true);
    T.floors.q = U.makeTex(64, 64, (x, y) => U.shade([60, 14, 14], (0.7 + hash(x, y, 33) * 0.4) * U.stains(x, y, 34)));
    T.floors.y = U.checker([170, 164, 150], [60, 56, 52], 32, 35);
    T.floors.o = U.makeTex(64, 64, (x, y) => { const t = (x % 32 === 0 || y % 32 === 0) ? 0.7 : 1; return U.shade([62, 62, 68], t * (0.8 + hash(x, y, 36) * 0.3)); });
    const tilesCeil = (s, missing) => U.makeTex(64, 64, (x, y) => {
      if (x % 32 === 0 || y % 32 === 0) return [70, 70, 70];
      if (missing && hash(x >> 5, y >> 5, s) > 0.6) return [8, 8, 8];
      return U.shade([150, 146, 138], 0.85 + hash(x, y, s) * 0.2);
    });
    T.ceilings.p = tilesCeil(40); T.ceilings.p6 = tilesCeil(41); T.ceilings.q = tilesCeil(42, true); T.ceilings.o = tilesCeil(43, true);

    // decals
    const D = T.decals;
    D.panel = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#9a9ca2'; g.fillRect(18, 8, 28, 50); g.fillStyle = '#6a6c72'; g.fillRect(18, 8, 28, 1); g.fillRect(45, 8, 1, 50);
      g.fillStyle = '#100'; g.fillRect(22, 11, 20, 6); g.fillStyle = '#f33'; g.fillRect(30, 12, 4, 4);
      for (let i = 0; i < 10; i++) { const cx = 25 + (i % 2) * 12, cy = 22 + Math.floor(i / 2) * 6; g.fillStyle = '#d8d8d0'; g.fillRect(cx, cy, 4, 4); g.fillStyle = '#444'; g.fillRect(cx + 1, cy + 1, 2, 2); }
      g.fillStyle = '#d0c070'; g.fillRect(25, 52, 4, 4); g.fillRect(37, 52, 4, 4);
    });
    D.callBtn = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#8a8c90'; g.fillRect(26, 26, 12, 18); g.fillStyle = '#e8e2c0'; g.beginPath(); g.arc(32, 35, 3.5, 0, 7); g.fill();
      g.fillStyle = '#444'; g.fillRect(31, 33, 2, 4); g.fillRect(30, 34, 4, 1);
    });
    D.mirror = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#6a6c70'; g.fillRect(6, 4, 52, 50);
      const gr = g.createLinearGradient(8, 6, 56, 52); gr.addColorStop(0, '#2a3036'); gr.addColorStop(1, '#14181c'); g.fillStyle = gr; g.fillRect(8, 6, 48, 46);
      g.fillStyle = 'rgba(200,210,220,0.25)'; g.fillRect(14, 8, 2, 40); g.fillRect(18, 8, 1, 30);
    });
    D.aptDoor = (n) => U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#3a2416'; g.fillRect(14, 4, 36, 60); g.fillStyle = '#5a3a22'; g.fillRect(17, 7, 30, 57);
      g.fillStyle = '#4a2e1a'; g.fillRect(21, 12, 22, 20); g.fillRect(21, 38, 22, 20);
      g.fillStyle = '#c7a24a'; g.fillRect(42, 36, 3, 3); g.fillRect(28, 6, 8, 4);
      g.fillStyle = '#222'; g.font = '5px monospace'; g.fillText(String(n), 28, 10);
    });
    D.floorSign = (n) => U.canvasTex(64, 64, (g) => {
      g.fillStyle = n === '?' ? '#300' : '#1a1a1a'; g.fillRect(16, 14, 32, 30);
      g.fillStyle = n === '?' ? '#f22' : '#e8e0c8'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.fillText(String(n), 32, 38);
      g.font = '6px monospace'; g.fillText('FLOOR', 32, 20);
    });
    D.cityWindow = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#2a2a2e'; g.fillRect(8, 6, 48, 46); g.fillStyle = '#0a0e18'; g.fillRect(11, 9, 42, 40);
      for (let i = 0; i < 40; i++) { g.fillStyle = Math.random() < 0.5 ? '#c8b060' : '#3a3a30'; g.fillRect(12 + (i * 7 % 40), 28 + (i * 13 % 20), 1, 1); }
      g.fillStyle = '#05070c'; g.fillRect(12, 36, 8, 13); g.fillRect(24, 30, 6, 19); g.fillRect(40, 33, 10, 16);
      g.fillStyle = '#2a2a2e'; g.fillRect(31, 9, 2, 40);
    });
    D.redCross = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#1a0808'; g.fillRect(8, 6, 48, 46); g.fillStyle = '#2a0404'; g.fillRect(11, 9, 42, 40);
      g.fillStyle = '#140000'; g.fillRect(11, 38, 42, 11);
      g.fillStyle = '#ff2a1a'; g.fillRect(30, 16, 4, 16); g.fillRect(26, 20, 12, 4);
      g.fillStyle = 'rgba(255,60,40,0.4)'; g.fillRect(27, 14, 10, 20); g.fillRect(24, 19, 16, 6);
    });
    D.lobbyDoors = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#2a2a2a'; g.fillRect(4, 2, 56, 62); g.fillStyle = '#0c1018'; g.fillRect(7, 5, 24, 59); g.fillRect(33, 5, 24, 59);
      g.fillStyle = '#c8a050'; g.fillRect(44, 22, 2, 1); g.fillStyle = 'rgba(160,170,190,0.25)'; g.fillRect(10, 8, 2, 50); g.fillRect(36, 8, 2, 50);
      g.fillStyle = '#d0c070'; g.fillRect(28, 32, 2, 8); g.fillRect(34, 32, 2, 8);
    });
    D.mailboxes = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#7a6a40'; g.fillRect(8, 14, 48, 30);
      for (let i = 0; i < 12; i++) { g.fillStyle = '#5a4a28'; g.fillRect(10 + (i % 6) * 8, 16 + Math.floor(i / 6) * 14, 6, 11); g.fillStyle = '#222'; g.fillRect(12 + (i % 6) * 8, 18 + Math.floor(i / 6) * 14, 2, 1); }
    });
    D.notice = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#e8e0c8'; g.fillRect(20, 16, 24, 30); g.fillStyle = '#222';
      for (let i = 0; i < 7; i++) g.fillRect(23, 20 + i * 3, 10 + (i * 5 % 9), 1);
      g.fillStyle = '#a00'; g.fillRect(23, 40, 18, 2);
    });
    D.handprints = U.canvasTex(64, 64, (g) => {
      g.fillStyle = 'rgba(40,0,0,0.9)';
      for (let i = 0; i < 6; i++) { const x = 8 + (i * 19 % 44), y = 10 + (i * 23 % 36); g.fillRect(x, y, 5, 6); for (let f = 0; f < 4; f++) g.fillRect(x + f * 1.3, y - 4, 1, 4); }
    });

    // sprites
    const S = T.sprites;
    S.frontDesk = U.canvasTex(64, 36, (g) => { g.fillStyle = '#4a3020'; g.fillRect(0, 6, 64, 30); g.fillStyle = '#6a4a30'; g.fillRect(0, 6, 64, 4); g.fillStyle = '#222'; g.fillRect(40, 0, 14, 7); g.fillStyle = '#2a4a3a'; g.fillRect(42, 1, 10, 5); });
    S.officeDesk = U.canvasTex(64, 40, (g) => { g.fillStyle = '#5a5a60'; g.fillRect(0, 0, 64, 24); g.fillStyle = '#3a3a40'; g.fillRect(0, 24, 64, 4); g.fillRect(4, 28, 4, 12); g.fillRect(56, 28, 4, 12); g.fillStyle = '#111'; g.fillRect(20, 10, 18, 14); });
    S.wetSign = U.canvasTex(24, 32, (g) => { g.fillStyle = '#d8b820'; g.beginPath(); g.moveTo(12, 0); g.lineTo(22, 32); g.lineTo(2, 32); g.closePath(); g.fill(); g.fillStyle = '#111'; g.fillRect(11, 10, 2, 10); });
    T.people = [
      person({ coat: '#3a4a6a', skin: '#c89a7a', hair: '#2a1a10', pants: '#2a2a30' }),
      person({ coat: '#6a3a2a', skin: '#e0b898', hair: '#9a9a9a', pants: '#3a3020' }),
      person({ coat: '#2a4a2a', skin: '#8a6248', hair: '#111', pants: '#202024' }),
      person({ coat: '#a08a5a', skin: '#e8c8a8', hair: '#5a3a1a', pants: '#3a2a4a', child: true }),
    ];
    T.peopleWrong = [
      person({ coat: '#2a2a30', skin: '#d8d4cc', hair: '#111', pants: '#1a1a1a', wrong: true }),
      person({ coat: '#4a2020', skin: '#d0ccc4', hair: '#222', pants: '#1a1a1a', wrong: true, child: true }),
    ];
    T.woman = [woman(0), woman(1), woman(2)];
    // the mirror at the back of the car, with her in it
    D.mirrorWoman = U.canvasTex(64, 64, (g) => {
      g.drawImage(D.mirror.canvas, 0, 0);
      g.globalAlpha = 0.55; g.drawImage(T.woman[1].canvas, 22, 10, 20, 40); g.globalAlpha = 1;
    });
    T.other = [other(0), other(1)];
  }

  RT.buildTextures2 = function (T) {
    T.mm = [midnightMan(0), midnightMan(1), midnightMan(2)];
    T.faces = { mm: mmFace(), woman: womanFace(), other: otherFace() };
    build(T);
  };
})(window.RT);

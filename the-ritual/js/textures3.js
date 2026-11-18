// Level 3 art: a different house, the street, the black cab, the hooded man,
// his passengers, and the cab interior.
(function (RT) {
  const { hash } = RT;
  function cnv(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h); return c; }

  RT.buildTextures3 = function (T) {
    const U = RT.TexUtil, D = T.decals, S = T.sprites;
    // ---- house surfaces (keys are 'L3' + map letter) ----
    T.walls.L3l = U.wallpaper([70, 58, 44], [92, 76, 52], 61, 'floral');
    T.walls.L3h = U.panels(62);
    T.walls.L3r = U.wallpaper([58, 66, 84], [74, 84, 104], 63, 'stripe');
    T.walls.L3k = U.tiles([196, 180, 120], [100, 90, 60], 16, 64);
    T.walls.L3b = U.tiles([200, 204, 200], [90, 96, 96], 8, 65);
    const siding = U.makeTex(64, 64, (x, y) => { const b = y % 8 === 0 ? 0.55 : 0.85 + (y % 8) * 0.03; return U.shade([86, 80, 74], b * (0.9 + hash(x, y, 66) * 0.15) * U.stains(x, y, 67)); });
    T.walls.L3z = siding;
    T.walls.L3g = U.makeTex(64, 64, (x, y) => { const post = x % 16 < 2; const v = post ? 50 : 70 + hash(x >> 2, y, 68) * 14; return U.shade([v, v * 0.8, v * 0.6], y < 20 ? 0.6 : 1); });   // garden fence
    T.floors.L3l = U.carpet([70, 48, 36], [96, 70, 50], 69, true);
    T.floors.L3h = U.planks(70, [80, 56, 36]);
    T.floors.L3r = U.carpet([50, 52, 64], [64, 66, 80], 71, false);
    T.floors.L3k = U.checker([160, 150, 120], [70, 60, 44], 16, 72);
    T.floors.L3b = U.checker([200, 200, 196], [60, 70, 74], 8, 73);
    T.floors.L3z = U.makeTex(64, 64, (x, y) => { const line = Math.abs(x - 32) < 2 && (y % 32) < 16; const v = 44 + hash(x, y, 74) * 16; return line ? [150, 140, 90] : U.shade([v, v, v + 4], U.stains(x, y, 75)); });
    T.floors.L3g = U.makeTex(64, 64, (x, y) => { const v = 0.6 + hash(x, y, 76) * 0.5; return [30 * v, 52 * v, 26 * v]; });
    T.ceilings.L3l = T.ceilings.L3h = T.ceilings.L3r = T.ceilings.L3k = T.ceilings.L3b = U.ceiling(77);
    // the sky over the street/garden (drawn unlit, tinted by the level)
    T.ceilings.L3sky = U.makeTex(64, 64, (x, y) => { const st = hash(x, y, 78) > 0.997 ? 110 : 0; const v = 18 + RT.fbm(x / 24, y / 24, 79, 2) * 10; return [v + st, v + st, v + 8 + st]; });

    T.houseDoor = U.makeTex(64, 64, (x, y) => {
      if (x < 3 || x > 60 || y < 2) return [40, 26, 16];
      const panel = ((x > 8 && x < 28) || (x > 36 && x < 56)) && ((y > 8 && y < 28) || (y > 34 && y < 58));
      const v = panel ? 0.82 : 1; const gr = 0.8 + RT.noise(x / 2, y / 12, 80) * 0.35;
      if (x > 50 && x < 55 && y > 30 && y < 34) return [200, 170, 80];
      return U.shade([110, 72, 42], v * gr);
    });

    // ---- windows: open, shut, curtains drawn, and the tinged sky with the cab ----
    const frame = (g) => { g.fillStyle = '#3a2618'; g.fillRect(10, 8, 44, 42); g.fillStyle = '#5a3c26'; g.fillRect(8, 49, 48, 4); };
    const night = (g, tint) => {
      const gr = g.createLinearGradient(0, 10, 0, 48);
      gr.addColorStop(0, tint ? '#4a1a5a' : '#141c2c'); gr.addColorStop(1, tint ? '#1a0a24' : '#06080e');
      g.fillStyle = gr; g.fillRect(13, 11, 38, 36);
    };
    D.win3Shut = U.canvasTex(64, 64, (g) => { frame(g); night(g); g.fillStyle = '#3a2618'; g.fillRect(13, 28, 38, 2); g.fillRect(31, 11, 2, 36); g.fillStyle = '#7a1f2a'; g.fillRect(3, 6, 8, 50); g.fillRect(53, 6, 8, 50); });
    D.win3Open = U.canvasTex(64, 64, (g) => { frame(g); night(g); g.fillStyle = '#3a2618'; g.fillRect(13, 11, 38, 12); g.fillRect(13, 23, 38, 2); g.fillStyle = 'rgba(200,210,230,0.5)'; for (let i = 0; i < 12; i++) g.fillRect(14 + i * 3, 30 + (i % 4) * 4, 1, 3); g.fillStyle = '#7a1f2a'; g.fillRect(3, 6, 8, 50); g.fillRect(55, 6, 6, 50); g.fillRect(53, 20, 4, 30); });
    D.win3Curtain = U.canvasTex(64, 64, (g) => { frame(g); g.fillStyle = '#6a1a24'; g.fillRect(8, 6, 48, 50); g.fillStyle = '#4e1018'; for (let x = 10; x < 56; x += 6) g.fillRect(x, 6, 2, 50); });
    D.win3Cab = U.canvasTex(64, 64, (g) => {
      frame(g); night(g, true);
      g.fillStyle = '#0a0410'; g.fillRect(13, 38, 38, 9);
      g.fillStyle = '#020202'; g.fillRect(18, 33, 26, 8); g.fillRect(23, 29, 14, 5);
      g.fillStyle = '#e8c860'; g.fillRect(28, 27, 4, 2);
      g.fillStyle = '#3a2618'; g.fillRect(13, 28, 38, 2); g.fillRect(31, 11, 2, 36);
      g.fillStyle = '#7a1f2a'; g.fillRect(3, 6, 8, 50); g.fillRect(53, 6, 8, 50);
    });
    D.keysHook = U.canvasTex(64, 64, (g) => { g.fillStyle = '#5a3a22'; g.fillRect(20, 26, 24, 5); g.fillStyle = '#c8a050'; g.fillRect(28, 31, 3, 8); g.fillRect(27, 38, 5, 3); g.fillStyle = '#aaa'; g.fillRect(34, 31, 2, 7); });
    D.hookEmpty = U.canvasTex(64, 64, (g) => { g.fillStyle = '#5a3a22'; g.fillRect(20, 26, 24, 5); g.fillStyle = '#333'; g.fillRect(28, 31, 1, 3); g.fillRect(34, 31, 1, 3); });

    // ---- props ----
    S.phoneTable = (withPhone, handsetOff) => U.canvasTex(40, 44, (g) => {
      g.fillStyle = '#4a2e1a'; g.fillRect(4, 20, 32, 4); g.fillRect(6, 24, 3, 20); g.fillRect(31, 24, 3, 20);
      if (!withPhone) return;
      g.fillStyle = '#111'; g.fillRect(10, 12, 20, 9); g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(20, 16, 3.5, 0, 7); g.fill();
      if (!handsetOff) { g.fillStyle = '#151515'; g.fillRect(8, 8, 24, 4); g.fillRect(8, 6, 4, 4); g.fillRect(28, 6, 4, 4); }
      else { g.fillStyle = '#151515'; g.fillRect(30, 18, 9, 3); g.fillRect(35, 14, 4, 6); }
    });
    T.v.phoneTable = S.phoneTable(true, false); T.v.phoneTable_off = S.phoneTable(true, true);
    S.tvOn = [0, 1].map((f) => U.canvasTex(44, 50, (g) => {
      g.fillStyle = '#3c2513'; g.fillRect(0, 30, 44, 20); g.fillStyle = '#222'; g.fillRect(4, 4, 36, 26);
      for (let y = 7; y < 27; y++) for (let x = 7; x < 37; x++) { const v = hash(x, y, 90 + f) * 200 + 40; g.fillStyle = `rgb(${v},${v},${v + 10})`; g.fillRect(x, y, 1, 1); }
    }));
    S.radio = (on) => U.canvasTex(32, 24, (g) => { g.fillStyle = '#5a3a22'; g.fillRect(2, 6, 28, 18); g.fillStyle = '#2a1a10'; for (let x = 5; x < 16; x += 2) g.fillRect(x, 9, 1, 12); g.fillStyle = on ? '#ffb040' : '#3a3020'; g.fillRect(19, 10, 8, 4); g.fillStyle = '#ccc'; g.fillRect(20, 17, 3, 3); g.fillRect(25, 17, 3, 3); g.fillStyle = '#888'; g.fillRect(26, 0, 1, 6); });
    S.laptop = (on) => U.canvasTex(48, 40, (g) => { g.fillStyle = '#4a3a2a'; g.fillRect(0, 18, 48, 4); g.fillRect(3, 22, 3, 18); g.fillRect(42, 22, 3, 18); g.fillStyle = '#333'; g.fillRect(12, 4, 24, 15); g.fillStyle = on ? '#6a9ac8' : '#0a0c10'; g.fillRect(14, 6, 20, 11); g.fillStyle = '#444'; g.fillRect(10, 17, 28, 2); });
    S.lampPost = U.canvasTex(16, 64, (g) => { g.fillStyle = '#222'; g.fillRect(7, 8, 2, 56); g.fillRect(3, 6, 10, 3); g.fillStyle = '#f0d890'; g.fillRect(4, 8, 8, 3); });
    S.cab = U.canvasTex(64, 36, (g) => {
      g.fillStyle = '#060606'; g.fillRect(2, 14, 60, 16); g.beginPath(); g.moveTo(14, 14); g.lineTo(20, 3); g.lineTo(46, 3); g.lineTo(52, 14); g.fill();
      g.fillStyle = '#141820'; g.fillRect(22, 5, 10, 8); g.fillRect(34, 5, 10, 8);
      g.fillStyle = '#e8c860'; g.fillRect(28, 0, 8, 3);
      g.fillStyle = '#111'; g.beginPath(); g.arc(14, 30, 5, 0, 7); g.fill(); g.beginPath(); g.arc(50, 30, 5, 0, 7); g.fill();
      g.fillStyle = '#a03020'; g.fillRect(2, 18, 2, 3); g.fillRect(60, 18, 2, 3);
    });
    S.dirt = U.canvasTex(48, 12, (g) => { g.fillStyle = '#3a2614'; g.beginPath(); g.ellipse(24, 8, 22, 5, 0, 0, 7); g.fill(); g.fillStyle = '#5a3e22'; g.fillRect(30, 0, 2, 8); g.fillRect(27, 0, 8, 2); });
    S.dirtDone = U.canvasTex(48, 12, (g) => { g.fillStyle = '#3a2614'; g.beginPath(); g.ellipse(24, 8, 22, 5, 0, 0, 7); g.fill(); g.fillStyle = '#ddd'; for (let i = 0; i < 30; i++) g.fillRect(6 + (i * 7) % 36, 5 + (i * 3) % 6, 1, 1); });
    S.cabinet3 = U.canvasTex(36, 40, (g) => { g.fillStyle = '#5b3a20'; g.fillRect(0, 6, 36, 34); g.fillStyle = '#3c2513'; g.fillRect(3, 10, 30, 10); g.fillRect(3, 24, 30, 12); g.fillStyle = '#c7a24a'; g.fillRect(16, 14, 4, 2); g.fillRect(16, 29, 4, 2); });

    // ---- the hooded man ----
    const hoodFigure = (g, ox, oy, k, turned) => {
      g.save(); g.translate(ox, oy); g.scale(k, k);
      g.fillStyle = '#0c0a0e';
      g.beginPath(); g.moveTo(16, 0); g.quadraticCurveTo(29, 2, 28, 18); g.lineTo(4, 18); g.quadraticCurveTo(3, 2, 16, 0); g.fill(); // hood
      g.beginPath(); g.moveTo(2, 16); g.lineTo(30, 16); g.lineTo(32, 64); g.lineTo(0, 64); g.closePath(); g.fill();       // robe
      g.fillStyle = '#16131a'; g.fillRect(14, 18, 4, 46);
      if (turned) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(turned > 0 ? 20 : 12, 11, 5, 6, 0, 0, 7); g.fill(); g.fillStyle = '#c8c0b0'; g.fillRect(turned > 0 ? 19 : 11, 10, 1, 1); }
      g.restore();
    };
    T.hooded = [U.canvasTex(32, 64, (g) => hoodFigure(g, 0, 0, 1, 0)), U.canvasTex(32, 64, (g) => {
      hoodFigure(g, 0, 0, 1, 1); g.fillStyle = '#d8d0c0'; g.fillRect(2, 40, 3, 6); g.fillRect(27, 40, 3, 6); for (let i = 0; i < 4; i++) { g.fillRect(1 + i, 46, 1, 5); g.fillRect(27 + i, 46, 1, 5); }
    })];
    // driver from behind: seat back, shoulders, hood. frame 1: head turned toward you
    T.driver = [0, 1].map((f) => U.canvasTex(48, 48, (g) => {
      g.fillStyle = '#2a1e18'; g.fillRect(8, 22, 32, 26); g.fillStyle = '#3a2a20'; g.fillRect(14, 12, 20, 12);     // seat + headrest
      g.fillStyle = '#0c0a0e'; g.beginPath(); g.moveTo(24, 2); g.quadraticCurveTo(36, 4, 35, 20); g.lineTo(13, 20); g.quadraticCurveTo(12, 4, 24, 2); g.fill();
      g.fillRect(4, 18, 40, 10);
      if (f) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(32, 12, 5, 6, 0, 0, 7); g.fill(); g.fillStyle = '#d8d0c0'; g.fillRect(31, 11, 1, 1); g.fillRect(34, 11, 1, 1); }
    }, 0.06, 95 + f));
    T.passenger = [0, 1].map((f) => U.canvasTex(32, 48, (g) => {
      g.fillStyle = '#1a1a20'; g.fillRect(6, 18, 20, 30);                     // suit
      g.fillStyle = '#cfc8bc'; g.beginPath(); g.ellipse(16, 11, 7, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(8, 0, 16, 4); g.fillRect(5, 4, 22, 2);  // hat
      g.fillStyle = '#000'; g.fillRect(12, 9, 2, 2); g.fillRect(18, 9, 2, 2);
      g.fillStyle = f ? '#300' : '#000'; g.fillRect(10, 14, 12, f ? 4 : 1);         // the smile, then the mouth
      if (f) { g.fillStyle = '#e8e0d0'; for (let x = 10; x < 22; x += 2) g.fillRect(x, 14, 1, 2); }
      g.fillStyle = '#c0c4c8'; g.fillRect(24, 30, 2, 10);                      // something shining in his hand
    }, 0.06, 97 + f));

    // ---- cab interior ----
    T.walls.cab = U.makeTex(64, 64, (x, y) => { const seam = y % 16 === 0 || x % 32 === 0; const v = 26 + hash(x, y, 99) * 8; return seam ? [14, 12, 12] : [v + 4, v, v - 2]; });
    T.floors.cab = U.makeTex(64, 64, (x, y) => { const r = (x + y) % 6 < 2; const v = r ? 22 : 30; return [v, v, v]; });
    T.ceilings.cab = U.makeTex(64, 64, (x, y) => { const lamp = x > 24 && x < 40 && y > 26 && y < 38; const v = 40 + hash(x, y, 100) * 10; return lamp ? [220, 200, 150] : [v, v - 2, v - 4]; });

    // ---- jumpscare faces ----
    T.faces.hood = cnv(96, 96, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#0e0c10'; g.beginPath(); g.moveTo(48, 2); g.quadraticCurveTo(94, 10, 92, 96); g.lineTo(4, 96); g.quadraticCurveTo(2, 10, 48, 2); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(48, 52, 26, 34, 0, 0, 7); g.fill();
      g.fillStyle = '#e8e0d0'; g.fillRect(36, 44, 3, 3); g.fillRect(57, 44, 3, 3);
      g.fillStyle = 'rgba(232,224,208,0.3)'; g.fillRect(35, 43, 5, 5); g.fillRect(56, 43, 5, 5);
      g.fillStyle = '#cfc6b4';                                                   // long pale fingers reaching out of the hood
      for (let i = 0; i < 4; i++) { g.fillRect(16 + i * 4, 60 - i * 3, 2, 30); g.fillRect(76 - i * 4, 60 - i * 3, 2, 30); }
    });
    T.faces.passenger = cnv(96, 96, (g) => {
      g.fillStyle = '#050505'; g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#d4ccbe'; g.beginPath(); g.ellipse(48, 52, 32, 42, 0, 0, 7); g.fill();
      g.fillStyle = '#0a0a0a'; g.fillRect(14, 0, 68, 14); g.fillRect(4, 12, 88, 6);
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(34, 40, 6, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(62, 40, 6, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#2a0000'; g.beginPath(); g.moveTo(14, 58); g.quadraticCurveTo(48, 96, 82, 58); g.quadraticCurveTo(48, 74, 14, 58); g.fill();
      g.fillStyle = '#efe6d2'; for (let x = 18; x < 80; x += 3) g.fillRect(x, 60 + Math.sin((x - 14) / 68 * Math.PI) * 9, 2, 4);
      g.fillStyle = '#c8ccd4'; g.beginPath(); g.moveTo(80, 96); g.lineTo(92, 50); g.lineTo(95, 52); g.lineTo(86, 96); g.fill();  // the knife
    });
  };
})(window.RT);

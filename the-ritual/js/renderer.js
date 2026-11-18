// Wolfenstein/DOOM-style raycaster drawing into a low-resolution buffer that
// CSS scales up with nearest-neighbour filtering.
(function (RT) {
  const FACE_KEY = (x, y, f) => (y * 64 + x) * 4 + 'NSEW'.indexOf(f);

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.H = 200;
      this.resize();
      this.grain = new Float32Array(4096);
      for (let i = 0; i < this.grain.length; i++) this.grain[i] = Math.random();
    }

    resize() {
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      const H = this.H;
      const W = Math.round(RT.clamp(H * aspect, 240, 480));
      this.W = W;
      this.canvas.width = W; this.canvas.height = H;
      this.img = this.ctx.createImageData(W, H);
      this.buf = new Uint32Array(this.img.data.buffer);
      this.zbuf = new Float32Array(W);
      // keep aspect; letterbox if clamped
      const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      this.canvas.style.width = Math.round(W * scale) + 'px';
      this.canvas.style.height = Math.round(H * scale) + 'px';
    }

    // Light at a world point -> [r,g,b] multipliers (0..~1.4), quantised for that banded DOOM look.
    light(world, wx, wy, room, out) {
      let r = world.ambient * 0.6, g = world.ambient * 0.68, b = world.ambient;
      if (room && world.roomLit[room]) { r += 1.0; g += 0.94; b += 0.82; }
      const L = world.lights;
      for (let i = 0; i < L.length; i++) {
        const l = L[i];
        const dx = wx - l.x, dy = wy - l.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= l.radius) continue;
        let k = 1 - d / l.radius; k = k * k * l.intensity;
        if (l.cone) {
          const dot = d > 0.01 ? (dx * l.dx + dy * l.dy) / d : 1;
          k *= RT.clamp((dot - 0.88) / 0.08, 0, 1);
        }
        r += k * l.r; g += k * l.g; b += k * l.b;
      }
      out[0] = Math.min(1.5, Math.floor(r * 14) / 14);
      out[1] = Math.min(1.5, Math.floor(g * 14) / 14);
      out[2] = Math.min(1.5, Math.floor(b * 14) / 14);
    }

    render(world, t) {
      const { W, H, buf, zbuf } = this;
      const map = world.map;
      const p = world.player;
      const dirX = Math.cos(p.a), dirY = Math.sin(p.a);
      const planeX = -dirY * 0.68, planeY = dirX * 0.68;
      const horizon = (H >> 1) + (p.bob || 0);
      const posZ = 0.5 * H;
      const T = RT.Tex;
      const L = [0, 0, 0];

      // ---- floor + ceiling ----
      const rdx0 = dirX - planeX, rdy0 = dirY - planeY, rdx1 = dirX + planeX, rdy1 = dirY + planeY;
      const salt = world.saltCircleRender;
      for (let y = 0; y < H; y++) {
        const isFloor = y > horizon;
        const pp = isFloor ? y - horizon : horizon - y;
        if (pp < 1) { for (let x = 0; x < W; x++) buf[y * W + x] = 0xff000000; continue; }
        const rowDist = posZ / pp;
        const stepX = rowDist * (rdx1 - rdx0) / W, stepY = rowDist * (rdy1 - rdy0) / W;
        let fx = p.x + rowDist * rdx0, fy = p.y + rowDist * rdy0;
        let lastCell = 1e9, room = null, tex = null;
        for (let x = 0; x < W; x++, fx += stepX, fy += stepY) {
          const cx = fx | 0, cy = fy | 0;
          const cell = cy * 64 + cx;
          if (cell !== lastCell) {
            lastCell = cell;
            room = map.roomAt(cx, cy);
            tex = isFloor ? (T.floors[room] || T.floors.c) : T.ceiling;
            this.light(world, cx + 0.5, cy + 0.5, room, L);
          }
          // per-pixel candle falloff (cheap: only distance term recomputed every 4 px)
          if ((x & 3) === 0) this.light(world, fx, fy, room, L);
          const tx = ((fx - cx) * 64) & 63, ty = ((fy - cy) * 64) & 63;
          let c = tex.data[ty * 64 + tx];
          if (isFloor && salt) {
            const d = Math.hypot(fx - salt.x, fy - salt.y);
            if (Math.abs(d - salt.r) < 0.045 * salt.progress + 0.001 && Math.atan2(fy - salt.y, fx - salt.x) + Math.PI < salt.progress * Math.PI * 2 + 0.01)
              c = 0xffe8e8f0;
          }
          let r = (c & 255) * L[0], g = ((c >> 8) & 255) * L[1], b = ((c >> 16) & 255) * L[2];
          if (c === 0xffe8e8f0) { r = Math.max(r, 120); g = Math.max(g, 125); b = Math.max(b, 140); }
          if (!isFloor) { r *= 0.8; g *= 0.8; b *= 0.8; }
          buf[y * W + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
        }
      }

      // ---- walls ----
      for (let x = 0; x < W; x++) {
        const cam = 2 * x / W - 1;
        const rdx = dirX + planeX * cam, rdy = dirY + planeY * cam;
        let mx = p.x | 0, my = p.y | 0;
        const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
        let sx, sy, sdx, sdy;
        if (rdx < 0) { sx = -1; sdx = (p.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - p.x) * ddx; }
        if (rdy < 0) { sy = -1; sdy = (p.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - p.y) * ddy; }
        let side = 0, hit = false, guard = 0;
        while (!hit && guard++ < 64) {
          if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
          if (map.isWall(mx, my)) hit = true;
        }
        const perp = side === 0 ? sdx - ddx : sdy - ddy;
        zbuf[x] = perp;
        let wallX = side === 0 ? p.y + perp * rdy : p.x + perp * rdx;
        wallX -= Math.floor(wallX);
        const face = side === 0 ? (sx > 0 ? 'W' : 'E') : (sy > 0 ? 'N' : 'S');
        const frontX = side === 0 ? mx - sx : mx, frontY = side === 1 ? my - sy : my;
        const room = map.roomAt(frontX, frontY);
        const wtex = T.walls[room] || T.walls.c;
        const decal = map.decalAt(mx, my, face);
        let tx = (wallX * 64) | 0;
        if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) tx = 63 - tx;
        const hx = p.x + perp * rdx, hy = p.y + perp * rdy;
        this.light(world, hx - (side === 0 ? sx : 0) * 0.02, hy - (side === 1 ? sy : 0) * 0.02, room, L);
        if (side === 1) { L[0] *= 0.82; L[1] *= 0.82; L[2] *= 0.82; }
        let dtex = null, emissive = 0;
        if (decal) { dtex = world.decalTex(decal); emissive = decal.emissive || 0; }
        const lr = Math.max(L[0], emissive * 0.7), lg = Math.max(L[1], emissive * 0.8), lb = Math.max(L[2], emissive);
        const lineH = H / perp;
        const top = horizon - lineH / 2;
        const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(horizon + lineH / 2));
        const texStep = 64 / lineH;
        let texPos = (y0 - top) * texStep;
        for (let y = y0; y < y1; y++, texPos += texStep) {
          const ty = texPos & 63;
          let c = 0;
          if (dtex) c = dtex.data[ty * 64 + tx];
          if (!(c >>> 24)) c = wtex.data[ty * 64 + tx];
          const r = (c & 255) * lr, g = ((c >> 8) & 255) * lg, b = ((c >> 16) & 255) * lb;
          buf[y * W + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
        }
      }

      // ---- sprites ----
      const sprites = world.sprites;
      for (const s of sprites) s._d = (p.x - s.x) * (p.x - s.x) + (p.y - s.y) * (p.y - s.y);
      sprites.sort((a, b) => b._d - a._d);
      const inv = 1 / (planeX * dirY - dirX * planeY);
      for (const s of sprites) {
        if (s.hidden) continue;
        const tex = s.getTex ? s.getTex(t) : s.tex;
        if (!tex) continue;
        const rx = s.x - p.x, ry = s.y - p.y;
        const tX = inv * (dirY * rx - dirX * ry);
        const tY = inv * (-planeY * rx + planeX * ry);
        if (tY <= 0.08) continue;
        const scrX = (W / 2) * (1 + tX / tY);
        const hgt = s.h * H / tY;
        const wid = hgt * tex.w / tex.h;
        const bottom = horizon + (0.5 - (s.z || 0)) * H / tY;
        const topY = bottom - hgt;
        const x0 = Math.max(0, Math.floor(scrX - wid / 2)), x1 = Math.min(W, Math.ceil(scrX + wid / 2));
        const y0 = Math.max(0, Math.floor(topY)), y1 = Math.min(H, Math.ceil(bottom));
        let lr, lg, lb;
        if (s.black) { lr = lg = lb = 0; }
        else {
          this.light(world, s.x, s.y, map.roomAt(s.x | 0, s.y | 0), L);
          lr = Math.max(L[0], s.emissive || 0); lg = Math.max(L[1], s.emissive || 0); lb = Math.max(L[2], (s.emissive || 0) * 0.6);
        }
        for (let x = x0; x < x1; x++) {
          if (tY >= zbuf[x]) continue;
          const tx = Math.floor((x - (scrX - wid / 2)) * tex.w / wid);
          if (tx < 0 || tx >= tex.w) continue;
          for (let y = y0; y < y1; y++) {
            const ty = Math.floor((y - topY) * tex.h / hgt);
            if (ty < 0 || ty >= tex.h) continue;
            const c = tex.data[ty * tex.w + tx];
            if (!(c >>> 24)) continue;
            if (s.black) { buf[y * W + x] = 0xff040305; continue; }
            const r = (c & 255) * lr, g = ((c >> 8) & 255) * lg, b = ((c >> 16) & 255) * lb;
            buf[y * W + x] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
          }
        }
      }

      this.post(world, t);
      this.ctx.putImageData(this.img, 0, 0);
      this.drawViewModel(world, t);
    }

    post(world, t) {
      const { W, H, buf, grain } = this;
      const fx = world.fx;
      // film grain
      const off = (Math.random() * 4096) | 0;
      const amt = 10 + fx.hallucinate * 14;
      for (let i = 0, n = W * H; i < n; i++) {
        const c = buf[i];
        const gr = (grain[(i + off) & 4095] - 0.5) * amt;
        let r = (c & 255) + gr, g = ((c >> 8) & 255) + gr, b = ((c >> 16) & 255) + gr;
        if (fx.cold > 0) { const k = fx.cold * 0.35; const m = (r + g + b) / 3; r = r + (m - r) * k; g = g + (m - g) * k; b = b + (m * 1.25 - b) * k; }
        buf[i] = 0xff000000 | ((b < 0 ? 0 : b > 255 ? 255 : b) << 16) | ((g < 0 ? 0 : g > 255 ? 255 : g) << 8) | (r < 0 ? 0 : r > 255 ? 255 : r);
      }
      if (fx.hallucinate > 0) {
        const h = fx.hallucinate;
        const invert = Math.random() < 0.025 * h;
        const row = new Uint32Array(W);
        for (let y = 0; y < H; y++) {
          const shift = Math.round(Math.sin(y * 0.09 + t * 3.1) * 6 * h + Math.sin(y * 0.31 - t * 7) * 2 * h);
          for (let x = 0; x < W; x++) row[x] = buf[y * W + ((x + shift + W) % W)];
          for (let x = 0; x < W; x++) {
            const c = row[x];
            let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
            r = Math.min(255, r * (1 + h * 0.8) + 30 * h * (0.5 + 0.5 * Math.sin(t * 2)));
            g *= 1 - h * 0.5; b *= 1 - h * 0.4;
            if (invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
            buf[y * W + x] = 0xff000000 | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
          }
        }
      }
    }

    drawViewModel(world, t) {
      const p = world.player, ctx = this.ctx, H = this.H, W = this.W;
      ctx.imageSmoothingEnabled = false;
      const vm = world.viewModel;
      if (!vm.candle) return;
      const sway = Math.sin(p.walkPhase * 0.5) * 3, bob = Math.abs(Math.cos(p.walkPhase * 0.5)) * 3;
      const cx = Math.round(W * 0.66 + sway), cy = Math.round(H - 72 + 8 + bob + (vm.lower || 0));
      ctx.drawImage(vm.lit ? RT.Tex.hand.lit : RT.Tex.hand.dark, cx, cy);
      const fx = cx + 31, fy = cy + 10;
      if (vm.lit) {
        const fl = Math.sin(t * 23) * 0.6 + Math.sin(t * 37) * 0.4;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,140,40,0.10)'; ctx.beginPath(); ctx.arc(fx, fy - 3, 12 + fl, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,170,70,0.12)'; ctx.beginPath(); ctx.arc(fx, fy - 4, 6 + fl, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ff9a2e'; ctx.fillRect(fx - 2, fy - 8 + Math.round(fl), 4, 8 - Math.round(fl));
        ctx.fillStyle = '#ffe9a0'; ctx.fillRect(fx - 1, fy - 5 + Math.round(fl), 2, 4);
      } else if (vm.smoke > 0) {
        ctx.fillStyle = `rgba(140,140,150,${vm.smoke * 0.5})`;
        for (let i = 0; i < 5; i++) ctx.fillRect(fx + Math.round(Math.sin(t * 3 + i) * 2), fy - 2 - i * 4 - ((t * 10) % 4), 1, 2);
      }
      if (vm.match > 0) {
        const mx = Math.round(W * 0.66 - 40), my = Math.round(H - 50 + (1 - vm.match) * 20);
        ctx.drawImage(RT.Tex.hand.match, mx, my);
        if (vm.matchFlame) {
          ctx.fillStyle = 'rgba(255,170,60,0.25)'; ctx.beginPath(); ctx.arc(mx + 15, my + 9, 10, 0, 7); ctx.fill();
          ctx.fillStyle = '#ffb040'; ctx.fillRect(mx + 12, my + 3, 5, 6);
          ctx.fillStyle = '#fff2b0'; ctx.fillRect(mx + 14, my + 5, 2, 3);
        }
      }
      // cold breath
      if (world.fx.cold > 0.35) {
        const ph = (t * 0.6) % 1;
        if (ph < 0.5) {
          ctx.fillStyle = `rgba(200,210,230,${(0.5 - ph) * 0.5 * world.fx.cold})`;
          ctx.beginPath(); ctx.ellipse(W / 2, H - 40 - ph * 40, 10 + ph * 30, 5 + ph * 12, 0, 0, 7); ctx.fill();
        }
      }
    }
  }
  RT.Renderer = Renderer;
  RT.FACE_KEY = FACE_KEY;
})(window.RT);

// Shared helpers. Everything hangs off the global RT namespace so the game
// runs from plain <script> tags (works from file://, GitHub Pages, or a
// mobile WebView wrapper later).
window.RT = window.RT || {};
(function (RT) {
  RT.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  RT.lerp = (a, b, t) => a + (b - a) * t;
  RT.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  RT.randInt = (a, b) => Math.floor(RT.rand(a, b + 1));
  RT.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  RT.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  RT.angleDiff = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  // Little-endian ABGR pixel packing for Uint32 views over ImageData.
  RT.rgba = (r, g, b, a = 255) =>
    (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;

  // Deterministic hash noise so procedural textures look the same every run.
  RT.hash = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  };
  RT.noise = (x, y, s = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = RT.hash(xi, yi, s), b = RT.hash(xi + 1, yi, s);
    const c = RT.hash(xi, yi + 1, s), d = RT.hash(xi + 1, yi + 1, s);
    return RT.lerp(RT.lerp(a, b, u), RT.lerp(c, d, u), v);
  };
  RT.fbm = (x, y, s = 0, oct = 3) => {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += amp * RT.noise(x * f, y * f, s + i * 17); amp *= 0.5; f *= 2; }
    return v / (1 - Math.pow(0.5, oct));
  };

  RT.fmtClock = (minutes) => {
    // minutes since 12:00 a.m.
    const m = Math.floor(minutes);
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h === 0 ? 12 : h}:${String(mm).padStart(2, '0')} A.M.`;
  };
})(window.RT);

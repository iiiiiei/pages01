(function () {
  "use strict";

  const outerWorld = document.getElementById("outer-world");
  const innerWorld = document.getElementById("inner-world");
  const canvas = document.getElementById("ascii-canvas");
  const ctx = canvas.getContext("2d");
  const mac = document.getElementById("mac");
  const macStage = document.getElementById("mac-stage");
  const scrollHint = document.getElementById("scroll-hint");

  const state = {
    mousePx: { x: 0, y: 0 },
    mouse: { x: 0.5, y: 0.5 },
    scrollProgress: 0,
    width: 0,
    height: 0,
    mac: { x: 0, y: 0, w: 168, h: 198, depth: 28 },
  };

  const ASCII = " .:-=+*#%@";
  const CELL = 8;
  let targetScroll = 0;
  const ENTER_AT = 0.92;
  const EXIT_AT = 0.88;
  const BASE_ROTX = 8 * Math.PI / 180;
  const BASE_ROTY = -22 * Math.PI / 180;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    state.mac.w = 168;
    state.mac.h = 198;
    state.mac.depth = 28;
    state.mac.x = state.width * 0.11;
    state.mac.y = state.height - state.height * 0.14 - state.mac.h;
  }

  function onPointerMove(e) {
    const x = e.clientX || 0;
    const y = e.clientY || 0;
    state.mousePx.x = x;
    state.mousePx.y = y;
    state.mouse.x = state.width ? x / state.width : 0.5;
    state.mouse.y = state.height ? y / state.height : 0.5;
    if (state.scrollProgress < 0.45) {
      const addX = (state.mouse.y - 0.5) * -12;
      const addY = (state.mouse.x - 0.3) * 10;
      mac.style.transform = "rotateX(" + (8 + addX) + "deg) rotateY(" + (-22 + addY) + "deg)";
    }
  }

  function onWheel(e) {
    e.preventDefault();
    targetScroll += e.deltaY * 0.00135;
    targetScroll = Math.max(0, Math.min(1, targetScroll));
  }

  function rotY(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }
  function rotX(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }

  function macCorners3D(extraRotX, extraRotY) {
    const w = state.mac.w, h = state.mac.h, d = state.mac.depth;
    const cx = w / 2, cy = h / 2, cz = d / 2;
    const local = [
      { x: 0 - cx, y: 0 - cy, z: 0 - cz },
      { x: w - cx, y: 0 - cy, z: 0 - cz },
      { x: w - cx, y: h - cy, z: 0 - cz },
      { x: 0 - cx, y: h - cy, z: 0 - cz },
      { x: 0 - cx, y: 0 - cy, z: d - cz },
      { x: w - cx, y: 0 - cy, z: d - cz },
      { x: w - cx, y: h - cy, z: d - cz },
      { x: 0 - cx, y: h - cy, z: d - cz },
    ];
    const rx = BASE_ROTX + extraRotX;
    const ry = BASE_ROTY + extraRotY;
    const ox = state.mac.x + cx;
    const oy = state.mac.y + cy;
    return local.map(function (p) {
      let q = rotY(p, ry);
      q = rotX(q, rx);
      return { x: q.x + ox, y: q.y + oy, z: q.z };
    });
  }

  function projectToFloor(L, P, floorY) {
    const dy = P.y - L.y;
    if (Math.abs(dy) < 1e-4) {
      return { x: P.x + (P.x - L.x) * 2, y: floorY };
    }
    const t = (floorY - L.y) / dy;
    if (t < 0.15) return null;
    return { x: L.x + (P.x - L.x) * t, y: floorY };
  }

  function convexHull(pts) {
    if (pts.length < 3) return pts.slice();
    const p = pts.slice().sort(function (a, b) {
      return a.x === b.x ? a.y - b.y : a.x - b.x;
    });
    const cross = function (o, a, b) {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };
    const lower = [];
    for (let i = 0; i < p.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 0) lower.pop();
      lower.push(p[i]);
    }
    const upper = [];
    for (let i = p.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p[i]) <= 0) upper.pop();
      upper.push(p[i]);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const inter = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (inter) inside = !inside;
    }
    return inside;
  }

  function distToPolyEdge(px, py, poly) {
    let minD = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const abx = b.x - a.x, aby = b.y - a.y;
      const apx = px - a.x, apy = py - a.y;
      const ab2 = abx * abx + aby * aby || 1;
      let t = (apx * abx + apy * aby) / ab2;
      t = Math.max(0, Math.min(1, t));
      const qx = a.x + abx * t, qy = a.y + aby * t;
      const d = Math.hypot(px - qx, py - qy);
      if (d < minD) minD = d;
    }
    return minD;
  }

  function drawAsciiFrame() {
    const w = state.width, h = state.height;
    if (w < 10 || h < 10) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const fade = Math.max(0, 1 - state.scrollProgress * 1.35);
    if (fade < 0.03) return;

    const floorY = state.height * 0.92;
    const L = { x: state.mousePx.x, y: state.mousePx.y, z: 220 };
    const extraX = state.scrollProgress < 0.45 ? (state.mouse.y - 0.5) * -12 * Math.PI / 180 : 0;
    const extraY = state.scrollProgress < 0.45 ? (state.mouse.x - 0.3) * 10 * Math.PI / 180 : 0;

    const corners = macCorners3D(extraX, extraY);
    const projected = [];
    for (let i = 0; i < corners.length; i++) {
      const pr = projectToFloor(L, corners[i], floorY);
      if (pr) projected.push(pr);
    }
    if (projected.length < 3) return;
    const hull = convexHull(projected);
    if (hull.length < 3) return;

    const SOFT = 18;
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    ctx.font = (CELL + 1) + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const mx0 = state.mac.x - 20, my0 = state.mac.y - 20;
    const mx1 = state.mac.x + state.mac.w + 40, my1 = state.mac.y + state.mac.h + 30;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * CELL + CELL * 0.5;
        const cy = row * CELL + CELL * 0.5;
        if (cx > mx0 && cx < mx1 && cy > my0 && cy < my1) continue;
        if (!pointInPoly(cx, cy, hull)) continue;
        const edge = distToPolyEdge(cx, cy, hull);
        let strength = edge < SOFT ? edge / SOFT : 1;
        const macCy = state.mac.y + state.mac.h * 0.5;
        const away = Math.min(1, Math.max(0, (cy - macCy) / (h * 0.35)));
        strength = strength * (0.55 + away * 0.45) * fade;
        if (strength < 0.06) continue;
        const idx = Math.min(ASCII.length - 1, Math.floor(strength * (ASCII.length - 1)));
        const ch = ASCII[idx];
        const g = Math.floor(30 + strength * 200);
        const a = 0.15 + strength * 0.75;
        ctx.fillStyle = "rgba(" + g + "," + g + "," + g + "," + a + ")";
        ctx.fillText(ch, cx, cy);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.1;
    const p = state.scrollProgress;
    if (scrollHint) scrollHint.classList.toggle("fade", p > 0.05);
    const scale = 1 + p * 8.5;
    const cx = state.mac.x + state.mac.w * 0.5;
    const cy = state.mac.y + state.mac.h * 0.4;
    const moveX = (0.5 * state.width - cx) * p;
    const moveY = (0.5 * state.height - cy) * p;
    macStage.style.transform = "translate(" + moveX + "px," + moveY + "px) scale(" + scale + ")";
    macStage.style.opacity = String(1 - Math.max(0, p - 0.68) * 3.2);
    if (p >= ENTER_AT) {
      outerWorld.classList.add("is-hidden");
      innerWorld.classList.add("is-active");
      document.body.style.cursor = "default";
    } else if (p <= EXIT_AT) {
      outerWorld.classList.remove("is-hidden");
      innerWorld.classList.remove("is-active");
      document.body.style.cursor = "crosshair";
    }
  }

  function frame() {
    drawAsciiFrame();
    updateScrollVisuals();
    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    state.mousePx.x = state.width * 0.7;
    state.mousePx.y = state.height * 0.28;
    state.mouse.x = 0.7;
    state.mouse.y = 0.28;
    requestAnimationFrame(frame);
  }

  init();
})();

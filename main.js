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
    box: { x: 0, y: 0, w: 160, h: 150 },
  };

  const ASCII = " .:-=+*#%@";
  const CELL = 7;
  let targetScroll = 0;
  const ENTER_AT = 0.92;
  const EXIT_AT = 0.88;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    state.box.w = 160;
    state.box.h = 150;
    state.box.x = state.width * 0.16;
    state.box.y = state.height - state.height * 0.20 - state.box.h + 10;
  }

  function onPointerMove(e) {
    state.mousePx.x = e.clientX || 0;
    state.mousePx.y = e.clientY || 0;
    state.mouse.x = state.width ? state.mousePx.x / state.width : 0.5;
    state.mouse.y = state.height ? state.mousePx.y / state.height : 0.5;

    if (state.scrollProgress < 0.4) {
      const addX = (state.mouse.y - 0.5) * -6;
      const addY = (state.mouse.x - 0.35) * 6;
      mac.style.transform =
        "rotateX(" + (-32 + addX) + "deg) rotateY(" + (38 + addY) + "deg)";
    }
  }

  function onWheel(e) {
    e.preventDefault();
    targetScroll += e.deltaY * 0.00135;
    targetScroll = Math.max(0, Math.min(1, targetScroll));
  }

  function convexHull(pts) {
    if (pts.length < 3) return pts.slice();
    const p = pts.slice().sort(function (a, b) {
      return a.x === b.x ? a.y - b.y : a.x - b.x;
    });
    function cross(o, a, b) {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
    const lower = [], upper = [];
    for (let i = 0; i < p.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 0) lower.pop();
      lower.push(p[i]);
    }
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
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi))
        inside = !inside;
    }
    return inside;
  }

  function distToEdge(px, py, poly) {
    let minD = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const abx = b.x - a.x, aby = b.y - a.y;
      const apx = px - a.x, apy = py - a.y;
      const ab2 = abx * abx + aby * aby || 1;
      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
      const d = Math.hypot(px - (a.x + abx * t), py - (a.y + aby * t));
      if (d < minD) minD = d;
    }
    return minD;
  }

  function shadowPolygon() {
    const b = state.box;
    const foot = [
      { x: b.x + 10, y: b.y + b.h - 8 },
      { x: b.x + b.w - 20, y: b.y + b.h - 12 },
      { x: b.x + b.w - 5, y: b.y + b.h + 10 },
      { x: b.x + 5, y: b.y + b.h + 14 },
    ];

    const deskY = b.y + b.h + 4;
    let lx = state.mousePx.x;
    let ly = state.mousePx.y;
    let lightH = deskY - ly;
    if (lightH < 60) {
      lightH = 160;
      ly = deskY - lightH;
    }

    const objH = 90;
    const stretch = Math.min(2.8, objH / lightH * 2.2);

    const fcx = (foot[0].x + foot[1].x + foot[2].x + foot[3].x) / 4;
    const fcy = (foot[0].y + foot[1].y + foot[2].y + foot[3].y) / 4;
    const dirX = fcx - lx;
    const dirY = fcy - ly;
    const len = Math.hypot(dirX, dirY) || 1;
    const nx = dirX / len;
    const ny = Math.max(0.15, dirY / len);

    const far = foot.map(function (p) {
      return {
        x: p.x + nx * 70 * stretch,
        y: p.y + ny * 50 * stretch + 8,
      };
    });

    return convexHull(foot.concat(far));
  }

  function drawAsciiFrame() {
    const w = state.width, h = state.height;
    if (w < 10 || h < 10) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const fade = Math.max(0, 1 - state.scrollProgress * 1.4);
    if (fade < 0.03) return;

    const hull = shadowPolygon();
    if (!hull || hull.length < 3) return;

    const SOFT = 16;
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    ctx.font = CELL + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const b = state.box;
    const sx0 = b.x, sy0 = b.y, sx1 = b.x + b.w, sy1 = b.y + b.h - 5;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * CELL + CELL * 0.5;
        const cy = row * CELL + CELL * 0.5;
        if (cy < b.y + b.h * 0.6) continue;
        if (cx > sx0 && cx < sx1 && cy > sy0 && cy < sy1) continue;
        if (!pointInPoly(cx, cy, hull)) continue;

        const edge = distToEdge(cx, cy, hull);
        let strength = edge < SOFT ? edge / SOFT : 1;
        strength *= fade;
        if (strength < 0.06) continue;

        const idx = Math.min(ASCII.length - 1, Math.floor(strength * (ASCII.length - 1)));
        const g = Math.floor(20 + strength * 190);
        const a = 0.18 + strength * 0.72;
        ctx.fillStyle = "rgba(" + g + "," + g + "," + g + "," + a + ")";
        ctx.fillText(ASCII[idx], cx, cy);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.1;
    const p = state.scrollProgress;
    if (scrollHint) scrollHint.classList.toggle("fade", p > 0.05);

    const b = state.box;
    const cx = b.x + b.w * 0.5;
    const cy = b.y + b.h * 0.35;
    const scale = 1 + p * 9;
    macStage.style.transform =
      "translate(" + ((0.5 * state.width - cx) * p) + "px," +
      ((0.5 * state.height - cy) * p) + "px) scale(" + scale + ")";
    macStage.style.opacity = String(1 - Math.max(0, p - 0.65) * 3);

    if (p >= ENTER_AT) {
      outerWorld.classList.add("is-hidden");
      innerWorld.classList.add("is-active");
      document.body.style.cursor = "default";
    } else if (p <= EXIT_AT) {
      outerWorld.classList.remove("is-hidden");
      innerWorld.classList.remove("is-active");
      document.body.style.cursor = "default";
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
    state.mousePx.x = state.width * 0.55;
    state.mousePx.y = state.height * 0.2;
    requestAnimationFrame(frame);
  }

  init();
})();

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
    scrollProgress: 0,
    width: 0,
    height: 0,
    stage: { x: 0, y: 0, w: 130, h: 180 },
    crt: { x: 0, y: 0, w: 100, h: 78 },
  };

  const ASCII = " .:-=+*#%@";
  const CELL = 6;
  let targetScroll = 0;
  const ENTER_AT = 0.93;
  const EXIT_AT = 0.88;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    state.stage.w = 130;
    state.stage.h = 180;
    state.stage.x = state.width * 0.18;
    state.stage.y = state.height - state.height * 0.18 - state.stage.h;
    state.crt.x = state.stage.x + 21;
    state.crt.y = state.stage.y + 36;
    state.crt.w = 100;
    state.crt.h = 78;
  }

  function onPointerMove(e) {
    state.mousePx.x = e.clientX || 0;
    state.mousePx.y = e.clientY || 0;
    if (state.scrollProgress < 0.35) {
      const nx = state.width ? state.mousePx.x / state.width : 0.5;
      const ny = state.height ? state.mousePx.y / state.height : 0.5;
      const addX = (ny - 0.5) * -6;
      const addY = (nx - 0.3) * 6;
      mac.style.transform =
        "rotateX(" + (28 + addX) + "deg) rotateY(" + (-32 + addY) + "deg)";
    }
  }

  function onWheel(e) {
    e.preventDefault();
    targetScroll += e.deltaY * 0.0012;
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
    const s = state.stage;
    const feetY = s.y + s.h - 4;

    const base = [
      { x: s.x + 6, y: feetY },
      { x: s.x + s.w + 8, y: feetY - 2 },
      { x: s.x + s.w + 14, y: feetY + 10 },
      { x: s.x + 2, y: feetY + 12 },
    ];

    let lx = state.mousePx.x;
    let ly = state.mousePx.y;
    if (ly > feetY - 50) ly = feetY - 200;

    const lightH = Math.max(40, feetY - ly);
    const objH = s.h * 0.85;
    const scale = Math.min(2.6, (objH / lightH) * 1.6);

    const topCorners = [
      { x: s.x + 8, y: s.y + 8 },
      { x: s.x + s.w - 4, y: s.y + 6 },
      { x: s.x + s.w + 10, y: s.y + 20 },
      { x: s.x + 4, y: s.y + 22 },
    ];

    const projected = topCorners.map(function (t) {
      const dx = t.x - lx;
      return {
        x: t.x + dx * scale,
        y: feetY + 6 + Math.abs(dx) * 0.05,
      };
    });

    return convexHull(base.concat(projected));
  }

  function drawAsciiFrame() {
    const w = state.width, h = state.height;
    if (w < 10 || h < 10) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const fade = Math.max(0, 1 - state.scrollProgress * 1.35);
    if (fade < 0.03) return;

    const hull = shadowPolygon();
    if (!hull || hull.length < 3) return;

    const SOFT = 14;
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    ctx.font = CELL + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const s = state.stage;
    const skip = {
      x0: s.x - 10, y0: s.y - 20,
      x1: s.x + s.w + 30, y1: s.y + s.h + 8,
    };

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = col * CELL + CELL * 0.5;
        const py = row * CELL + CELL * 0.5;
        if (py < s.y + s.h * 0.5) continue;
        if (px > skip.x0 && px < skip.x1 && py > skip.y0 && py < skip.y1) continue;
        if (!pointInPoly(px, py, hull)) continue;

        const edge = distToEdge(px, py, hull);
        let strength = edge < SOFT ? edge / SOFT : 1;
        strength *= fade;
        if (strength < 0.07) continue;

        const idx = Math.min(ASCII.length - 1, Math.floor(strength * (ASCII.length - 1)));
        const g = Math.floor(20 + strength * 195);
        const a = 0.18 + strength * 0.7;
        ctx.fillStyle = "rgba(" + g + "," + g + "," + g + "," + a + ")";
        ctx.fillText(ASCII[idx], px, py);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.09;
    const p = state.scrollProgress;
    if (scrollHint) scrollHint.classList.toggle("fade", p > 0.04);

    const crt = state.crt;
    const cx = crt.x + crt.w * 0.5;
    const cy = crt.y + crt.h * 0.5;
    const targetScale = Math.max(state.width / crt.w, state.height / crt.h) * 1.05;
    const scale = 1 + (targetScale - 1) * p;
    const moveX = (state.width * 0.5 - cx) * p;
    const moveY = (state.height * 0.5 - cy) * p;

    macStage.style.transform =
      "translate(" + moveX + "px," + moveY + "px) scale(" + scale + ")";
    macStage.style.transformOrigin = "0 0";
    macStage.style.opacity = String(1 - Math.max(0, p - 0.72) * 3.5);

    if (p >= ENTER_AT) {
      outerWorld.classList.add("is-hidden");
      innerWorld.classList.add("is-active");
    } else if (p <= EXIT_AT) {
      outerWorld.classList.remove("is-hidden");
      innerWorld.classList.remove("is-active");
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
    state.mousePx.x = state.width * 0.6;
    state.mousePx.y = state.height * 0.2;
    requestAnimationFrame(frame);
  }

  init();
})();

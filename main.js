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
    box: { x: 0, y: 0, w: 120, h: 140 },
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
    state.box.w = 120;
    state.box.h = 140;
    state.box.x = state.width * 0.14;
    state.box.y = state.height - state.height * 0.18 - state.box.h;
  }

  function onPointerMove(e) {
    state.mousePx.x = e.clientX || 0;
    state.mousePx.y = e.clientY || 0;
    state.mouse.x = state.width ? state.mousePx.x / state.width : 0.5;
    state.mouse.y = state.height ? state.mousePx.y / state.height : 0.5;

    if (state.scrollProgress < 0.4) {
      const addX = (state.mouse.y - 0.5) * -8;
      const addY = (state.mouse.x - 0.35) * 8;
      mac.style.transform =
        "rotateX(" + (18 + addX) + "deg) rotateY(" + (-38 + addY) + "deg) rotateZ(2deg)";
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
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
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
      let t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
      const d = Math.hypot(px - (a.x + abx * t), py - (a.y + aby * t));
      if (d < minD) minD = d;
    }
    return minD;
  }

  function shadowPolygon() {
    const b = state.box;
    const feetY = b.y + b.h;

    const base = [
      { x: b.x - 4, y: feetY - 2 },
      { x: b.x + b.w + 18, y: feetY - 2 },
      { x: b.x + b.w + 14, y: feetY + 6 },
      { x: b.x - 2, y: feetY + 6 },
    ];

    let lx = state.mousePx.x;
    let ly = state.mousePx.y;
    const lightH = Math.max(40, feetY - ly);
    if (ly >= feetY - 10) {
      ly = feetY - 120;
    }

    const topY = b.y + 8;
    const topCorners = [
      { x: b.x + 4, y: topY },
      { x: b.x + b.w - 4, y: topY },
      { x: b.x + b.w + 10, y: topY + 6 },
      { x: b.x + 8, y: topY + 4 },
    ];

    const objH = feetY - topY;
    const projected = [];
    for (let i = 0; i < topCorners.length; i++) {
      const t = topCorners[i];
      const scale = objH / Math.max(24, lightH);
      const dx = t.x - lx;
      projected.push({
        x: t.x + dx * scale * 1.8,
        y: feetY + 4 + Math.abs(dx) * scale * 0.15,
      });
    }

    return convexHull(base.concat(projected));
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

    const SOFT = 14;
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    ctx.font = CELL + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const b = state.box;
    const skip = {
      x0: b.x - 8,
      y0: b.y - 8,
      x1: b.x + b.w + 24,
      y1: b.y + b.h + 12,
    };

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * CELL + CELL * 0.5;
        const cy = row * CELL + CELL * 0.5;

        if (cy < b.y + b.h * 0.55) continue;
        if (cx > skip.x0 && cx < skip.x1 && cy > skip.y0 && cy < skip.y1) continue;
        if (!pointInPoly(cx, cy, hull)) continue;

        const edge = distToEdge(cx, cy, hull);
        let strength = edge < SOFT ? edge / SOFT : 1;
        strength *= fade;
        if (strength < 0.07) continue;

        const idx = Math.min(ASCII.length - 1, Math.floor(strength * (ASCII.length - 1)));
        const g = Math.floor(25 + strength * 200);
        const a = 0.2 + strength * 0.7;
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
    const moveX = (0.5 * state.width - cx) * p;
    const moveY = (0.5 * state.height - cy) * p;
    macStage.style.transform = "translate(" + moveX + "px," + moveY + "px) scale(" + scale + ")";
    macStage.style.opacity = String(1 - Math.max(0, p - 0.65) * 3);

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
    state.mousePx.x = state.width * 0.72;
    state.mousePx.y = state.height * 0.25;
    requestAnimationFrame(frame);
  }

  init();
})();

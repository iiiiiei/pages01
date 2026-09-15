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
    cx: 0,
    cy: 0,
  };

  const ASCII = " .:-=+*#%@";
  const CELL = 6;
  let targetScroll = 0;
  const ENTER_AT = 0.92;
  const EXIT_AT = 0.88;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    state.cx = state.width * 0.5 - state.width * 0.42;
    state.cy = state.height * 0.5 + state.height * 0.12;
  }

  function onPointerMove(e) {
    state.mousePx.x = e.clientX || 0;
    state.mousePx.y = e.clientY || 0;
    if (state.scrollProgress < 0.4) {
      const nx = state.width ? state.mousePx.x / state.width : 0.5;
      const ny = state.height ? state.mousePx.y / state.height : 0.5;
      const addX = (ny - 0.5) * -5;
      const addY = (nx - 0.35) * 5;
      mac.style.transform =
        "rotateX(" + (-28 + addX) + "deg) rotateY(" + (42 + addY) + "deg)";
    }
  }

  function onWheel(e) {
    e.preventDefault();
    targetScroll += e.deltaY * 0.00135;
    targetScroll = Math.max(0, Math.min(1, targetScroll));
  }

  function drawAsciiFrame() {
    const w = state.width, h = state.height;
    if (w < 10 || h < 10) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const fade = Math.max(0, 1 - state.scrollProgress * 1.4);
    if (fade < 0.03) return;

    const mx = state.cx;
    const my = state.cy + 70;

    let lx = state.mousePx.x;
    let ly = state.mousePx.y;
    if (ly > my - 40) ly = my - 180;

    const dx = mx - lx;
    const dy = my - ly;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = Math.max(0.2, dy / dist);

    const lightH = Math.max(50, my - ly);
    const stretch = Math.min(2.4, 140 / lightH);

    const cRx = 55, cRy = 18;
    const castCx = mx + nx * 50 * stretch;
    const castCy = my + ny * 36 * stretch;
    const castRx = 50 + 40 * stretch;
    const castRy = 16 + 10 * stretch;

    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    ctx.font = CELL + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const bodyL = mx - 70, bodyR = mx + 80;
    const bodyT = my - 130, bodyB = my - 5;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = col * CELL + CELL * 0.5;
        const py = row * CELL + CELL * 0.5;

        if (py < my - 40) continue;
        if (px > bodyL && px < bodyR && py > bodyT && py < bodyB) continue;

        const ecx = (px - mx) / cRx;
        const ecy = (py - my) / cRy;
        const cVal = 1 - (ecx * ecx + ecy * ecy);

        const kcx = (px - castCx) / castRx;
        const kcy = (py - castCy) / castRy;
        const kVal = 1 - (kcx * kcx + kcy * kcy);

        let strength = Math.max(0, cVal) * 0.55 + Math.max(0, kVal) * 0.9;
        strength = Math.min(1, strength) * fade;
        if (strength < 0.08) continue;

        const idx = Math.min(ASCII.length - 1, Math.floor(strength * (ASCII.length - 1)));
        const g = Math.floor(18 + strength * 200);
        const a = 0.15 + strength * 0.7;
        ctx.fillStyle = "rgba(" + g + "," + g + "," + g + "," + a + ")";
        ctx.fillText(ASCII[idx], px, py);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.1;
    const p = state.scrollProgress;
    if (scrollHint) scrollHint.classList.toggle("fade", p > 0.05);

    const scale = 1 + p * 8;
    const moveX = (0.5 * state.width - state.cx) * p;
    const moveY = (0.5 * state.height - state.cy) * p;
    macStage.style.transform =
      "translate(calc(-42vw + " + moveX + "px), calc(12vh + " + moveY + "px)) scale(" + scale + ")";
    macStage.style.opacity = String(1 - Math.max(0, p - 0.65) * 3);

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
    state.mousePx.x = state.width * 0.55;
    state.mousePx.y = state.height * 0.18;
    requestAnimationFrame(frame);
  }

  init();
})();

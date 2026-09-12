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
    macCenter: { x: 0, y: 0 },
    macSize: { w: 260, h: 310 },
  };

  const ASCII_RAMP = " .:-=+*#%@";
  const CELL = 9;
  let targetScroll = 0;
  const ENTER_AT = 0.92;
  const EXIT_AT = 0.88;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    const w = 260, h = 310;
    state.macSize = { w: w, h: h };
    state.macCenter.x = state.width * 0.09 + w * 0.45;
    state.macCenter.y = state.height - state.height * 0.11 - h * 0.42;
  }

  function onPointerMove(e) {
    const x = e.clientX || 0;
    const y = e.clientY || 0;
    state.mousePx.x = x;
    state.mousePx.y = y;
    state.mouse.x = state.width ? x / state.width : 0.5;
    state.mouse.y = state.height ? y / state.height : 0.5;

    if (state.scrollProgress < 0.5) {
      const rotX = (state.mouse.y - 0.5) * -34;
      const rotY = (state.mouse.x - 0.25) * 16;
      mac.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
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
    if (fade < 0.02) return;

    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    const lightX = state.mousePx.x;
    const lightY = state.mousePx.y;
    const mx = state.macCenter.x;
    const my = state.macCenter.y;
    const mw = state.macSize.w * 0.55;
    const mh = state.macSize.h * 0.55;

    const toMx = mx - lightX;
    const toMy = my - lightY;
    const mDist = Math.hypot(toMx, toMy) || 1;
    const dirX = toMx / mDist;
    const dirY = toMy / mDist;

    ctx.font = (CELL + 1) + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * CELL + CELL * 0.5;
        const cy = row * CELL + CELL * 0.5;

        if (cx > mx - mw && cx < mx + mw && cy > my - mh && cy < my + mh * 1.1) continue;

        const t = (cx - lightX) * dirX + (cy - lightY) * dirY;
        if (t < mDist * 0.85) continue;

        const rayX = lightX + dirX * t;
        const rayY = lightY + dirY * t;
        const perp = Math.hypot(cx - rayX, cy - rayY);
        const past = t - mDist;
        const shadowWidth = 30 + past * 0.38;
        if (perp > shadowWidth) continue;

        let strength = (1 - perp / shadowWidth) * Math.min(1, past / 110);
        strength = Math.max(0, strength) * fade;
        if (strength < 0.07) continue;

        const idx = Math.min(ASCII_RAMP.length - 1, Math.floor(strength * (ASCII_RAMP.length - 1)));
        const ch = ASCII_RAMP[idx];
        const a = 0.18 + strength * 0.72;
        const g = Math.floor(40 + strength * 180);
        ctx.fillStyle = "rgba(" + g + "," + g + "," + g + "," + a + ")";
        ctx.fillText(ch, cx, cy);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.1;
    const p = state.scrollProgress;

    if (scrollHint) scrollHint.classList.toggle("fade", p > 0.05);

    const scale = 1 + p * 7.2;
    const moveX = (0.5 * state.width - state.macCenter.x) * p * 0.98;
    const moveY = (0.5 * state.height - state.macCenter.y) * p * 0.98;
    macStage.style.transform = "translate(" + moveX + "px," + moveY + "px) scale(" + scale + ")";
    macStage.style.opacity = String(1 - Math.max(0, p - 0.7) * 3.2);

    if (p >= ENTER_AT) {
      outerWorld.classList.add("is-hidden");
      innerWorld.classList.add("is-active");
      document.body.style.cursor = "default";
    } else if (p <= EXIT_AT) {
      outerWorld.classList.remove("is-hidden");
      innerWorld.classList.remove("is-active");
      document.body.style.cursor = "crosshair";
    }

    if (p >= 0.5 && p < ENTER_AT) {
      const rotX = (state.mouse.y - 0.5) * -34 * (1 - p);
      const rotY = (state.mouse.x - 0.25) * 16 * (1 - p);
      mac.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
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

    state.mousePx.x = state.width * 0.65;
    state.mousePx.y = state.height * 0.32;
    state.mouse.x = 0.65;
    state.mouse.y = 0.32;

    requestAnimationFrame(frame);
  }

  init();
})();

(function () {
  "use strict";

  const outerWorld = document.getElementById("outer-world");
  const innerWorld = document.getElementById("inner-world");
  const canvas = document.getElementById("ascii-canvas");
  const ctx = canvas.getContext("2d");
  const tv = document.getElementById("tv");
  const tvStage = document.getElementById("tv-stage");
  const scrollHint = document.getElementById("scroll-hint");

  const state = {
    mouse: { x: 0.5, y: 0.5 },
    mousePx: { x: 0, y: 0 },
    scrollProgress: 0,
    entered: false,
    width: 0,
    height: 0,
    tvCenter: { x: 0, y: 0 },
    tvSize: { w: 240, h: 200 },
  };

  const ASCII_RAMP = ".:;+=xX$&#@";
  const CELL = 9;
  let targetScroll = 0;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    const tvW = 240, tvH = 200;
    state.tvSize = { w: tvW, h: tvH };
    state.tvCenter.x = state.width * 0.1 + tvW * 0.45;
    state.tvCenter.y = state.height - state.height * 0.12 - tvH * 0.45;
  }

  function onPointerMove(e) {
    const x = e.clientX ?? 0;
    const y = e.clientY ?? 0;
    state.mousePx.x = x;
    state.mousePx.y = y;
    state.mouse.x = state.width ? x / state.width : 0.5;
    state.mouse.y = state.height ? y / state.height : 0.5;

    if (!state.entered) {
      const rotX = (state.mouse.y - 0.5) * -36;
      const rotY = (state.mouse.x - 0.28) * 14;
      tv.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
    }
  }

  function onWheel(e) {
    if (state.entered) return;
    e.preventDefault();
    targetScroll += e.deltaY * 0.0015;
    targetScroll = Math.max(0, Math.min(1.2, targetScroll));
  }

  function enterInnerWorld() {
    if (state.entered) return;
    state.entered = true;
    targetScroll = 1.2;
    outerWorld.classList.add("is-hidden");
    innerWorld.classList.add("is-active");
    document.body.style.cursor = "default";
  }

  function drawAsciiFrame() {
    const w = state.width, h = state.height;
    if (w < 10 || h < 10) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    const lightX = state.mousePx.x;
    const lightY = state.mousePx.y;
    const tvX = state.tvCenter.x;
    const tvY = state.tvCenter.y;
    const tvW = state.tvSize.w * 0.72;
    const tvH = state.tvSize.h * 0.72;

    const toTvX = tvX - lightX;
    const toTvY = tvY - lightY;
    const tvDist = Math.hypot(toTvX, toTvY) || 1;
    const shadowDirX = toTvX / tvDist;
    const shadowDirY = toTvY / tvDist;

    ctx.font = (CELL + 1) + 'px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * CELL + CELL * 0.5;
        const cy = row * CELL + CELL * 0.5;

        if (cx > tvX - tvW * 0.55 && cx < tvX + tvW * 0.55 &&
            cy > tvY - tvH * 0.55 && cy < tvY + tvH * 0.65) continue;

        const toCellX = cx - lightX;
        const toCellY = cy - lightY;
        const t = toCellX * shadowDirX + toCellY * shadowDirY;
        if (t < tvDist * 0.85) continue;

        const rayX = lightX + shadowDirX * t;
        const rayY = lightY + shadowDirY * t;
        const perp = Math.hypot(cx - rayX, cy - rayY);
        const past = t - tvDist;
        const shadowWidth = 28 + past * 0.35;
        if (perp > shadowWidth) continue;

        let strength = (1 - perp / shadowWidth) * Math.min(1, past / 100);
        strength = Math.max(0, strength);
        if (strength < 0.06) continue;

        const idx = Math.min(ASCII_RAMP.length - 1, Math.floor(strength * (ASCII_RAMP.length - 1)));
        const ch = ASCII_RAMP[idx];
        const alpha = 0.2 + strength * 0.75;
        const g = 100 + Math.floor(strength * 120);
        ctx.fillStyle = "rgba(90," + g + ",110," + alpha + ")";
        ctx.fillText(ch, cx, cy);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.09;
    const p = state.scrollProgress;
    if (scrollHint) scrollHint.classList.toggle("fade", p > 0.06);

    if (!state.entered) {
      const scale = 1 + p * 6.5;
      const moveX = (0.5 * state.width - state.tvCenter.x) * p * 0.95;
      const moveY = (0.5 * state.height - state.tvCenter.y) * p * 0.95;
      const approachRot = p * -8;
      tvStage.style.transform = "translate(" + moveX + "px," + moveY + "px) scale(" + scale + ")";
      tvStage.style.opacity = String(1 - Math.max(0, p - 0.72) * 3.5);

      if (p > 0.15) {
        const baseRotX = (state.mouse.y - 0.5) * -36;
        const baseRotY = (state.mouse.x - 0.28) * 14;
        tv.style.transform = "rotateX(" + (baseRotX + approachRot) + "deg) rotateY(" + baseRotY + "deg)";
      }
    }

    if (p >= 1 && !state.entered) enterInnerWorld();
  }

  function frame() {
    if (!state.entered) {
      drawAsciiFrame();
      updateScrollVisuals();
    }
    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });

    tv.addEventListener("click", function (e) {
      e.preventDefault();
      enterInnerWorld();
    });
    tv.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enterInnerWorld();
      }
    });

    state.mousePx.x = state.width * 0.62;
    state.mousePx.y = state.height * 0.35;
    state.mouse.x = 0.62;
    state.mouse.y = 0.35;
    requestAnimationFrame(frame);
  }

  init();
})();

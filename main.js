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
    tvSize: { w: 220, h: 180 },
  };

  const ASCII_RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const CELL = 10;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    const tvW = 220;
    const tvH = 180;
    state.tvSize = { w: tvW, h: tvH };
    state.tvCenter.x = state.width * 0.12 + tvW * 0.5;
    state.tvCenter.y = state.height - state.height * 0.14 - tvH * 0.5;
  }

  function onPointerMove(e) {
    const x = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
    const y = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
    state.mousePx.x = x;
    state.mousePx.y = y;
    state.mouse.x = x / state.width;
    state.mouse.y = y / state.height;

    if (!state.entered) {
      const rotX = (state.mouse.y - 0.5) * -28;
      const rotY = (state.mouse.x - 0.35) * 8;
      tv.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }
  }

  let targetScroll = 0;

  function onWheel(e) {
    if (state.entered) return;
    e.preventDefault();
    targetScroll += e.deltaY * 0.0012;
    targetScroll = Math.max(0, Math.min(1.15, targetScroll));
  }

  function drawAsciiFrame() {
    const w = state.width;
    const h = state.height;
    if (w < 10 || h < 10) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);

    const lightX = state.mousePx.x;
    const lightY = state.mousePx.y;
    const tvX = state.tvCenter.x;
    const tvY = state.tvCenter.y;
    const tvW = state.tvSize.w;
    const tvH = state.tvSize.h;

    const maxDist = Math.hypot(w, h) * 0.55;

    ctx.font = `${CELL}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * CELL + CELL * 0.5;
        const cy = row * CELL + CELL * 0.5;

        if (
          cx > tvX - tvW * 0.55 &&
          cx < tvX + tvW * 0.55 &&
          cy > tvY - tvH * 0.55 &&
          cy < tvY + tvH * 0.6
        ) {
          continue;
        }

        const dxL = cx - lightX;
        const dyL = cy - lightY;
        const distLight = Math.hypot(dxL, dyL);
        let light = 1 - Math.min(1, distLight / maxDist);
        light = light * light;

        const toTvX = tvX - lightX;
        const toTvY = tvY - lightY;
        const toCellX = cx - lightX;
        const toCellY = cy - lightY;

        const dot = toTvX * toCellX + toTvY * toCellY;
        const tvDist = Math.hypot(toTvX, toTvY) || 1;
        const cellDist = Math.hypot(toCellX, toCellY) || 1;
        const proj = dot / (tvDist * cellDist);

        const shadowDirX = toTvX / tvDist;
        const shadowDirY = toTvY / tvDist;
        const t = Math.max(0, toCellX * shadowDirX + toCellY * shadowDirY);
        const rayX = lightX + shadowDirX * t;
        const rayY = lightY + shadowDirY * t;
        const perp = Math.hypot(cx - rayX, cy - rayY);

        const behind = t > tvDist * 0.7 && proj > 0.15;
        const shadowWidth = 40 + (t - tvDist) * 0.25;
        let shadow = 0;
        if (behind && perp < shadowWidth) {
          shadow = (1 - perp / shadowWidth) * Math.min(1, (t - tvDist) / 120);
          shadow = Math.max(0, shadow);
        }

        let intensity = light * (1 - shadow * 0.92);
        intensity = intensity * 0.85 + 0.02;

        if (shadow > 0.08) {
          intensity = Math.min(intensity, 0.15 + shadow * 0.55);
        }

        const idx = Math.floor(intensity * (ASCII_RAMP.length - 1));
        const ch = ASCII_RAMP[Math.max(0, Math.min(ASCII_RAMP.length - 1, idx))];

        if (ch === " ") continue;

        const g = 140 + Math.floor(intensity * 100);
        const a = 0.15 + intensity * 0.65;
        ctx.fillStyle = `rgba(120, ${g}, 140, ${a})`;
        ctx.fillText(ch, cx, cy);
      }
    }
  }

  function updateScrollVisuals() {
    state.scrollProgress += (targetScroll - state.scrollProgress) * 0.08;
    const p = state.scrollProgress;

    if (scrollHint) {
      scrollHint.classList.toggle("fade", p > 0.08);
    }

    if (p < 1) {
      const scale = 1 + p * 4.5;
      const moveX = (0.5 * state.width - state.tvCenter.x) * p * 0.85;
      const moveY = (0.5 * state.height - state.tvCenter.y) * p * 0.85;
      tvStage.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
      tvStage.style.opacity = String(1 - Math.max(0, p - 0.75) * 4);
    }

    if (p >= 1 && !state.entered) {
      enterInnerWorld();
    }
  }

  function enterInnerWorld() {
    state.entered = true;
    outerWorld.classList.add("is-hidden");
    innerWorld.classList.add("is-active");
    document.body.style.cursor = "default";
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

    state.mousePx.x = state.width * 0.55;
    state.mousePx.y = state.height * 0.45;
    state.mouse.x = 0.55;
    state.mouse.y = 0.45;

    requestAnimationFrame(frame);
  }

  init();
})();

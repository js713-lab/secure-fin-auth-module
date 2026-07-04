(() => {
  const TWO_PI = Math.PI * 2;

  function numberOption(element, key, fallback) {
    const value = Number(element.dataset[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function booleanOption(element, key, fallback) {
    const value = element.dataset[key];
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  function initDotField(root) {
    const options = {
      dotRadius: numberOption(root, 'dotRadius', 1.5),
      dotSpacing: numberOption(root, 'dotSpacing', 14),
      cursorRadius: numberOption(root, 'cursorRadius', 500),
      cursorForce: numberOption(root, 'cursorForce', 0.1),
      bulgeOnly: booleanOption(root, 'bulgeOnly', true),
      bulgeStrength: numberOption(root, 'bulgeStrength', 67),
      glowRadius: numberOption(root, 'glowRadius', 160),
      sparkle: booleanOption(root, 'sparkle', false),
      waveAmplitude: numberOption(root, 'waveAmplitude', 0),
      gradientFrom: root.dataset.gradientFrom || 'rgba(96, 165, 250, 0.5)',
      gradientTo: root.dataset.gradientTo || 'rgba(191, 219, 254, 0.18)',
      glowColor: root.dataset.glowColor || 'rgba(37, 99, 235, 0.22)',
    };

    const canvas = document.createElement('canvas');
    const glow = document.createElement('div');
    canvas.className = 'dot-field-canvas';
    glow.className = 'dot-field-glow';
    root.append(canvas, glow);

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dots = [];
    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    const size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
    let engagement = 0;
    let glowOpacity = 0;
    let frameCount = 0;
    let resizeTimer;
    let rafId;

    function buildDots(w, h) {
      dots.length = 0;
      const step = options.dotRadius + options.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots.push({ ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay });
        }
      }
    }

    function doResize() {
      const rect = root.getBoundingClientRect();
      size.w = rect.width;
      size.h = rect.height;
      size.offsetX = rect.left + window.scrollX;
      size.offsetY = rect.top + window.scrollY;
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots(size.w, size.h);
    }

    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }

    function onPointerMove(event) {
      mouse.x = event.pageX - size.offsetX;
      mouse.y = event.pageY - size.offsetY;
    }

    function updateMouseSpeed() {
      const dx = mouse.prevX - mouse.x;
      const dy = mouse.prevY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (dist - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }

    const speedInterval = setInterval(updateMouseSpeed, 20);

    function tick() {
      frameCount += 1;
      const targetEngagement = Math.min(mouse.speed / 5, 1);
      engagement += (targetEngagement - engagement) * 0.06;
      if (engagement < 0.001) engagement = 0;
      glowOpacity += (engagement - glowOpacity) * 0.08;

      glow.style.opacity = String(glowOpacity);
      glow.style.width = `${options.glowRadius * 2}px`;
      glow.style.height = `${options.glowRadius * 2}px`;
      glow.style.background = `radial-gradient(circle, ${options.glowColor}, transparent 68%)`;
      glow.style.transform = `translate(${mouse.x - options.glowRadius}px, ${mouse.y - options.glowRadius}px)`;

      ctx.clearRect(0, 0, size.w, size.h);
      const gradient = ctx.createLinearGradient(0, 0, size.w, size.h);
      gradient.addColorStop(0, options.gradientFrom);
      gradient.addColorStop(1, options.gradientTo);
      ctx.fillStyle = gradient;
      ctx.beginPath();

      const cursorRadiusSq = options.cursorRadius * options.cursorRadius;
      const radius = options.dotRadius / 2;
      const t = frameCount * 0.02;

      dots.forEach((dot, index) => {
        const dx = mouse.x - dot.ax;
        const dy = mouse.y - dot.ay;
        const distSq = dx * dx + dy * dy;

        if (distSq < cursorRadiusSq && engagement > 0.01) {
          const dist = Math.sqrt(distSq);
          if (options.bulgeOnly) {
            const influence = 1 - dist / options.cursorRadius;
            const push = influence * influence * options.bulgeStrength * engagement;
            const angle = Math.atan2(dy, dx);
            dot.sx += (dot.ax - Math.cos(angle) * push - dot.sx) * 0.15;
            dot.sy += (dot.ay - Math.sin(angle) * push - dot.sy) * 0.15;
          } else {
            const angle = Math.atan2(dy, dx);
            const move = (500 / Math.max(dist, 1)) * (mouse.speed * options.cursorForce);
            dot.vx += Math.cos(angle) * -move;
            dot.vy += Math.sin(angle) * -move;
          }
        } else if (options.bulgeOnly) {
          dot.sx += (dot.ax - dot.sx) * 0.1;
          dot.sy += (dot.ay - dot.sy) * 0.1;
        }

        if (!options.bulgeOnly) {
          dot.vx *= 0.9;
          dot.vy *= 0.9;
          dot.x = dot.ax + dot.vx;
          dot.y = dot.ay + dot.vy;
          dot.sx += (dot.x - dot.sx) * 0.1;
          dot.sy += (dot.y - dot.sy) * 0.1;
        }

        let drawX = dot.sx;
        let drawY = dot.sy;
        if (options.waveAmplitude > 0) {
          drawY += Math.sin(dot.ax * 0.03 + t) * options.waveAmplitude;
          drawX += Math.cos(dot.ay * 0.03 + t * 0.7) * options.waveAmplitude * 0.5;
        }

        const hash = ((index * 2654435761) ^ (frameCount >> 3)) >>> 0;
        const drawRadius = options.sparkle && hash % 100 < 3 ? radius * 1.8 : radius;
        ctx.moveTo(drawX + drawRadius, drawY);
        ctx.arc(drawX, drawY, drawRadius, 0, TWO_PI);
      });

      ctx.fill();
      rafId = requestAnimationFrame(tick);
    }

    doResize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(rafId);
      clearInterval(speedInterval);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
    });
  }

  document.querySelectorAll('.dot-field').forEach(initDotField);
})();

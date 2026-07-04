const MAX_COLORS = 8;

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

uniform vec3  uMouseColor;
uniform vec2  uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uTurbulence;
uniform float uFluidity;
uniform float uRimWidth;
uniform float uSharpness;
uniform float uShimmer;
uniform float uGlow;
uniform float uOpacity;
uniform float uMouseEnabled;
uniform float uMouseStrength;
uniform float uMouseRadius;

varying vec2 vUv;

#define PI 3.14159265

vec3 palette(float h) {
  int count = uColorCount;
  if (count < 1) count = 1;
  int idx = int(floor(clamp(h, 0.0, 0.999999) * float(count)));
  if (idx <= 0) return uColor0;
  if (idx == 1) return uColor1;
  if (idx == 2) return uColor2;
  if (idx == 3) return uColor3;
  if (idx == 4) return uColor4;
  if (idx == 5) return uColor5;
  if (idx == 6) return uColor6;
  return uColor7;
}

float hash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smin(float a, float b, float k) {
  float r = exp2(-a / k) + exp2(-b / k);
  return -k * log2(r);
}

float sinlerp(float a, float b, float w) {
  return mix(a, b, (sin(w * PI - PI / 2.0) + 1.0) / 2.0);
}

float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s);
  vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed));
  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));
  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));
  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s);
  float tx = sinlerp(g4, g3, relp.x / s);
  return sinlerp(bx, tx, relp.y / s);
}

float dbn(vec2 p, float s, float seed) {
  float o = s / 2.0;
  float n0 = vn(p, s, seed);
  float n1 = vn(p + vec2(o, o), s, seed + 0.1);
  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);
  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);
  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);
  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float ref = 700.0 / max(uScale, 0.05);
  vec2 p = fragCoord / iResolution.y * ref;

  float spd = 200.0 * uSpeed;
  float t = iTime;

  vec2 dir = uFlow;
  vec2 perp = vec2(-dir.y, dir.x);

  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;
  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;

  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);
  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);

  float mapeaks = smin(peaks, peaks2, max(uFluidity, 0.001));

  float mGlow = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mp = iMouse / iResolution.y * ref;
    float md = length(p - mp) / ref;
    float rr = max(uMouseRadius, 0.02);
    mGlow = exp(-md * md / (rr * rr)) * uMouseStrength;
  }

  float band = (uRimWidth - abs((mapeaks - 0.4) * 2.0)) * 5.0;
  float ltn = clamp(band - vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer, 0.0, 1.0);
  ltn = pow(ltn, uSharpness) * uGlow;
  ltn *= clamp(1.0 - mGlow, 0.0, 1.0);

  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 col = palette(h);

  vec3 outc = col * ltn;
  float a = clamp(max(outc.r, max(outc.g, outc.b)), 0.0, 1.0);
  fragColor = vec4(outc, a * uOpacity);
}

void main() {
  vec4 color;
  mainImage(color, vUv * iResolution.xy);
  gl_FragColor = color;
}
`;

function reportClientError(source, error) {
  fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      message: error?.message || String(error),
      detail: error?.stack || '',
    }),
  }).catch(() => {});
}

function hexToRGB(hex) {
  const c = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  ];
}

function prepColors(input) {
  const base = (input?.length ? input : ['#ffffff', '#ffffff', '#ffffff']).slice(0, MAX_COLORS);
  const count = base.length;
  const arr = [];
  for (let i = 0; i < MAX_COLORS; i += 1) {
    arr.push(hexToRGB(base[Math.min(i, base.length - 1)]));
  }
  const avg = [0, 0, 0];
  for (let i = 0; i < count; i += 1) {
    avg[0] += arr[i][0];
    avg[1] += arr[i][1];
    avg[2] += arr[i][2];
  }
  avg[0] /= count;
  avg[1] /= count;
  avg[2] /= count;
  return { arr, count, avg };
}

function flowVec(direction) {
  switch (direction) {
    case 'up':
      return [0, 1];
    case 'down':
      return [0, -1];
    case 'left':
      return [-1, 0];
    case 'right':
      return [1, 0];
    default:
      return [0, -1];
  }
}

function readNumber(el, key, fallback) {
  const value = Number(el.dataset[key]);
  return Number.isFinite(value) ? value : fallback;
}

function readBool(el, key, fallback) {
  const value = el.dataset[key];
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function readColors(el) {
  if (!el.dataset.colors) return ['#ffffff', '#ffffff', '#ffffff'];
  return el.dataset.colors.split(',').map((c) => c.trim()).filter(Boolean);
}

function initFerrofluid(container, { Renderer, Program, Mesh, Triangle }) {
  const options = {
    colors: readColors(container),
    speed: readNumber(container, 'speed', 0.5),
    scale: readNumber(container, 'scale', 1),
    turbulence: readNumber(container, 'turbulence', 1),
    fluidity: readNumber(container, 'fluidity', 0.1),
    rimWidth: readNumber(container, 'rimWidth', 0.2),
    sharpness: readNumber(container, 'sharpness', 3),
    shimmer: readNumber(container, 'shimmer', 1),
    glow: readNumber(container, 'glow', 2),
    flowDirection: container.dataset.flowDirection || 'down',
    opacity: readNumber(container, 'opacity', 1),
    mouseInteraction: readBool(container, 'mouseInteraction', true),
    mouseStrength: readNumber(container, 'mouseStrength', 1),
    mouseRadius: readNumber(container, 'mouseRadius', 0.3),
    mouseDampening: readNumber(container, 'mouseDampening', 0.15),
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };

  const renderer = new Renderer({
    dpr: options.dpr,
    alpha: true,
    antialias: true,
  });
  const gl = renderer.gl;
  const canvas = gl.canvas;
  gl.clearColor(0, 0, 0, 0);
  canvas.className = 'ferrofluid-canvas';
  container.appendChild(canvas);

  const { arr, count, avg } = prepColors(options.colors);
  const uniforms = {
    iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] },
    iMouse: { value: [0, 0] },
    iTime: { value: 0 },
    uColor0: { value: arr[0] },
    uColor1: { value: arr[1] },
    uColor2: { value: arr[2] },
    uColor3: { value: arr[3] },
    uColor4: { value: arr[4] },
    uColor5: { value: arr[5] },
    uColor6: { value: arr[6] },
    uColor7: { value: arr[7] },
    uColorCount: { value: count },
    uMouseColor: { value: avg },
    uFlow: { value: flowVec(options.flowDirection) },
    uSpeed: { value: options.speed },
    uScale: { value: options.scale },
    uTurbulence: { value: options.turbulence },
    uFluidity: { value: options.fluidity },
    uRimWidth: { value: options.rimWidth },
    uSharpness: { value: options.sharpness },
    uShimmer: { value: options.shimmer },
    uGlow: { value: options.glow },
    uOpacity: { value: options.opacity },
    uMouseEnabled: { value: options.mouseInteraction ? 1 : 0 },
    uMouseStrength: { value: options.mouseStrength },
    uMouseRadius: { value: options.mouseRadius },
  };

  const program = new Program(gl, { vertex, fragment, uniforms });
  const geometry = new Triangle(gl);
  const mesh = new Mesh(gl, { geometry, program });

  const mouseTarget = [0, 0];
  let lastTime = 0;
  let rafId = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1];
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const sc = renderer.dpr || 1;
    const x = (event.clientX - rect.left) * sc;
    const y = (rect.height - (event.clientY - rect.top)) * sc;
    mouseTarget[0] = x;
    mouseTarget[1] = y;
    if (options.mouseDampening <= 0) {
      uniforms.iMouse.value = [x, y];
    }
  }

  if (options.mouseInteraction) {
    canvas.addEventListener('pointermove', onPointerMove);
  }

  function loop(time) {
    rafId = requestAnimationFrame(loop);
    uniforms.iTime.value = time * 0.001;

    if (options.mouseDampening > 0) {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const tau = Math.max(1e-4, options.mouseDampening);
      let factor = 1 - Math.exp(-dt / tau);
      if (factor > 1) factor = 1;
      const cur = uniforms.iMouse.value;
      cur[0] += (mouseTarget[0] - cur[0]) * factor;
      cur[1] += (mouseTarget[1] - cur[1]) * factor;
    } else {
      lastTime = time;
    }

    try {
      renderer.render({ scene: mesh });
    } catch (err) {
      cancelAnimationFrame(rafId);
      reportClientError('ferrofluid.render', err);
    }
  }

  rafId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafId);
    if (options.mouseInteraction) canvas.removeEventListener('pointermove', onPointerMove);
    ro.disconnect();
    if (canvas.parentElement === container) container.removeChild(canvas);
    program.remove?.();
    geometry.remove?.();
    mesh.remove?.();
    renderer.destroy?.();
  };
}

async function boot() {
  try {
    const ogl = await import('/vendor/ogl/index.js');
    document.querySelectorAll('[data-ferrofluid]').forEach((el) => {
      try {
        initFerrofluid(el, ogl);
      } catch (err) {
        reportClientError('ferrofluid.init', err);
      }
    });
  } catch (err) {
    reportClientError('ferrofluid.import', err);
  }
}

boot();

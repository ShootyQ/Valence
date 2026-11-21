import { advance, height, launch, levels, maxPull, maxSpeed, step, width } from './physics.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('space');
const ctx = canvas.getContext('2d');
const ink = '#ffdba2';
const mint = '#9bf0d5';
const outcomes = {
  impact: 'The probe hit a moon. Aim farther around it.',
  escaped: 'The probe drifted out of range. Try a different angle or power.',
  timeout: 'The probe is still in orbit. Try a different launch.',
};

let levelIndex = 0;
let level = levels[0];
let shots = 0;
let state = 'ready';
let probe = null;
let drag = null;
let aim = null;
let trail = [];
let preview = [];
let previousTime = null;
let animationFrame;
let accumulator = 0;
let ticks = 0;

function reset(index) {
  levelIndex = index;
  level = levels[index];
  shots = 0;
  byId('level-name').textContent = level.name;
  byId('level-number').textContent = 'LEVEL ' + (index + 1) + ' / ' + levels.length;
  byId('shots').textContent = 'SHOTS 0';
  ready();
}

function ready() {
  cancelAnimationFrame(animationFrame);
  state = 'ready';
  probe = null;
  drag = null;
  trail = [];
  byId('next').hidden = true;
  byId('status').textContent = 'Pull back the probe and release.';
  setAim(null);
  render();
}

function setAim(value) {
  aim = value;
  preview = [];
  byId('power').textContent = '';
  if (!value) return;
  byId('power').textContent = 'POWER ' + Math.round(value.speed * 100 / maxSpeed) + '%';
  if (value.speed < 14) return;
  const projected = makeProbe(value);
  for (let i = 0; i < 120; i++) {
    const result = advance(projected, level);
    if (i % 8 === 0) preview.push({x: projected.x, y: projected.y});
    if (result) break;
  }
}

function makeProbe({angle, speed}) {
  return launch(level.start, Math.cos(angle) * speed, Math.sin(angle) * speed);
}

function fire() {
  if (state === 'flying' || state === 'hit' || !aim || aim.speed < 14) {
    setAim(null);
    render();
    return;
  }
  probe = makeProbe(aim);
  setAim(null);
  state = 'flying';
  trail = [level.start];
  ticks = 0;
  previousTime = null;
  accumulator = 0;
  byId('shots').textContent = 'SHOTS ' + (++shots);
  byId('status').textContent = 'Probe in flight.';
  animationFrame = requestAnimationFrame(frame);
}

function frame(timestamp) {
  if (state !== 'flying') return;
  if (previousTime !== null) accumulator += Math.min(.08, (timestamp - previousTime) / 1000);
  previousTime = timestamp;
  while (accumulator >= step) {
    accumulator -= step;
    const result = advance(probe, level);
    if (++ticks % 5 === 0 || result) trail.push({x: probe.x, y: probe.y});
    if (result) {
      state = result;
      if (result === 'hit') {
        const last = levelIndex === levels.length - 1;
        byId('status').textContent = last ? 'Target reached. All levels complete!' : 'Target reached!';
        byId('next').textContent = last ? 'Play again' : 'Next level';
        byId('next').hidden = false;
      } else {
        byId('status').textContent = outcomes[result];
      }
      break;
    }
  }
  render();
  if (state === 'flying') animationFrame = requestAnimationFrame(frame);
}

const sky = document.createElement('canvas');
sky.width = canvas.width;
sky.height = canvas.height;
const background = sky.getContext('2d');
background.scale(2, 2);
const nebula = background.createRadialGradient(456, 244, 0, 456, 244, 460);
nebula.addColorStop(0, '#241633');
nebula.addColorStop(1, '#0b0a16');
background.fillStyle = nebula;
background.fillRect(0, 0, width, height);
for (let i = 0; i < 185; i++) {
  const x = ((i * 631 + i * i * 17) % 899);
  const y = ((i * 269 + i * i * 11) % 517);
  background.fillStyle = i % 7 === 0 ? '#baa9dc9c' : '#baabd744';
  background.fillRect(x, y, i % 7 === 0 ? 1.9 : 1.1, i % 7 === 0 ? 1.9 : 1.1);
}
ctx.scale(2, 2);

function circle(x, y, radius, color, lineWidth = 0) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  if (lineWidth) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function line(points, color, weight) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.stroke();
}

function label(text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = '600 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function drawMoon({x, y, radius, color}) {
  for (const size of [1.34, 1.69, 2.08]) circle(x, y, radius * size, '#c8a4ed24', 1);
  const surface = ctx.createRadialGradient(x - radius * .40, y - radius * .46, 3, x, y, radius * 1.13);
  surface.addColorStop(0, color);
  surface.addColorStop(.63, '#67518a');
  surface.addColorStop(1, '#2a203b');
  circle(x, y, radius, surface);
  for (const [dx, dy, size] of [[-.42,-.20,.20],[.17,.27,.26],[.38,-.38,.13],[-.51,.39,.10],[.65,.16,.085]]) {
    circle(x + dx * radius, y + dy * radius, size * radius, '#24163338');
    circle(x + dx * radius, y + dy * radius, size * radius, '#d4baec38', 1);
  }
  circle(x, y, radius, '#dfc3ff7a', 1.2);
}

function render() {
  ctx.drawImage(sky, 0, 0, width, height);
  for (const body of level.bodies) drawMoon(body);
  const {x, y, radius} = level.target;
  circle(x, y, radius + 10, '#9bf0d534', 1);
  circle(x, y, radius, state === 'hit' ? '#9bf0d550' : '#143238');
  circle(x, y, radius, mint, 2);
  circle(x, y, 4, mint);
  label('TARGET', x, y + radius + 29, mint);

  const start = level.start;
  circle(start.x, start.y, 22, '#ffdba260', 1.2);
  circle(start.x, start.y, 30, '#ffdba225', 1);
  label('PROBE', start.x, start.y + 50, ink);
  line(trail, '#ffdba28e', 2);
  for (const [i, point] of preview.entries()) circle(point.x, point.y, 2.65, i < 7 ? '#ffdba2b0' : '#ffdba255');
  if (aim) {
    const distance = aim.speed * maxPull / maxSpeed;
    const end = {x: start.x - Math.cos(aim.angle) * distance, y: start.y - Math.sin(aim.angle) * distance};
    line([start, end], '#ffdba2b0', 2);
    circle(end.x, end.y, 4, '#ffdba2');
  }
  if (probe && canAim()) circle(start.x, start.y, 6, ink);
  const position = probe || start;
  circle(position.x, position.y, 11, '#ffdba24a');
  circle(position.x, position.y, 6, ink);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height};
}

function canAim() {
  return state !== 'flying' && state !== 'hit';
}

function aimAt(point) {
  const dx = level.start.x - point.x;
  const dy = level.start.y - point.y;
  setAim({angle: Math.atan2(dy, dx), speed: Math.min(maxPull, Math.hypot(dx, dy)) * maxSpeed / maxPull});
  render();
}

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || drag !== null || !canAim()) return;
  const point = canvasPoint(event);
  if (Math.hypot(point.x - level.start.x, point.y - level.start.y) > 48) return;
  canvas.setPointerCapture(event.pointerId);
  canvas.focus({preventScroll: true});
  drag = event.pointerId;
  probe = null;
  trail = [];
  byId('status').textContent = 'Release to launch.';
  aimAt(level.start);
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId === drag) aimAt(canvasPoint(event));
});
canvas.addEventListener('pointerup', event => {
  if (event.pointerId !== drag) return;
  aimAt(canvasPoint(event));
  drag = null;
  if (aim.speed >= 14) fire();
  else ready();
});
canvas.addEventListener('lostpointercapture', event => {
  if (event.pointerId === drag) ready();
});
canvas.addEventListener('keydown', event => {
  if (!canAim() || drag !== null) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
  event.preventDefault();
  if (!aim) setAim({angle: 0, speed: 280});
  if (event.key === ' ') return fire();
  const next = {...aim};
  if (event.key === 'ArrowLeft') next.angle -= Math.PI / 90;
  if (event.key === 'ArrowRight') next.angle += Math.PI / 90;
  if (event.key === 'ArrowUp') next.speed = Math.min(maxSpeed, next.speed + 8);
  if (event.key === 'ArrowDown') next.speed = Math.max(16, next.speed - 8);
  probe = null;
  trail = [];
  setAim(next);
  byId('status').textContent = 'Press Space to launch.';
  render();
});

byId('next').addEventListener('click', () => {
  reset((levelIndex + 1) % levels.length);
  canvas.focus();
});
byId('restart').addEventListener('click', () => {
  reset(levelIndex);
  canvas.focus();
});
reset(0);

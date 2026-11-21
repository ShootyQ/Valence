export const width = 900;
export const height = 520;
export const step = 1 / 180;
export const maxSpeed = 415;
export const maxPull = 128;

export const levels = [
  {
    name: 'Lunar Flyby',
    start: {x: 184, y: 285},
    target: {x: 726, y: 272, radius: 22},
    bodies: [{x: 454, y: 282, radius: 68, mu: 2300000, color: '#ae91f3'}],
  },
  {
    name: 'Low Orbit',
    start: {x: 174, y: 345},
    target: {x: 701, y: 188, radius: 20},
    bodies: [{x: 454, y: 270, radius: 78, mu: 2950000, color: '#f69e84'}],
  },
  {
    name: 'Twin Moons',
    start: {x: 171, y: 270},
    target: {x: 740, y: 275, radius: 19},
    bodies: [
      {x: 390, y: 218, radius: 59, mu: 1450000, color: '#98a9ff'},
      {x: 562, y: 335, radius: 49, mu: 1100000, color: '#e49dbb'},
    ],
  },
];

function acceleration(x, y, bodies) {
  let ax = 0;
  let ay = 0;
  for (const body of bodies) {
    const dx = body.x - x;
    const dy = body.y - y;
    const distance = Math.max(body.radius, Math.hypot(dx, dy));
    const factor = body.mu / distance ** 3;
    ax += dx * factor;
    ay += dy * factor;
  }
  return {ax, ay};
}

export function launch(start, vx, vy) {
  return {...start, vx, vy, age: 0};
}

export function advance(probe, level) {
  // Velocity Verlet uses gravity at both ends of the fixed timestep.
  const before = acceleration(probe.x, probe.y, level.bodies);
  probe.x += probe.vx * step + before.ax * step ** 2 / 2;
  probe.y += probe.vy * step + before.ay * step ** 2 / 2;
  const after = acceleration(probe.x, probe.y, level.bodies);
  probe.vx += (before.ax + after.ax) * step / 2;
  probe.vy += (before.ay + after.ay) * step / 2;
  probe.age += step;

  for (const body of level.bodies) {
    if (Math.hypot(probe.x - body.x, probe.y - body.y) <= body.radius + 6) return 'impact';
  }
  const target = level.target;
  if (Math.hypot(probe.x - target.x, probe.y - target.y) <= target.radius) return 'hit';
  if (probe.x < -28 || probe.x > width + 28 || probe.y < -28 || probe.y > height + 28) return 'escaped';
  if (probe.age >= 14) return 'timeout';
  return null;
}

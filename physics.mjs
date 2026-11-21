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
    bodies: [{x: 454, y: 282, radius: 68, mu: 3795000, color: '#ae91f3'}],
  },
  {
    name: 'Low Orbit',
    start: {x: 174, y: 345},
    target: {x: 701, y: 188, radius: 20},
    bodies: [{x: 454, y: 270, radius: 78, mu: 4867500, color: '#f69e84'}],
  },
  {
    name: 'Twin Moons',
    start: {x: 171, y: 270},
    target: {x: 740, y: 275, radius: 19},
    bodies: [
      {x: 390, y: 218, radius: 59, mu: 2392500, color: '#98a9ff'},
      {x: 562, y: 335, radius: 49, mu: 1815000, color: '#e49dbb'},
    ],
  },
  {
    name: 'South Pass',
    start: {x: 165, y: 219},
    target: {x: 730, y: 312, radius: 23},
    bodies: [{x: 448, y: 267, radius: 82, mu: 4600000, color: '#f3b27c'}],
  },
  {
    name: 'Return Arc',
    start: {x: 730, y: 332},
    target: {x: 171, y: 219, radius: 23},
    bodies: [{x: 444, y: 264, radius: 74, mu: 4570000, color: '#8fceb8'}],
  },
  {
    name: 'High Pass',
    start: {x: 166, y: 237},
    target: {x: 735, y: 176, radius: 21},
    bodies: [
      {x: 446, y: 211, radius: 70, mu: 3980000, color: '#b18cff'},
      {x: 558, y: 390, radius: 45, mu: 1400000, color: '#efc17a'},
    ],
  },
  {
    name: 'Bottleneck',
    start: {x: 169, y: 257},
    target: {x: 725, y: 292, radius: 24},
    bodies: [
      {x: 450, y: 185, radius: 59, mu: 2310000, color: '#eda9c7'},
      {x: 450, y: 331, radius: 58, mu: 2550000, color: '#8ca8ff'},
    ],
  },
  {
    name: 'Gravity Staircase',
    start: {x: 161, y: 339},
    target: {x: 729, y: 179, radius: 22},
    bodies: [
      {x: 357, y: 292, radius: 53, mu: 1920000, color: '#f5a67e'},
      {x: 523, y: 230, radius: 57, mu: 2580000, color: '#a69bed'},
    ],
  },
  {
    name: 'Heavyweight',
    start: {x: 154, y: 267},
    target: {x: 749, y: 264, radius: 24},
    bodies: [{x: 450, y: 259, radius: 87, mu: 6800000, color: '#ef9a8d'}],
  },
  {
    name: 'Triple Transit',
    start: {x: 151, y: 274},
    target: {x: 762, y: 300, radius: 23},
    bodies: [
      {x: 331, y: 210, radius: 42, mu: 1560000, color: '#95acff'},
      {x: 468, y: 332, radius: 49, mu: 2110000, color: '#f3adcc'},
      {x: 607, y: 204, radius: 42, mu: 1400000, color: '#9edbc9'},
    ],
  },
  {
    name: 'Polar Drop',
    start: {x: 432, y: 137},
    target: {x: 463, y: 419, radius: 21},
    bodies: [
      {x: 443, y: 270, radius: 64, mu: 3510000, color: '#a9bafb'},
      {x: 627, y: 301, radius: 43, mu: 1240000, color: '#eeb179'},
    ],
  },
  {
    name: 'Switchback',
    start: {x: 723, y: 223},
    target: {x: 175, y: 327, radius: 22},
    bodies: [
      {x: 565, y: 237, radius: 53, mu: 2130000, color: '#9ed6f3'},
      {x: 410, y: 341, radius: 52, mu: 2280000, color: '#ca96f6'},
      {x: 289, y: 197, radius: 40, mu: 1190000, color: '#f39688'},
    ],
  },
  {
    name: 'The Grand Tour',
    start: {x: 149, y: 300},
    target: {x: 763, y: 238, radius: 19},
    bodies: [
      {x: 318, y: 247, radius: 48, mu: 1780000, color: '#a4bbff'},
      {x: 472, y: 327, radius: 60, mu: 3200000, color: '#f1ae7b'},
      {x: 627, y: 217, radius: 50, mu: 2070000, color: '#c693ef'},
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

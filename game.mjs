import { elements, recipes, connects, matches, canBond } from './chemistry.mjs';

const byId = id => document.getElementById(id);
const board = byId('board');
const atomLayer = byId('atoms');
const bondLayer = byId('bonds');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const saveKey = 'valence-orders-v1';
const positions = [[.32,.38],[.68,.62],[.70,.34],[.29,.67],[.49,.24]];
let progress = 0;
try {
  const saved = Number(localStorage.getItem(saveKey));
  if (Number.isInteger(saved)) progress = Math.max(0, Math.min(recipes.length, saved));
} catch {}
let mode = 'orders';
let bondMode = 1;
let atoms = [];
let bonds = [];
let history = [];
let nextId = 0;
let selected = null;
let drag = null;
let time = 0;
const bondNodes = new Map();

function announce(message) {
  byId('status').textContent = message;
}

function makeAtom(symbol, x, y) {
  return {id: ++nextId, symbol, x, y};
}

function seed() {
  const recipe = recipes[progress];
  atoms = recipe ? [recipe.center, ...Array(recipe.count).fill(recipe.outer)]
    .map((symbol, index) => makeAtom(symbol, ...positions[index])) : [];
  bonds = [];
  history = [];
  selected = null;
  setBondMode(1);
  sync();
}

function remember() {
  history.push(structuredClone({atoms, bonds}));
  if (history.length > 60) history.shift();
}

function setBondMode(value) {
  bondMode = value;
  ['break', 'single', 'double'].forEach((id, index) => {
    byId(id).setAttribute('aria-pressed', index === value);
  });
}

function sync() {
  const live = new Set(atoms.map(atom => String(atom.id)));
  for (const node of atomLayer.children) {
    if (!live.has(node.dataset.atom)) node.hidden = true;
  }
  atomLayer.querySelectorAll('[hidden]').forEach(node => node.remove());
  for (const atom of atoms) {
    let node = byId('atom-' + atom.id);
    if (!node) {
      node = document.createElement('button');
      node.type = 'button';
      node.id = 'atom-' + atom.id;
      node.className = 'atom';
      node.dataset.atom = atom.id;
      node.textContent = atom.symbol;
      node.setAttribute('aria-label', elements[atom.symbol].name + ' atom ' + atom.id);
      node.style.setProperty('--atom', elements[atom.symbol].color);
      atomLayer.append(node);
    }
    node.classList.toggle('selected', atom.id === selected);
    node.setAttribute('aria-pressed', atom.id === selected);
  }
  bondNodes.clear();
  bondLayer.replaceChildren();
  for (const bond of bonds) {
    const node = document.createElement('div');
    node.className = bond.order === 2 ? 'bond double' : 'bond';
    bondLayer.append(node);
    bondNodes.set(bond, node);
  }
  byId('undo').disabled = history.length === 0;
  byId('clear').disabled = atoms.length === 0;
  byId('empty').hidden = atoms.length > 0;
  paint();
}

function drawSidebar() {
  const unlocked = progress === recipes.length;
  byId('sandbox-mode').disabled = !unlocked;
  byId('lock').hidden = unlocked;
  byId('orders-mode').setAttribute('aria-pressed', mode === 'orders');
  byId('sandbox-mode').setAttribute('aria-pressed', mode === 'sandbox');
  byId('counter').textContent = progress + ' / ' + recipes.length + ' FILLED';
  byId('elements').replaceChildren(...Object.entries(elements).map(([symbol, element]) => {
    const button = document.createElement('button');
    button.className = 'element';
    button.disabled = progress < element.unlock;
    button.setAttribute('aria-label', button.disabled ? element.name + ' locked' : 'Add ' + element.name);
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.setProperty('--atom', element.color);
    swatch.textContent = symbol;
    const label = document.createElement('small');
    label.textContent = element.name;
    button.append(swatch, label);
    button.addEventListener('click', () => addAtom(symbol));
    return button;
  }));
  const recipe = recipes[progress];
  const order = byId('order');
  if (mode === 'sandbox') {
    order.innerHTML = '<div class="order-card"><p class="eyebrow">SANDBOX</p><h3>Free build</h3><p>Use the atom tray and bond controls to build your own molecules.</p></div>';
  } else if (recipe) {
    order.innerHTML = `<div class="order-card"><p class="eyebrow">CURRENT ORDER</p><p class="formula">${recipe.formula}</p><h3>${recipe.name}</h3><p>${recipe.hint}</p><button class="submit" id="submit">Submit molecule</button></div>`;
    byId('submit').addEventListener('click', submit);
  } else {
    order.innerHTML = '<div class="order-card"><p class="eyebrow">ORDERS COMPLETE</p><h3>Sandbox unlocked</h3><p>All three elements are available for free building.</p><button class="submit" id="open-sandbox">Open sandbox</button></div>';
    byId('open-sandbox').addEventListener('click', () => switchMode('sandbox'));
  }
  byId('recipes').replaceChildren(...recipes.map((item, index) => {
    const row = document.createElement('li');
    if (index === progress && mode === 'orders') row.setAttribute('aria-current', 'true');
    row.innerHTML = `<strong>${item.formula}</strong><span>${item.name}</span><span>${index < progress ? 'Filled' : index === progress ? 'Active' : 'Queued'}</span>`;
    return row;
  }));
}

function addAtom(symbol) {
  if (atoms.length >= 24) return announce('The workbench holds up to 24 atoms. Clear it or undo a move to make room.');
  remember();
  const spots = [...positions, ...Array.from({length: 24}, (_, i) => [
    .12 + (i % 6) * .15, .17 + Math.floor(i / 6) * .22,
  ])];
  const [x, y] = spots.find(([x, y]) => atoms.every(atom => Math.hypot(atom.x - x, atom.y - y) > .095)) || [.5,.5];
  atoms.push(makeAtom(symbol, x, y));
  sync();
  announce(elements[symbol].name + ' added.');
}

function bondAtoms(a, b, record = true) {
  const previous = bonds.find(bond => connects(bond, a.id, b.id));
  if (bondMode === 0) {
    if (!previous) return announce('These atoms have no bond to break.');
    if (record) remember();
    bonds = bonds.filter(bond => bond !== previous);
    return announce('Bond removed.');
  }
  if (previous?.order === bondMode) return announce('This bond is already in place.');
  if (!canBond(a, b, bondMode, bonds)) return announce('That bond exceeds an atom’s valence. Try a lower bond order or break a bond.');
  if (record) remember();
  if (previous) previous.order = bondMode;
  else bonds.push({a: a.id, b: b.id, order: bondMode});
  announce(bondMode === 2 ? 'Double bond formed.' : 'Single bond formed.');
}

function selectAtom(atom) {
  const first = atoms.find(item => item.id === selected);
  selected = !first ? atom.id : null;
  if (first && first !== atom) bondAtoms(first, atom);
  if (selected) announce('Select a second atom.');
  sync();
}

function submit() {
  const recipe = recipes[progress];
  if (!matches(recipe, atoms, bonds)) {
    return announce('This assembly does not match ' + recipe.formula + '. ' + recipe.hint);
  }
  progress += 1;
  try { localStorage.setItem(saveKey, String(progress)); } catch {}
  const unlock = Object.values(elements).find(element => element.unlock === progress);
  announce(recipe.name + ' order filled. ' + (unlock ? unlock.name + ' unlocked.' : progress === recipes.length ? 'Sandbox unlocked.' : ''));
  seed();
  drawSidebar();
}

function switchMode(next) {
  if (next === mode || (next === 'sandbox' && progress < recipes.length)) return;
  mode = next;
  seed();
  drawSidebar();
  announce(next === 'sandbox' ? 'Sandbox open.' : 'Orders open.');
}

function point(atom) {
  const linked = bonds.some(bond => bond.a === atom.id || bond.b === atom.id);
  const drift = reducedMotion.matches || linked || drag?.atom === atom || selected === atom.id ? 0 : 8;
  return [
    atom.x * board.clientWidth + Math.sin(time / 1250 + atom.id * 2) * drift,
    atom.y * board.clientHeight + Math.cos(time / 1550 + atom.id * 2) * drift,
  ];
}

function paint() {
  const points = new Map(atoms.map(atom => [atom.id, point(atom)]));
  for (const [id, [x, y]] of points) {
    const node = byId('atom-' + id);
    node.style.left = x + 'px';
    node.style.top = y + 'px';
  }
  for (const [bond, node] of bondNodes) {
    const [x, y] = points.get(bond.a);
    const [tx, ty] = points.get(bond.b);
    node.style.left = x + 'px';
    node.style.top = y - (bond.order === 2 ? 5.5 : 2.5) + 'px';
    node.style.width = Math.hypot(tx - x, ty - y) + 'px';
    node.style.transform = 'rotate(' + Math.atan2(ty - y, tx - x) + 'rad)';
  }
}

function frame(timestamp) {
  time = timestamp;
  paint();
  requestAnimationFrame(frame);
}

function atomFrom(target) {
  return atoms.find(atom => atom.id === Number(target.closest('[data-atom]')?.dataset.atom));
}

atomLayer.addEventListener('click', event => {
  if (event.detail !== 0) return;
  const atom = atomFrom(event.target);
  if (atom) selectAtom(atom);
});

atomLayer.addEventListener('pointerdown', event => {
  if (drag || event.button !== 0) return;
  const atom = atomFrom(event.target);
  if (!atom) return;
  const [x, y] = point(atom);
  const rect = board.getBoundingClientRect();
  drag = {atom, pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
    offsetX: event.clientX - rect.left - x, offsetY: event.clientY - rect.top - y, moved: false};
  event.target.setPointerCapture(event.pointerId);
});

function moveAtom(atom, x, y) {
  atom.x = Math.max(33, Math.min(board.clientWidth - 33, x)) / board.clientWidth;
  atom.y = Math.max(33, Math.min(board.clientHeight - 33, y)) / board.clientHeight;
}

atomLayer.addEventListener('pointermove', event => {
  if (!drag || drag.pointer !== event.pointerId) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
  if (!drag.moved) {
    remember();
    drag.moved = true;
    selected = null;
  }
  const rect = board.getBoundingClientRect();
  moveAtom(drag.atom, event.clientX - rect.left - drag.offsetX, event.clientY - rect.top - drag.offsetY);
});

atomLayer.addEventListener('pointerup', event => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const {atom, moved} = drag;
  drag = null;
  if (!moved) return selectAtom(atom);
  const x = atom.x * board.clientWidth;
  const y = atom.y * board.clientHeight;
  let nearest = null;
  let distance = 83;
  for (const candidate of atoms) {
    if (candidate === atom) continue;
    const [tx, ty] = point(candidate);
    const gap = Math.hypot(tx - x, ty - y);
    if (gap < distance) {
      nearest = {candidate, tx, ty};
      distance = gap;
    }
  }
  if (nearest) {
    const {candidate, tx, ty} = nearest;
    bondAtoms(atom, candidate, false);
    const angle = distance > 8 ? Math.atan2(y - ty, x - tx) : x < board.clientWidth / 2 ? 0 : Math.PI;
    moveAtom(atom, tx + 76 * Math.cos(angle), ty + 76 * Math.sin(angle));
  }
  sync();
});

atomLayer.addEventListener('pointercancel', event => {
  if (drag?.pointer !== event.pointerId) return;
  if (drag.moved) ({atoms, bonds} = history.pop());
  drag = null;
  sync();
});

byId('undo').addEventListener('click', () => {
  if (!history.length) return;
  ({atoms, bonds} = history.pop());
  selected = null;
  sync();
  announce('Last move undone.');
});
byId('clear').addEventListener('click', () => {
  remember();
  atoms = [];
  bonds = [];
  selected = null;
  sync();
  announce('Workbench cleared.');
});
['break', 'single', 'double'].forEach((id, index) => byId(id).addEventListener('click', () => setBondMode(index)));
byId('orders-mode').addEventListener('click', () => switchMode('orders'));
byId('sandbox-mode').addEventListener('click', () => switchMode('sandbox'));
byId('help').addEventListener('click', () => byId('guide').showModal());
seed();
drawSidebar();
requestAnimationFrame(frame);

export const elements = {
  H: {name: 'Hydrogen', limit: 1, color: '#e7f0d8', unlock: 0},
  O: {name: 'Oxygen', limit: 2, color: '#ff947d', unlock: 1},
  C: {name: 'Carbon', limit: 4, color: '#ab9efb', unlock: 3},
};

export const recipes = [
  {formula: 'H₂', name: 'Hydrogen', center: 'H', outer: 'H', count: 1, order: 1, hint: 'Join two hydrogen atoms with a single bond.'},
  {formula: 'H₂O', name: 'Water', center: 'O', outer: 'H', count: 2, order: 1, hint: 'Connect two hydrogen atoms to one oxygen atom.'},
  {formula: 'O₂', name: 'Oxygen', center: 'O', outer: 'O', count: 1, order: 2, hint: 'Join two oxygen atoms with a double bond.'},
  {formula: 'CO₂', name: 'Carbon dioxide', center: 'C', outer: 'O', count: 2, order: 2, hint: 'Make a double bond from carbon to each oxygen.'},
  {formula: 'CH₄', name: 'Methane', center: 'C', outer: 'H', count: 4, order: 1, hint: 'Make four single bonds around one carbon atom.'},
];

export function connects(bond, a, b) {
  return (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a);
}

export function matches(recipe, atoms, bonds) {
  return atoms.length === recipe.count + 1 && bonds.length === recipe.count &&
    atoms.some(center => center.symbol === recipe.center && atoms.every(atom =>
      atom === center || (atom.symbol === recipe.outer && bonds.some(bond =>
        bond.order === recipe.order && connects(bond, center.id, atom.id)))));
}

export function canBond(a, b, order, bonds) {
  return [a, b].every(atom => {
    const occupied = bonds.filter(bond => !connects(bond, a.id, b.id) &&
      (bond.a === atom.id || bond.b === atom.id));
    return occupied.reduce((sum, bond) => sum + bond.order, order) <= elements[atom.symbol].limit;
  });
}

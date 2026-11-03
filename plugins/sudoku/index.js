/**
 * Sudoku — Host half.
 *
 * The game is generated entirely in the browser, so this half only provides the
 * bundle's activation row and display metadata. It deliberately registers no
 * services, no routes and no model tools: playing Sudoku costs no tokens.
 */
export const name = '@local/sudoku';

export function apply() {
  /* no host-side capability needed */
}

export default { name, apply };

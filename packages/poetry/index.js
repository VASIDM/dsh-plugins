/**
 * 诗笺 — Host half.
 *
 * All texts and commentary ship inside the client bundle; opening the window
 * costs no tokens. This half only provides the activation row and metadata.
 */
export const name = '@local/poetry';

export function apply() {
  /* no host-side capability needed */
}

export default { name, apply };

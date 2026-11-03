/**
 * Host half of the 550W sci-fi boot bundle.
 *
 * All rendering, animation and interaction live in ./client.js, which the
 * Web page loads as a dynamic Client module. The Host half only needs to
 * exist so the Loader has a valid entry for the row in cordis.patch.yml.
 */
export function apply() {}

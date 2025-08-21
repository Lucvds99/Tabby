/**
 * @module utils
 * Small helper functions.
 */

/**
 * Sort object keys alphabetically.
 * @param {Object} obj 
 * @returns {string[]}
 */
export function sortKeys(obj) {
  return Object.keys(obj).sort();
}

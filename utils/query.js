// Helpers for reading values safely from req.query.
//
// Query strings are untrusted: ?area=Yaba&area=Lekki arrives as an ARRAY,
// and a value like "a.*" would be treated as a regular expression if we
// passed it straight into a RegExp. These helpers handle both problems.

const { NIGERIAN_STATES } = require('./constants');

/** Return a trimmed string, or undefined if missing/empty. Arrays -> first item. */
function queryString(value) {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') return undefined;
  const trimmed = first.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Return a number, or undefined if missing or not a number. */
function queryNumber(value) {
  const str = queryString(value);
  if (str === undefined) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

/** Escape characters that have special meaning in regular expressions. */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive "starts with" regex, so "lekki" matches "Lekki Phase 1".
 * The ^ anchor also lets MongoDB use an index.
 */
function startsWithRegex(text) {
  return new RegExp(`^${escapeRegex(text)}`, 'i');
}

/** Case-insensitive "contains" regex, used for name searches. */
function containsRegex(text) {
  return new RegExp(escapeRegex(text), 'i');
}

/**
 * Turn user input like "lagos" or "Abuja" into the exact stored state name
 * ("Lagos", "FCT"). Returns undefined if it isn't a Nigerian state.
 */
function findState(input) {
  if (!input) return undefined;
  const lower = input.trim().toLowerCase();
  if (lower === 'abuja') return 'FCT';
  return NIGERIAN_STATES.find((state) => state.toLowerCase() === lower);
}

module.exports = {
  queryString,
  queryNumber,
  escapeRegex,
  startsWithRegex,
  containsRegex,
  findState,
};

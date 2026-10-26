// Nigerian phone number helpers.
//
// People write the same number many ways:
//   0803 123 4567   +2348031234567   2348031234567   803-123-4567
// We store every number in ONE canonical form — "2348031234567"
// (country code + 10 digits, no plus sign) — so searches always match.

/**
 * Convert any common Nigerian phone format to "234XXXXXXXXXX".
 * Returns the bare digits unchanged if the input doesn't look Nigerian,
 * and returns empty/undefined input as-is.
 */
function normalizePhone(input) {
  if (input === undefined || input === null) return input;

  // Keep digits only: removes spaces, dashes, brackets and the leading "+"
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return '';

  // Some people type an extra 0 after the country code: +234 0803...
  if (digits.startsWith('2340') && digits.length === 14) {
    digits = '234' + digits.slice(4);
  }

  if (digits.startsWith('234') && digits.length === 13) return digits; // 234803...
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1); // 0803...
  if (digits.length === 10 && /^[789]/.test(digits)) return '234' + digits; // 803...

  return digits;
}

/**
 * True if the input is a valid Nigerian mobile number.
 * Mobile numbers start with 070, 080, 081, 090 or 091 (locally).
 */
function isValidNigerianPhone(input) {
  return /^234[789][01]\d{8}$/.test(normalizePhone(input) || '');
}

/** Turn "2348031234567" back into the familiar local form "08031234567". */
function toLocalFormat(canonical) {
  if (!canonical || !canonical.startsWith('234')) return canonical;
  return '0' + canonical.slice(3);
}

module.exports = { normalizePhone, isValidNigerianPhone, toLocalFormat };

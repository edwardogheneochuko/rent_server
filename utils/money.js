// Formats numbers as Nigerian naira, e.g. 1500000 -> "₦1,500,000".
// We store money as whole naira (plain Numbers) in the database and only
// format it when sending it to people.

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  maximumFractionDigits: 0,
});

function formatNaira(amount) {
  const value = Number(amount) || 0;
  return `₦${nairaFormatter.format(Math.round(value))}`;
}

module.exports = { formatNaira };

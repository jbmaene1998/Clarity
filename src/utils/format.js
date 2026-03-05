export function currency(value) {
  return `\u20AC${Number(value).toFixed(2)}`;
}

export function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function toMonthKey(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

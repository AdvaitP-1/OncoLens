export function fmtNumber(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

export function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function titleCase(value = "") {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

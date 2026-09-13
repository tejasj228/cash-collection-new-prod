export const formatDateInput = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("/");
};

export const isoFromDisplayDate = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || ""));
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = new Date(`${year}-${month}-${day}T12:00:00`);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== Number(year) ||
    candidate.getMonth() + 1 !== Number(month) ||
    candidate.getDate() !== Number(day)
  )
    return null;
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// The prototype's business-date fixtures never advance, so cross-day shift
// detection (and the hourly-collection chart's "live since shift start"
// range) is tracked against the operator's real wall-clock time instead,
// persisted in localStorage so it survives a reload (or a real overnight gap).
const SHIFT_OPENED_STORAGE_KEY = "cashcoll:shiftOpenedAt";

export const nowLocalIso = () => new Date().toISOString();
export const todayLocalIso = () => new Date().toLocaleDateString("en-CA");
export const localDateOf = (isoTimestamp) =>
  new Date(isoTimestamp).toLocaleDateString("en-CA");

export const readShiftOpenedAt = () => {
  try {
    return window.localStorage.getItem(SHIFT_OPENED_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

export const writeShiftOpenedAt = (iso) => {
  try {
    window.localStorage.setItem(SHIFT_OPENED_STORAGE_KEY, iso);
  } catch {
    // Storage unavailable (e.g. private browsing) — staleness just won't
    // persist across reloads.
  }
};

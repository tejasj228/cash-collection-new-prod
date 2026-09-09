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

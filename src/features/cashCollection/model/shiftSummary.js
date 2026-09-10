// Pure reconciliation math for a counter shift. Transaction rows are the
// string-based API shape; amounts are parsed to numbers only here.

export const parseAmount = (value) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;

export const hourOf = (time) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(String(time || ""));
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (/PM/i.test(match[3] || "")) hour += 12;
  return hour;
};

const to12 = (h) => `${(h % 24) % 12 || 12} ${h % 24 < 12 ? "AM" : "PM"}`;

export const hourShort = (hour) => (hour == null ? "—" : to12(hour));

export const hourLabel = (hour) => {
  if (hour == null) return "—";
  return `${to12(hour)} – ${to12(hour + 1)}`;
};

const isRefund = (row) => row.status === "Refunded";
const isCancelled = (row) => row.status === "Cancelled";
const isCollected = (row) => row.status === "Completed";

/**
 * Roll a set of transaction rows up into the numbers a clerk reconciles at
 * shift end: net position, cash physically owed, and a per-mode split.
 */
export function computeShiftSummary(transactions = []) {
  const rows = Array.isArray(transactions) ? transactions : [];
  const collected = rows.filter(isCollected);
  const refunds = rows.filter(isRefund);
  const cancelled = rows.filter(isCancelled);

  const sum = (list) =>
    list.reduce((total, row) => total + parseAmount(row.amount), 0);
  const collectedTotal = sum(collected);
  const refundTotal = sum(refunds);

  const modes = [...new Set(rows.map((row) => row.mode).filter(Boolean))];
  const byMode = modes
    .map((mode) => {
      const inMode = rows.filter((row) => row.mode === mode);
      const modeCollected = sum(inMode.filter(isCollected));
      const modeRefunded = sum(inMode.filter(isRefund));
      return {
        mode,
        collected: modeCollected,
        refunded: modeRefunded,
        net: modeCollected - modeRefunded,
        count: inMode.filter(isCollected).length,
      };
    })
    .sort((a, b) => b.net - a.net);

  const cashRow = byMode.find((row) => row.mode === "Cash");

  return {
    bills: rows.length,
    collectionCount: collected.length,
    refundCount: refunds.length,
    cancelCount: cancelled.length,
    collectedTotal,
    refundTotal,
    net: collectedTotal - refundTotal,
    cashCollected: cashRow ? cashRow.collected : 0,
    cashInDrawer: cashRow ? cashRow.net : 0,
    avgTicket: collected.length ? collectedTotal / collected.length : 0,
    largest: collected.reduce(
      (max, row) => Math.max(max, parseAmount(row.amount)),
      0,
    ),
    byMode,
  };
}

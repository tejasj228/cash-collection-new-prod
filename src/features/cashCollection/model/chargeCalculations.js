const lineGross = (line) => Number(line.rate) * Number(line.qty || 0);

const lineDiscountPercent = (line) =>
  Math.min(100, Math.max(0, Number(line.discount || 0)));

const lineDiscountAmount = (line) =>
  (lineGross(line) * lineDiscountPercent(line)) / 100;

const lineNet = (line) =>
  Math.max(0, lineGross(line) - lineDiscountAmount(line));

const withKeys = (lines) =>
  lines.map((line, index) => ({
    ...line,
    key: `${line.code}-${index}`,
    source: "request",
    selected: true,
  }));

export {
  lineGross,
  lineDiscountPercent,
  lineDiscountAmount,
  lineNet,
  withKeys,
};

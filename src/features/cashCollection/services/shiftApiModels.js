const decimalText = (value, field) => {
  const text = String(value ?? "");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error(`Shift response ${field} must be a decimal string.`);
  return text;
};

export function normalizeShiftClosePreparation(input) {
  if (!input || typeof input !== "object")
    throw new Error("Shift close preparation is missing.");
  for (const field of ["shiftId", "version", "businessDate", "status"])
    if (typeof input[field] !== "string" || !input[field])
      throw new Error(`Shift close preparation ${field} is required.`);
  if (typeof input.canClose !== "boolean")
    throw new Error("Shift close preparation canClose must be boolean.");
  if (!Array.isArray(input.blockers) || !Array.isArray(input.denominations))
    throw new Error("Shift close preparation lists are missing.");
  const denominations = input.denominations.map((item) => {
    if (!item?.code || !["NOTE", "COIN"].includes(item.kind) || !item.label)
      throw new Error("Shift denomination metadata is invalid.");
    return {
      code: String(item.code),
      kind: item.kind,
      value: decimalText(item.value, "denomination value"),
      label: String(item.label),
    };
  });
  if (!denominations.length)
    throw new Error("Shift close preparation has no denominations.");
  return {
    ...input,
    expectedCash: decimalText(input.expectedCash, "expectedCash"),
    previousSubmittedCash: decimalText(
      input.previousSubmittedCash,
      "previousSubmittedCash",
    ),
    cumulativeExpectedCash: decimalText(
      input.cumulativeExpectedCash,
      "cumulativeExpectedCash",
    ),
    denominations,
  };
}

export function normalizeClosedShift(input) {
  if (!input || input.status !== "CLOSED" || !input.shiftId || !input.closedAt)
    throw new Error(
      "The server did not return a completed shift close result.",
    );
  const skipped = input.reconciliationMode === "SKIPPED";
  return {
    ...input,
    expectedCash: decimalText(input.expectedCash, "expectedCash"),
    countedCash: skipped ? null : decimalText(input.countedCash, "countedCash"),
    cumulativeCash: decimalText(input.cumulativeCash, "cumulativeCash"),
  };
}

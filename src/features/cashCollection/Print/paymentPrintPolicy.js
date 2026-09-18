// Prototype defaults. Hospital/API mode configuration overrides these entries.
export const PAYMENT_PRINT_POLICIES = {
  virtualaccount: {
    receivedAmountFlag: 0,
    printNote: {
      title: "VIRTUAL ACCOUNT",
      hindi: "नोट: यह भुगतान वर्चुअल अकाउंट से जुड़ा है। इसका भुगतान न करें।",
      english:
        "NOTE: This payment is linked to the Virtual Account. Do not pay it.",
    },
  },
  exempted: {
    receivedAmountFlag: 0,
    printNote: {
      title: "EXEMPTED",
      hindi: "नोट: इस बिल का भुगतान माफ है। इसका भुगतान न करें।",
      english: "NOTE: This bill is exempted. Do not pay it.",
    },
  },
};

export function resolvePaymentPrintPolicy(payment = {}, modeDetails = {}) {
  const defaults =
    PAYMENT_PRINT_POLICIES[
      String(payment.mode || "")
        .toLowerCase()
        .replace(/[^a-z]/g, "")
    ] || {};
  return {
    receivedAmountFlag:
      payment.receivedAmountFlag ??
      modeDetails.receivedAmountFlag ??
      defaults.receivedAmountFlag ??
      1,
    printNote:
      payment.printNote !== undefined
        ? payment.printNote
        : modeDetails.printNote !== undefined
          ? modeDetails.printNote
          : defaults.printNote,
  };
}

export function receivedAmount(payment, total, policy) {
  if (Number(policy.receivedAmountFlag) === 0) return 0;
  if (
    payment?.receivedAmount != null &&
    Number.isFinite(Number(payment.receivedAmount))
  )
    return Number(payment.receivedAmount);
  return total;
}

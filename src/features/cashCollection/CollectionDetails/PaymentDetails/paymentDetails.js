export const TERMINAL_PAYMENT_MODES = Object.freeze([
  "Card",
  "Credit Card",
  "Debit Card",
  "UPI",
]);
export const isCardPaymentMode = (mode) =>
  ["Card", "Credit Card", "Debit Card"].includes(mode);

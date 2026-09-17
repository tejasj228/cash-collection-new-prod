import {
  fetchLegacyJson,
  PAYMENT_CATEGORY_MAPPING_URL,
} from "../utilities/sessionService";

export async function fetchLegacyPaymentOptions(context = {}) {
  if (
    !context.patientCategoryCode ||
    !["Receipt", "Refund"].includes(context.requestType)
  )
    throw new Error(
      "Patient category and transaction type are required for payment modes.",
    );
  const payload = await fetchLegacyJson(PAYMENT_CATEGORY_MAPPING_URL, {
    reqType: context.requestType === "Refund" ? "2" : "1",
    patCategory: String(context.patientCategoryCode),
    patReceiptPaymode: String(context.patientReceiptPaymode ?? 0),
    chargeId: String(context.chargeId ?? 0),
  });
  if (payload?.status !== "success" || !Array.isArray(payload.data))
    throw new Error("Payment mode mapping returned an invalid response.");
  const modeDetails = {};
  for (const row of payload.data) {
    const parts = String(row.paydtls || "").split("#");
    if (!/^\d+$/.test(parts[0]) || !parts[1] || !row.paymode)
      throw new Error("Payment mode mapping returned an invalid mode.");
    modeDetails[parts[1]] = { id: parts[0], paydtls: row.paydtls };
  }
  return { modes: Object.keys(modeDetails), modeDetails };
}

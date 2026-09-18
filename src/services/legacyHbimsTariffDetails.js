import {
  fetchLegacyJson,
  TARIFF_DETAILS_URL,
} from "../utilities/sessionService";

function numericField(value, name, min, max = Infinity) {
  if (value == null || String(value).trim() === "")
    throw new Error(`Tariff details are missing ${name}.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max)
    throw new Error(`Tariff details contain invalid ${name}.`);
  return number;
}

export function mapLegacyTariffDetailsRow(row, crNo) {
  if (!row || typeof row !== "object")
    throw new Error("The server returned an invalid tariff row.");
  if (crNo && row.hrgnum_puk != null && String(row.hrgnum_puk) !== String(crNo))
    throw new Error("Tariff details belong to a different patient.");
  const code = String(row.tariff_code ?? "").trim();
  const name = String(row.tariff_name ?? "").trim();
  if (!code || !name)
    throw new Error("Tariff details are missing code or name.");
  return {
    code,
    name,
    group: String(row.tariff_group_name ?? "").trim(),
    ...(row.location != null || row.tariff_location != null
      ? { location: String(row.location ?? row.tariff_location).trim() }
      : {}),
    rate: numericField(row.tariff_rate, "tariff_rate", 0),
    qty: numericField(row.tariff_qty, "tariff_qty", 0),
    discount: numericField(
      row.tariff_discount_percent,
      "tariff_discount_percent",
      0,
      100,
    ),
    // Retain backend references without exposing unrelated raw fields in the UI.
    legacyTariffId: String(row.gstr_tariff_id ?? ""),
    netCost: row.net_cost == null ? null : String(row.net_cost),
  };
}

export async function fetchLegacyTariffDetails(reqNo, crNo) {
  if (!reqNo) throw new Error("A request number is required to load tariffs.");
  const payload = await fetchLegacyJson(TARIFF_DETAILS_URL, {
    reqNo: String(reqNo),
  });
  if (payload?.status !== "success" || !Array.isArray(payload.data))
    throw new Error("The server did not return valid tariff details.");
  return payload.data.map((row) => mapLegacyTariffDetailsRow(row, crNo));
}

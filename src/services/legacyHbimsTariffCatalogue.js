import { fetchLegacyJson, TARIFF_LIST_URL } from "../utilities/sessionService";

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CONTEXTS = 4;
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function mapLegacyCatalogueRow(row) {
  const code = String(row?.tariff_code ?? "").trim();
  const name = String(row?.tariff_name ?? "").trim();
  const rate = Number(row?.default_rate);
  if (
    !code ||
    !name ||
    row.default_rate == null ||
    !Number.isFinite(rate) ||
    rate < 0
  )
    throw new Error("Tariff catalogue contains an invalid code, name or rate.");
  return {
    code,
    name,
    rate,
    group: String(row.group_name ?? "").trim(),
    ...(row.location != null || row.tariff_location != null
      ? { location: String(row.location ?? row.tariff_location).trim() }
      : {}),
    groupId: String(row.group_id ?? ""),
    legacyTariffId: String(row.tariff_id ?? ""),
    unitId: String(row.unit_id ?? ""),
    unitName: String(row.unit_name ?? ""),
    unitBaseValue: row.unit_base_value,
    maxDiscount: row.max_discount,
    isRefundable: row.is_refundable,
    serviceId: row.service_id,
  };
}

function lowerBound(index, prefix) {
  let lo = 0;
  let hi = index.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (index[mid].key < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function buildTariffIndex(rows) {
  // Display ranks follow the API response; only lookup indexes are sorted.
  const items = rows.map(mapLegacyCatalogueRow);
  const codes = items
    .map((item, rank) => ({ key: normalize(item.code), rank }))
    .sort((a, b) => compare(a.key, b.key));
  const names = items
    .map((item, rank) => ({ key: normalize(item.name), rank }))
    .sort((a, b) => compare(a.key, b.key));
  return {
    items,
    groups: Array.from(
      new Set(items.map((item) => item.group).filter(Boolean)),
    ).sort(compare),
    codes,
    names,
    ranks: items.map((_, rank) => rank),
    searches: new Map(),
  };
}

export function searchTariffIndex(index, filters = {}) {
  const prefix = normalize(filters.search);
  const searchKey = JSON.stringify([prefix, filters.groupId || ""]);
  let ranks = index.searches.get(searchKey);
  if (!ranks && prefix) {
    const found = new Set();
    for (const entries of [index.codes, index.names]) {
      for (
        let i = lowerBound(entries, prefix);
        i < entries.length && entries[i].key.startsWith(prefix);
        i++
      ) {
        found.add(entries[i].rank);
      }
    }
    ranks = Array.from(found).sort((a, b) => a - b);
  } else if (!ranks) {
    ranks = index.ranks;
  }
  if (!index.searches.has(searchKey) && filters.groupId)
    ranks = ranks.filter(
      (rank) =>
        index.items[rank].groupId === String(filters.groupId) ||
        index.items[rank].group === filters.groupId,
    );
  index.searches.set(searchKey, ranks);
  if (index.searches.size > 20)
    index.searches.delete(index.searches.keys().next().value);
  const size = Math.min(10, Math.max(1, Number(filters.size) || 10));
  const start = Math.max(0, Number(filters.page) || 0) * size;
  return {
    items: ranks.slice(start, start + size).map((rank) => index.items[rank]),
    total: ranks.length,
  };
}

// One runtime/session owns this bounded cache; never persist catalogue or tickets.
export function createLegacyTariffCatalogue(fetchJson = fetchLegacyJson) {
  const cache = new Map();
  async function load(context) {
    const category = String(context.patientCategoryCode ?? "");
    const charge = String(context.chargeTypeId ?? "");
    if (!/^\d+$/.test(category) || !/^\d+$/.test(charge))
      throw new Error(
        "Patient category and charge type are required to load tariffs.",
      );
    const params = {
      ipdChargeType: String(context.ipdChargeType ?? 0),
      chargeType: charge,
      patientCatCode: category,
      tariffCode: "0",
    };
    const key = JSON.stringify(params);
    const previous = cache.get(key);
    if (previous && (previous.pending || previous.expires > Date.now())) {
      cache.delete(key);
      cache.set(key, previous);
      return previous.promise;
    }
    const entry = { pending: true, expires: 0 };
    entry.promise = fetchJson(TARIFF_LIST_URL, params)
      .then((payload) => {
        if (payload?.status !== "success" || !Array.isArray(payload.data))
          throw new Error(
            "The server did not return a valid tariff catalogue.",
          );
        const index = buildTariffIndex(payload.data);
        entry.index = index;
        entry.pending = false;
        entry.expires = Date.now() + CACHE_TTL;
        return index;
      })
      .catch((error) => {
        if (cache.get(key) === entry) cache.delete(key);
        throw error;
      });
    cache.set(key, entry);
    while (cache.size > MAX_CONTEXTS) cache.delete(cache.keys().next().value);
    return entry.promise;
  }
  return {
    peekTariffPage(filters = {}) {
      const key = JSON.stringify({
        ipdChargeType: String(filters.ipdChargeType ?? 0),
        chargeType: String(filters.chargeTypeId ?? ""),
        patientCatCode: String(filters.patientCategoryCode ?? ""),
        tariffCode: "0",
      });
      const entry = cache.get(key);
      return entry?.index && entry.expires > Date.now()
        ? searchTariffIndex(entry.index, filters)
        : null;
    },
    preloadTariffs: load,
    async getTariffGroups(context = {}) {
      return (await load(context)).groups;
    },
    async getTariffPage(filters = {}) {
      return searchTariffIndex(await load(filters), filters);
    },
  };
}

// Pending requests define candidates; patinfo supplies their current details.
export function createPendingListPatientQueries(loadRequests, loadPatientInfo) {
  const infoCache = new Map();
  let activeLoads = 0;
  const waiting = [];
  async function readInfo(cr) {
    if (activeLoads < 10) activeLoads += 1;
    else await new Promise((resolve) => waiting.push(resolve));
    try {
      return await loadPatientInfo(cr);
    } finally {
      if (waiting.length) waiting.shift()();
      else activeLoads -= 1;
    }
  }
  async function enrich(patient) {
    if (!infoCache.has(patient.cr)) {
      const promise = readInfo(patient.cr)
        .then((info) => {
          if (!info || info.cr !== patient.cr)
            throw new Error(
              "The patient tile could not be resolved for this pending-list CR.",
            );
          return info;
        })
        .catch((error) => {
          infoCache.delete(patient.cr);
          throw error;
        });
      infoCache.set(patient.cr, promise);
    }
    const info = await infoCache.get(patient.cr);
    return {
      ...info,
      pendingServiceFamily: patient.hasIpdRequest ? "IPD" : "OPD",
    };
  }
  async function candidates() {
    const byCr = new Map();
    for (const request of await loadRequests()) {
      if (!request.cr) continue;
      const previous = byCr.get(request.cr);
      const hasIpdRequest =
        previous?.hasIpdRequest || request.hospitalService === "IPD";
      if (!previous || String(request.dateIso) > String(previous.dateIso))
        byCr.set(request.cr, {
          cr: request.cr,
          name: request.patient,
          mobile: request.mobile || "",
          dateIso: request.dateIso,
          hasIpdRequest,
        });
      else previous.hasIpdRequest = hasIpdRequest;
    }
    return [...byCr.values()].sort(
      (a, b) =>
        String(b.dateIso).localeCompare(String(a.dateIso)) ||
        a.cr.localeCompare(b.cr),
    );
  }
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const matchesTerms = (patient, terms) =>
    terms.every((term) =>
      [patient.name, patient.cr, patient.mobile].some((value) =>
        normalize(value).includes(normalize(term)),
      ),
    );
  return {
    async searchPatientPage(options = {}) {
      const terms = String(options.query || "")
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);
      let rows = (await candidates()).filter(
        (patient) =>
          patient.hasIpdRequest === (options.hospitalServiceId === "ipd"),
      );
      if (options.searchField) {
        if (
          !["mobile", "abhaNumber", "abhaAddress"].includes(options.searchField)
        )
          throw new Error("Unsupported patient search identifier.");
        const hydrated = [];
        for (let offset = 0; offset < rows.length; offset += 10)
          hydrated.push(
            ...(await Promise.all(rows.slice(offset, offset + 10).map(enrich))),
          );
        const entered = normalize(options.query);
        rows = entered
          ? hydrated.filter(
              (patient) => normalize(patient[options.searchField]) === entered,
            )
          : [];
      } else if (options.exactCr) {
        rows = rows.filter((patient) => patient.cr === String(options.query));
        rows.forEach((patient) => infoCache.delete(patient.cr));
      } else if (terms.some((term) => /\d/.test(term))) {
        // Phone lives in patinfo. Search all candidate CRs in batches of ten,
        // not only the visible page; reuse successful reads for paging.
        const hydrated = [];
        for (let offset = 0; offset < rows.length; offset += 10)
          hydrated.push(
            ...(await Promise.all(rows.slice(offset, offset + 10).map(enrich))),
          );
        rows = hydrated.filter((patient) => matchesTerms(patient, terms));
      } else if (terms.length)
        rows = rows.filter((patient) => matchesTerms(patient, terms));
      const size = 10;
      const page = Math.max(0, Number(options.page) || 0);
      const items = await Promise.all(
        rows
          .slice(page * size, (page + 1) * size)
          .map((patient) =>
            patient.pendingServiceFamily ? patient : enrich(patient),
          ),
      );
      return { items, total: rows.length, page, size };
    },
  };
}

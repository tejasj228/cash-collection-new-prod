import {
  fetchLegacyJson,
  DAILY_PATIENT_LIST_URL,
} from "../utilities/sessionService";

export function createDailyPatientQueries(
  loadPatientInfo,
  fetchJson = fetchLegacyJson,
) {
  let cached;
  let expires = 0;
  let pending;
  async function load() {
    if (cached && Date.now() < expires) return cached;
    if (pending) return pending;
    pending = fetchJson(DAILY_PATIENT_LIST_URL)
      .then((payload) => {
        if (payload?.status !== "success" || !Array.isArray(payload.data))
          throw new Error(
            "The server did not return a valid daily patient list.",
          );
        const rows = payload.data.map((row, i) => {
          const cr = String(row.crno ?? "").trim();
          const name = String(row.pat_name ?? "")
            .trim()
            .replace(/\s+/g, " ");
          if (!/^\d+$/.test(cr) || !name)
            throw new Error(
              "Daily patient list contains an invalid name or CR number.",
            );
          return { id: `${cr}-${i}`, cr, name, listServiceFamily: "OPD" };
        });
        cached = rows;
        expires = Date.now() + 60000;
        return rows;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }
  return {
    async searchPatientPage(options = {}) {
      if (options.searchField && !["cr", "name"].includes(options.searchField))
        throw new Error(
          "Search the daily patient list by CR number or patient name.",
        );
      const query = String(options.query ?? "")
        .trim()
        .toLowerCase();
      const terms = query.split(/\s+/).filter(Boolean);
      let rows = (await load()).filter((patient) =>
        options.exactCr
          ? patient.cr === query
          : terms.every((term) =>
              (options.searchField
                ? [patient[options.searchField]]
                : [patient.cr, patient.name]
              ).some((value) => value.toLowerCase().includes(term)),
            ),
      );
      if (options.exactCr && rows.length) {
        const patient = await loadPatientInfo(rows[0].cr);
        if (!patient || String(patient.cr) !== rows[0].cr)
          throw new Error(
            "Patient details could not be resolved for the selected CR number.",
          );
        rows = [{ ...patient, listServiceFamily: "OPD" }];
      }
      const page = Math.max(0, Number(options.page) || 0);
      return {
        items: rows.slice(page * 10, page * 10 + 10),
        total: rows.length,
        page,
        size: 10,
      };
    },
  };
}

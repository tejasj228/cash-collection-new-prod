import { mapLegacyPatientInfoRow } from "./legacyHbimsPatientInfo";

describe("mapLegacyPatientInfoRow", () => {
  test("maps the live admission number for the patient header", () => {
    const patient = mapLegacyPatientInfoRow({
      crno: 379132600003297,
      pat_name: "Ot Test",
      pat_age: "40 Yr/Male",
      adm_no: "379139500006",
    });

    expect(patient.ipd).toBe("379139500006");
  });

  test("uses a dash when the endpoint has no admission number", () => {
    expect(mapLegacyPatientInfoRow({ adm_no: " " }).ipd).toBe("-");
  });
});

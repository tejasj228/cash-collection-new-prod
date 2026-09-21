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

  test("retains every additional API field, uses clear headings and shows blanks as dashes", () => {
    const patient = mapLegacyPatientInfoRow({
      crno: 379132600003297,
      pat_name: "Ot Test",
      mobile_num: "9876543210",
      "father/mother/spouse name": "Test Guardian",
      patient_category_code: 11,
      pat_dob: "01/01/1990",
      pat_reg_date: "02/02/2020 10:35 AM",
      permanent_address: "Mangalagiri",
      is_admitted: false,
      blank_field: " ",
      DATEOFBIRTH: "17-Jun-1990",
      EMGCONTACT: "-",
      REGDATE: "17-Jun-2020 16:06:58",
      PATINETADHARNO: "-",
      PATADDRESS: "Guntur, Andhra Pradesh",
    });
    expect(patient.additionalInfo).toEqual([
      {
        key: "father/mother/spouse name",
        label: "Father / Mother / Spouse Name",
        value: "Test Guardian",
      },
      { key: "pat_dob", label: "Date Of Birth", value: "01/01/1990" },
      {
        key: "pat_reg_date",
        label: "Registration Date / Time",
        value: "02/02/2020 / 10:35 AM",
      },
      {
        key: "permanent_address",
        label: "Patient Address",
        value: "Mangalagiri",
      },
      { key: "is_admitted", label: "Currently Admitted", value: "No" },
      { key: "blank_field", label: "Blank Field", value: "-" },
      { key: "DATEOFBIRTH", label: "Date Of Birth", value: "17-Jun-1990" },
      { key: "EMGCONTACT", label: "Emergency Contact No.", value: "-" },
      {
        key: "REGDATE",
        label: "Registration Date / Time",
        value: "17-Jun-2020 / 16:06:58",
      },
      { key: "PATINETADHARNO", label: "Patient Aadhaar No.", value: "-" },
      {
        key: "PATADDRESS",
        label: "Patient Address",
        value: "Guntur, Andhra Pradesh",
      },
    ]);
  });
});

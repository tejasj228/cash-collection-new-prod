import React from "react";
import { render, screen } from "@testing-library/react";
import { PatientBanner } from "./PatientDetails.jsx";

test("patient banner labels every value and keeps admission limited to IPD", () => {
  const patient = {
    name: "Test Patient",
    cr: "379132600003165",
    ipd: "12345",
    age: "40",
    sex: "Male",
    category: "Exempted",
    mobile: "9336023217",
    abhaNumber: "-",
    abhaAddress: "patient.with.a.long.address@abdm",
  };
  const { container, rerender } = render(
    <PatientBanner
      patient={patient}
      patientMode="existing"
      hospitalService="OPD"
    />,
  );
  [
    "CR No.",
    "Admission No.",
    "Age / Sex",
    "Category",
    "Mobile No.",
    "ABHA No.",
    "ABHA Address",
  ].forEach((label) => {
    expect(screen.getByText(`${label} :`)).not.toBeNull();
    expect(screen.getByTitle(label)).not.toBeNull();
  });
  expect(screen.getByText(patient.cr).tagName).toBe("STRONG");
  expect(container.querySelectorAll(".patient-detail strong")).toHaveLength(7);
  expect(screen.queryByText("12345")).toBeNull();
  rerender(
    <PatientBanner
      patient={patient}
      patientMode="existing"
      hospitalService="IPD"
    />,
  );
  expect(screen.getByText("12345").tagName).toBe("STRONG");
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { PatientBanner, MorePatientInfo } from "./PatientDetails.jsx";

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

test("fallback vectors follow the API sex without guessing from names", () => {
  const { rerender } = render(
    <PatientBanner
      patient={{ name: "Patient", sex: "Male" }}
      patientMode="existing"
      hospitalService="OPD"
    />,
  );
  expect(
    screen.getByRole("img", { name: "Male patient avatar" }),
  ).not.toBeNull();
  rerender(
    <PatientBanner
      patient={{ name: "Patient", sex: "F" }}
      patientMode="existing"
      hospitalService="OPD"
    />,
  );
  expect(
    screen.getByRole("img", { name: "Female patient avatar" }),
  ).not.toBeNull();
});

test("patient photo appears in the banner and opens the same image in the enlarged view", () => {
  const { container } = render(
    <PatientBanner
      patient={{ name: "Patient", photoUrl: "/api/photo/123" }}
      patientMode="existing"
      hospitalService="OPD"
    />,
  );
  expect(
    container.querySelector(".patient-photo img").getAttribute("src"),
  ).toBe("/api/photo/123");
  fireEvent.click(screen.getByRole("button", { name: "View Patient's photo" }));
  expect(screen.getByRole("img", { name: "Patient" }).getAttribute("src")).toBe(
    "/api/photo/123",
  );
});

test("more patient info shows API fields omitted from the main tile", () => {
  const original = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  render(
    <MorePatientInfo
      patient={{
        additionalInfo: [
          {
            key: "guardian",
            label: "Father / Mother / Spouse Name",
            value: "Test Guardian",
          },
          { key: "pat_dob", label: "Date Of Birth", value: "-" },
          {
            key: "pat_reg_date",
            label: "Registration Date / Time",
            value: "21/09/2026 / 10:35 AM",
          },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "More patient info" }));
  expect(
    screen.getByRole("dialog", { name: "More patient info" }),
  ).not.toBeNull();
  expect(screen.getByText("Father / Mother / Spouse Name")).not.toBeNull();
  expect(screen.getByText("Test Guardian")).not.toBeNull();
  expect(screen.getByText("Date Of Birth")).not.toBeNull();
  expect(screen.getByText("-")).not.toBeNull();
  expect(screen.getByText("Registration Date / Time")).not.toBeNull();
  expect(screen.getByText("21/09/2026 / 10:35 AM")).not.toBeNull();
  if (original) HTMLDialogElement.prototype.showModal = original;
  else delete HTMLDialogElement.prototype.showModal;
});

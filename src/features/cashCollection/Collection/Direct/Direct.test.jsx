import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppDataProvider } from "../../../../app/providers/AppDataProvider";
import {
  DirectSetup,
  PatientSearchPopover,
  FindPatientDialog,
} from "./Direct.jsx";
import { directPatientError } from "./direct";

jest.mock("antd", () => ({
  Button: ({ children, icon, htmlType, ...props }) => (
    <button type={htmlType} {...props}>
      {children}
    </button>
  ),
  Input: ({ status, ...props }) => <input {...props} />,
}));

const cr = "379132000151071";
const patient = {
  cr,
  name: "Database Patient",
  mobile: "9876543210",
  isAdmitted: false,
};

test("Find Patient starts with only identifier controls and searches on submit", async () => {
  const services = {
    searchPatientPage: jest
      .fn()
      .mockResolvedValue({ items: [patient], total: 1 }),
  };
  render(
    <FindPatientDialog
      services={services}
      service={{ id: "opd-normal" }}
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
  expect(services.searchPatientPage).not.toHaveBeenCalled();
  expect(screen.queryByText(patient.name)).toBeNull();
  fireEvent.change(screen.getByLabelText("Patient identifier"), {
    target: { value: patient.mobile },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() =>
    expect(services.searchPatientPage).toHaveBeenCalledWith(
      expect.objectContaining({ searchField: "mobile", query: patient.mobile }),
    ),
  );
  expect(
    await screen.findByRole("button", { name: /Database Patient/ }),
  ).not.toBeNull();
});

test("missing admission is allowed only for correctly classified legacy pending candidates", () => {
  const pending = { cr, status: "-", pendingServiceFamily: "IPD" };
  expect(directPatientError(pending, { id: "ipd" })).toBe("");
  expect(directPatientError(pending, { id: "opd-normal" })).not.toBe("");
  expect(
    directPatientError({ ...pending, isAdmitted: false }, { id: "ipd" }),
  ).toMatch(/currently admitted/);
  expect(
    directPatientError(
      { ...pending, pendingServiceFamily: "OPD", isAdmitted: true },
      { id: "emergency" },
    ),
  ).toMatch(/Use IPD/);
});

test("admission rules block incompatible services and fail closed on unknown state", () => {
  for (const id of ["opd-normal", "opd-special", "emergency"]) {
    expect(directPatientError(patient, { id })).toBe("");
    expect(
      directPatientError({ ...patient, isAdmitted: true }, { id }),
    ).toMatch(/Use IPD/);
  }
  expect(directPatientError(patient, { id: "ipd" })).toMatch(
    /currently admitted/,
  );
  expect(
    directPatientError({ ...patient, isAdmitted: true }, { id: "ipd" }),
  ).toBe("");
  expect(directPatientError({ cr, status: "-" }, { id: "opd-normal" })).toMatch(
    /not confirmed/,
  );
});

test("patient picker requests ten records per page and searches the full database", async () => {
  const service = { id: "opd-special" };
  const services = {
    searchPatientPage: jest
      .fn()
      .mockResolvedValue({ items: [patient], total: 25 }),
  };
  render(
    <PatientSearchPopover
      listOnly
      service={service}
      services={services}
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
  await screen.findByText("Database Patient");
  expect(services.searchPatientPage).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 0, size: 10, admittedOnly: false }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() =>
    expect(services.searchPatientPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size: 10 }),
    ),
  );
  fireEvent.change(screen.getByPlaceholderText(/Search By CR/), {
    target: { value: "Patient, 987654" },
  });
  await waitFor(() =>
    expect(services.searchPatientPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Patient, 987654", page: 0 }),
    ),
  );
});

test("an API error never shows fixture patients", async () => {
  const services = {
    searchPatientPage: jest
      .fn()
      .mockRejectedValue(new Error("Backend unavailable")),
  };
  render(
    <PatientSearchPopover
      listOnly
      service={{ id: "ipd" }}
      services={services}
      onClose={() => {}}
    />,
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Backend unavailable",
  );
  expect(screen.queryByText("Database Patient")).toBeNull();
});

test("typed CR is resolved and admission checked before backend eligibility", async () => {
  const services = {
    searchPatientPage: jest
      .fn()
      .mockResolvedValue({ items: [patient], total: 1 }),
    checkEligibility: jest.fn().mockResolvedValue({ eligible: true }),
  };
  const onContinue = jest.fn();
  const setSelectedPatient = jest.fn();
  render(
    <AppDataProvider
      value={{
        billingByService: {
          "opd-normal": {
            Receipt: [
              {
                id: "10",
                label: "Service",
                uiFamily: "tariff-entry",
                processingServiceId: "10",
              },
            ],
          },
        },
      }}
    >
      <DirectSetup
        service={{ id: "opd-normal", label: "OPD" }}
        services={services}
        crQuery={cr}
        selectedPatient={null}
        requestType="Receipt"
        billingService="10"
        setSelectedPatient={setSelectedPatient}
        setCrQuery={() => {}}
        setRequestType={() => {}}
        setBillingService={() => {}}
        onContinue={onContinue}
      />
    </AppDataProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Existing Patients" }),
  ).not.toBeNull();
  expect(screen.getByRole("button", { name: "Find Patient" }).disabled).toBe(
    false,
  );
  fireEvent.click(screen.getByRole("button", { name: /Continue to Tariff/ }));
  await waitFor(() => expect(onContinue).toHaveBeenCalled());
  expect(setSelectedPatient).toHaveBeenCalledWith(patient);
  expect(services.checkEligibility).toHaveBeenCalledWith(
    expect.objectContaining({ source: "direct", crNumber: cr }),
  );
});

test("IPD listing rejects non-admitted backend rows", async () => {
  render(
    <PatientSearchPopover
      listOnly
      service={{ id: "ipd" }}
      services={{
        searchPatientPage: async () => ({ items: [patient], total: 1 }),
      }}
      onClose={() => {}}
    />,
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "incompatible or unknown",
  );
  expect(screen.queryByText("Database Patient")).toBeNull();
});

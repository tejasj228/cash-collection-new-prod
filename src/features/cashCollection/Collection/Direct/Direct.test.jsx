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
      service={{ id: "ipd" }}
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

test("daily Find Patient uses CR search rather than mobile", async () => {
  const services = {
    searchPatientPage: jest
      .fn()
      .mockResolvedValue({ items: [patient], total: 1 }),
  };
  render(
    <FindPatientDialog
      services={services}
      service={{ id: "emergency" }}
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
  expect(screen.queryByText("Mobile Number")).toBeNull();
  fireEvent.change(screen.getByLabelText("Patient identifier"), {
    target: { value: cr },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() =>
    expect(services.searchPatientPage).toHaveBeenCalledWith(
      expect.objectContaining({ searchField: "cr", exactCr: true, query: cr }),
    ),
  );
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
  expect(screen.queryByText(new RegExp(patient.mobile))).toBeNull();
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
    target: { value: "Patient" },
  });
  await waitFor(() =>
    expect(services.searchPatientPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Patient", page: 0 }),
    ),
  );
});

test("typing retains result rows and pagination until debounced search finishes", async () => {
  let finishSearch;
  const services = {
    searchPatientPage: jest
      .fn()
      .mockResolvedValueOnce({ items: [patient], total: 11 })
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            finishSearch = resolve;
          }),
      ),
  };
  render(
    <PatientSearchPopover
      listOnly
      service={{ id: "opd-normal" }}
      services={services}
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
  const row = await screen.findByRole("button", { name: /Database Patient/ });
  const footer = screen.getByText("11 matching patients");
  fireEvent.change(screen.getByPlaceholderText(/Search By CR/), {
    target: { value: "Nobody" },
  });
  expect(screen.getByRole("button", { name: /Database Patient/ })).toBe(row);
  expect(screen.getByText("11 matching patients")).toBe(footer);
  expect(screen.queryByText("Loading patients…")).toBeNull();
  await waitFor(() =>
    expect(services.searchPatientPage).toHaveBeenCalledTimes(2),
  );
  expect(screen.getByRole("button", { name: /Database Patient/ })).toBe(row);
  finishSearch({ items: [], total: 0 });
  await screen.findByText("No matching patients found.");
  expect(screen.getByText("0 matching patients")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Next page" })).not.toBeNull();
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

test("returning to Direct setup with the same patient proceeds on the first click in StrictMode", async () => {
  const services = {
    searchPatientPage: jest
      .fn()
      .mockResolvedValue({ items: [patient], total: 1 }),
    checkEligibility: jest.fn().mockResolvedValue({ eligible: true }),
  };
  const continued = jest.fn();
  function Flow() {
    const [stage, setStage] = React.useState("setup");
    return stage === "workspace" ? (
      <button onClick={() => setStage("setup")}>
        Back to transaction setup
      </button>
    ) : (
      <DirectSetup
        service={{ id: "opd-normal", label: "OPD" }}
        services={services}
        crQuery={cr}
        selectedPatient={patient}
        requestType="Receipt"
        billingService="10"
        setSelectedPatient={() => {}}
        setCrQuery={() => {}}
        setRequestType={() => {}}
        setBillingService={() => {}}
        onContinue={() => {
          continued();
          setStage("workspace");
        }}
      />
    );
  }
  render(
    <React.StrictMode>
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
        <Flow />
      </AppDataProvider>
    </React.StrictMode>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Continue to Tariff/ }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Back to transaction setup" }),
  );
  expect(screen.getByText(patient.name)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Continue to Tariff/ }));
  await screen.findByRole("button", { name: "Back to transaction setup" });
  expect(continued).toHaveBeenCalledTimes(2);
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

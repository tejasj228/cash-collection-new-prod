import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppDataProvider } from "../../../../app/providers/AppDataProvider";
import { ChargeBuilder } from "./BillingDetails.jsx";
import { TariffPicker } from "./TariffPicker.jsx";
import { createLegacyTariffCatalogue } from "../../../../services/legacyHbimsTariffCatalogue";

jest.mock("antd", () => ({
  Button: ({ children, icon, htmlType, ...props }) => (
    <button type={htmlType} {...props}>
      {children}
    </button>
  ),
  Input: ({ status, ...props }) => <input {...props} />,
}));

test("blank Enter opens an API-backed picker and adds chosen database tariffs", async () => {
  const services = {
    getTariffPage: jest.fn().mockResolvedValue({
      items: [
        { code: "DB-1", name: "Database Tariff", group: "Lab", rate: 30 },
      ],
      total: 11,
    }),
  };
  const setLines = jest.fn();
  const context = {
    crNumber: "379132000151071",
    hospitalServiceId: "opd-normal",
    workflowId: "tariff-entry",
  };
  render(
    <AppDataProvider
      value={{
        tariffCatalog: [{ code: "DUMMY", name: "Fixture Tariff", rate: 999 }],
        tariffGroups: [],
      }}
    >
      <ChargeBuilder
        lines={[]}
        setLines={setLines}
        requestType="Receipt"
        mode="direct"
        services={services}
        tariffContext={context}
        workflow={{ uiFamily: "tariff-entry" }}
      />
    </AppDataProvider>,
  );
  expect(screen.getByRole("combobox", { name: "Tariff group" }).disabled).toBe(
    false,
  );
  expect(screen.getByText("All groups")).not.toBeNull();
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Add a Tariff" }), {
    key: "Enter",
  });
  expect(
    await screen.findByRole("dialog", { name: "Select tariffs" }),
  ).not.toBeNull();
  await screen.findByText("Database Tariff");
  expect(screen.queryByText("Fixture Tariff")).toBeNull();
  expect(services.getTariffPage).toHaveBeenCalledWith(
    expect.objectContaining({ ...context, page: 0, size: 10 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() =>
    expect(services.getTariffPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
    ),
  );
  await screen.findByText("Database Tariff");
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Select Database Tariff" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Add selected/ }));
  expect(setLines.mock.calls[0][0]([])).toEqual([
    expect.objectContaining({
      code: "DB-1",
      rate: 30,
      qty: 1,
      selected: true,
      source: "manual",
    }),
  ]);
});

test("API groups filter suggestions and the Enter picker using the same catalogue request", async () => {
  const fetchJson = jest.fn().mockResolvedValue({
    status: "success",
    data: [
      {
        tariff_code: "T01",
        tariff_name: "Lab Test",
        default_rate: 10,
        group_id: 1,
        group_name: "Lab",
      },
      {
        tariff_code: "T02",
        tariff_name: "Surgery Test",
        default_rate: 20,
        group_id: 2,
        group_name: "Surgery",
      },
    ],
  });
  const services = createLegacyTariffCatalogue(fetchJson);
  render(
    <AppDataProvider value={{ tariffCatalog: [], tariffGroups: [] }}>
      <ChargeBuilder
        lines={[
          {
            key: "added",
            code: "X",
            name: "Added tariff",
            group: "Existing group",
            rate: 10,
            qty: 1,
            discount: 0,
            selected: true,
          },
        ]}
        setLines={jest.fn()}
        requestType="Receipt"
        mode="direct"
        services={services}
        tariffContext={{ patientCategoryCode: 11, chargeTypeId: 1 }}
        workflow={{ uiFamily: "tariff-entry" }}
      />
    </AppDataProvider>,
  );
  expect(
    screen.getByRole("columnheader", { name: "Group Name" }),
  ).not.toBeNull();
  expect(screen.getByText("Existing group")).not.toBeNull();
  await screen.findByRole("option", { name: "Lab" });
  fireEvent.change(screen.getByRole("combobox", { name: "Tariff group" }), {
    target: { value: "Lab" },
  });
  const input = screen.getByPlaceholderText(
    "Enter tariff code or name to add tariff",
  );
  fireEvent.change(input, { target: { value: "T" } });
  await screen.findByRole("option", { name: /Lab Test/ });
  expect(screen.queryByText("Surgery Test")).toBeNull();
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await screen.findByRole("checkbox", { name: "Select Lab Test" });
  expect(screen.queryByText("Surgery Test")).toBeNull();
  expect(fetchJson).toHaveBeenCalledTimes(1);
});

test("rapid cached paging immediately shows the latest page without loading or losing pagination", async () => {
  const fetchJson = jest.fn().mockResolvedValue({
    status: "success",
    data: Array.from({ length: 45 }, (_, i) => ({
      tariff_code: `T${String(i).padStart(3, "0")}`,
      tariff_name: `Item ${i}`,
      default_rate: 10,
    })),
  });
  const services = createLegacyTariffCatalogue(fetchJson);
  const context = { patientCategoryCode: 11, chargeTypeId: 1 };
  await services.preloadTariffs(context);
  render(
    <TariffPicker
      services={services}
      context={context}
      onClose={() => {}}
      onAdd={() => {}}
    />,
  );
  expect(
    screen.getByRole("columnheader", { name: "Tariff Code" }),
  ).not.toBeNull();
  expect(
    screen.getByRole("columnheader", { name: "Group Name" }),
  ).not.toBeNull();
  for (let i = 0; i < 3; i++)
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Item 30")).not.toBeNull();
  expect(screen.queryByText("Loading tariffs…")).toBeNull();
  expect(screen.getByText("45 eligible tariffs")).not.toBeNull();
  expect(fetchJson).toHaveBeenCalledTimes(1);
});

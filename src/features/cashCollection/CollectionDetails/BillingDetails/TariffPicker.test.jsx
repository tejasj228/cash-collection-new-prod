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
    true,
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

test("rapid cached paging immediately shows the latest page without loading or losing pagination", async () => {
  const fetchJson = jest
    .fn()
    .mockResolvedValue({
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

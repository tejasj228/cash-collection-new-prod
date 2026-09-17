import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AppDataProvider } from "../../../../app/providers/AppDataProvider";
import { ModeTabs, RequestWorklist } from "./RequestBased.jsx";
jest.mock("antd", () => ({}));

test("request badge uses filtered total including zero instead of bootstrap count", () => {
  const { rerender } = render(
    <AppDataProvider
      value={{ requests: [], queueSummary: { pendingCount: 101 } }}
    >
      <ModeTabs mode="request" filteredCount={7} />
    </AppDataProvider>,
  );
  expect(
    screen.getByRole("tab", { name: /Request-Based/ }).textContent,
  ).toContain("7");
  rerender(
    <AppDataProvider
      value={{ requests: [], queueSummary: { pendingCount: 101 } }}
    >
      <ModeTabs mode="request" filteredCount={0} />
    </AppDataProvider>,
  );
  expect(
    screen.getByRole("tab", { name: /Request-Based/ }).textContent,
  ).toContain("0");
  expect(
    screen.getByRole("tab", { name: /Request-Based/ }).textContent,
  ).not.toContain("101");
});

test("filtered list reports all matching rows, not just the current page", async () => {
  const total = jest.fn();
  const services = {
    listPendingRequests: jest.fn().mockResolvedValue({ items: [], total: 21 }),
  };
  render(
    <AppDataProvider value={{ requests: [], queueSummary: {} }}>
      <RequestWorklist
        services={services}
        search="Name"
        page={1}
        hospitalServiceFilter="IPD"
        requestTypeFilter="Refund"
        onTotalChange={total}
      />
    </AppDataProvider>,
  );
  await waitFor(() => expect(total).toHaveBeenCalledWith(21));
  expect(services.listPendingRequests).toHaveBeenCalledWith(
    expect.objectContaining({
      search: "Name",
      hospitalService: "IPD",
      requestType: "Refund",
      page: 0,
      size: 10,
    }),
  );
});

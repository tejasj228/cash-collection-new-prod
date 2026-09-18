import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppDataProvider } from "../../../app/providers/AppDataProvider";
import { BillPreviewDialog } from "./BillPreviewDialog.jsx";

jest.mock("antd", () => ({
  Button: ({ children, icon, htmlType, ...props }) => (
    <button type={htmlType} {...props}>
      {children}
    </button>
  ),
}));

const billProps = {
  receiptNo: "REC-1001",
  patient: {
    name: "Preview Patient",
    cr: "379132600000001",
    age: "42",
    sex: "Male",
    category: "General",
  },
  lines: [
    {
      code: "LAB-1",
      name: "Investigation",
      group: "Laboratory",
      rate: 100,
      qty: 1,
      discount: 0,
    },
  ],
  total: 100,
  payment: { mode: "Cash", summary: "Cash" },
  requestType: "Receipt",
  cashier: "Cashier A",
};

const renderPreview = (callbacks = {}) =>
  render(
    <AppDataProvider
      value={{
        todayIso: "2026-09-18",
        facility: {
          name: "All India Institute of Medical Sciences, Mangalagiri",
        },
      }}
    >
      <BillPreviewDialog
        billProps={billProps}
        onPrint={callbacks.onPrint || jest.fn()}
        onClose={callbacks.onClose || jest.fn()}
      />
    </AppDataProvider>,
  );

test("shows the completed bill with print-again and close actions", () => {
  const onPrint = jest.fn();
  const onClose = jest.fn();
  renderPreview({ onPrint, onClose });

  expect(screen.getByRole("dialog", { name: "Bill preview" })).not.toBeNull();
  expect(screen.getByText("Preview Patient")).not.toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Print again" }));
  expect(onPrint).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("allows the preview to be closed with Escape", () => {
  const onClose = jest.fn();
  renderPreview({ onClose });

  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

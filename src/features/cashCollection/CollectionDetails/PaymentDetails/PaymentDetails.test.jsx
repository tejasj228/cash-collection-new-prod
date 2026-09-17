import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppDataProvider } from "../../../../app/providers/AppDataProvider";
import { PaymentCard } from "./PaymentDetails.jsx";

jest.mock("antd", () => ({
  Button: ({ children, icon, htmlType, ...props }) => (
    <button type={htmlType} {...props}>
      {children}
    </button>
  ),
  Input: ({ status, ...props }) => <input {...props} />,
}));

test.each(["Credit Card", "Debit Card", "UPI"])(
  "%s shows terminal controls and cannot collect before approval",
  (mode) => {
    render(
      <AppDataProvider
        value={{
          todayIso: "2026-09-17",
          paymentOptions: {
            modes: [mode],
            cardTypes: ["Credit Card", "Debit Card"],
            posTerminals: ["T1"],
            restrictionsByCategory: {},
          },
        }}
      >
        <PaymentCard
          paymentMode={mode}
          setPaymentMode={() => {}}
          total={500}
          requestType="Receipt"
          patient={{ cr: "123", category: "General" }}
          onConfirm={jest.fn()}
        />
      </AppDataProvider>,
    );
    expect(
      screen.getByRole("combobox", { name: /POS Terminal/ }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Initiate Payment" }),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: /Collect/ }).disabled).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Enter manual payment details" }),
    );
    if (mode !== "UPI")
      expect(screen.getByLabelText(/Card No./)).not.toBeNull();
  },
);

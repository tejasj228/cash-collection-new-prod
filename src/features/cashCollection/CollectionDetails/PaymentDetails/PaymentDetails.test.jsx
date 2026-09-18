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

test("Virtual Account requires payment details before collection", () => {
  render(
    <AppDataProvider
      value={{
        todayIso: "2026-09-17",
        paymentOptions: {
          modes: ["Virtual Account"],
          cardTypes: [],
          posTerminals: [],
          restrictionsByCategory: {},
        },
      }}
    >
      <PaymentCard
        paymentMode="Virtual Account"
        setPaymentMode={() => {}}
        total={500}
        requestType="Receipt"
        patient={{ cr: "123", category: "General" }}
        onConfirm={jest.fn()}
      />
    </AppDataProvider>,
  );

  const details = screen.getByRole("textbox", { name: /Payment Details/ });
  const collect = screen.getByRole("button", { name: /Collect/ });
  expect(details.required).toBe(true);
  expect(collect.disabled).toBe(true);
  expect(
    screen.getByText(/Enter the Virtual Account payment details to continue/),
  ).not.toBeNull();

  fireEvent.change(details, { target: { value: "VA-REF-2026-001" } });
  expect(collect.disabled).toBe(false);
});

import React from "react";
import { render, screen } from "@testing-library/react";
import { AppDataProvider } from "../../../app/providers/AppDataProvider";
import {
  amountInWords,
  paymentFacts,
  PrintableBill,
} from "./PrintableBill.jsx";

const baseProps = {
  receiptNo: "REC-2026-000418",
  patient: {
    name: "API Patient",
    cr: "379132600004512",
    age: "42",
    sex: "Male",
    category: "General",
    mobile: "9876543210",
    abhaNumber: "91-2345-6789-0123",
    department: "General Medicine",
  },
  lines: [
    {
      code: "LAB-0142",
      name: "Complete Blood Count",
      group: "Laboratory",
      rate: 350,
      qty: 1,
      discount: 0,
    },
  ],
  total: 350,
  requestType: "Receipt",
  documentDate: "2026-09-18T11:42:00+05:30",
  requestDate: "18/09/2026",
  hospitalService: "OPD",
  billingService: "Receipt / Service",
  raisingDepartment: "General Medicine",
  counter: "Cash Counter 03",
  cashier: "Meera Iyer",
};

const renderBill = (props = {}, facilityOverrides = {}) =>
  render(
    <AppDataProvider
      value={{
        todayIso: "2026-09-18",
        facility: {
          name: "All India Institute of Medical Sciences, Mangalagiri",
          subtitle: "अखिल भारतीय आयुर्विज्ञान संस्थान, मंगलगिरि",
          address: "Mangalagiri, Guntur District, Andhra Pradesh – 522503",
          ...facilityOverrides,
        },
      }}
    >
      <PrintableBill {...baseProps} {...props} />
    </AppDataProvider>,
  );

test("renders the approved AIIMS bill with API-backed patient and transaction fields", () => {
  renderBill({ payment: { mode: "Cash", summary: "Cash" } });
  expect(
    screen.getByText("All India Institute of Medical Sciences, Mangalagiri"),
  ).not.toBeNull();
  expect(
    screen.getByRole("img", { name: /All India Institute.*logo/i }),
  ).not.toBeNull();
  expect(screen.getByText("REC-2026-000418 / 0")).not.toBeNull();
  expect(screen.getByText("API Patient")).not.toBeNull();
  expect(screen.getByText("Complete Blood Count")).not.toBeNull();
  expect(screen.getAllByText("Meera Iyer")).toHaveLength(2);
  const crField = screen.getByText("CR No.").parentElement;
  const patientNameField = screen.getByText("Patient Name").parentElement;
  expect(crField.nextElementSibling).toBe(patientNameField);
  expect(
    crField.querySelector("strong").classList.contains("bill-emphasis"),
  ).toBe(true);
  expect(
    patientNameField
      .querySelector("strong")
      .classList.contains("bill-emphasis"),
  ).toBe(true);
  expect(screen.getByText("Less: Discount")).not.toBeNull();
  expect(screen.getByText("₹ 0.00")).not.toBeNull();
  expect(screen.queryByText(/Virtual Account\. Do not use/i)).toBeNull();
});

test("replaces a placeholder hospital name with the AIIMS Mangalagiri fallback", () => {
  renderBill({ payment: { mode: "Cash" } }, { name: "HBIMS Hospital" });

  expect(
    screen.getByText("All India Institute of Medical Sciences, Mangalagiri"),
  ).not.toBeNull();
  expect(screen.queryByText("HBIMS Hospital")).toBeNull();
  expect(
    screen.getByRole("img", { name: /All India Institute.*logo/i }),
  ).not.toBeNull();
});

test("prints structured manual POS details rather than an invented description", () => {
  const facts = paymentFacts({
    mode: "Credit Card",
    cardType: "Credit Card",
    terminalId: "T1",
    manualDetails: {
      bankName: "State Bank",
      cardLastFour: "4417",
      reference: "123456789",
      transactionDate: "18/09/2026",
      summary: "State Bank, 4417, 123456789, 18/09/2026, Credit Card",
    },
  });
  expect(facts).toMatchObject({
    card: "Credit Card ending 4417",
    terminal: "T1",
    reference: "123456789",
    transactionDate: "18/09/2026",
    details: "State Bank, 4417, 123456789, 18/09/2026, Credit Card",
  });
});

test("shows the bilingual warning only for Virtual Account", () => {
  renderBill({
    payment: {
      mode: "Virtual Account",
      description: "Virtual account settlement",
      summary: "Virtual Account",
    },
  });
  expect(
    screen.getByText(
      "NOTE: This payment is linked to the Virtual Account. Do not pay it.",
    ),
  ).not.toBeNull();
  expect(
    screen
      .getByText("Payment Details")
      .parentElement.classList.contains("bill-payment-details"),
  ).toBe(true);
  expect(screen.queryByText("MODE OF PAYMENT: VIRTUAL ACCOUNT")).toBeNull();
  expect(screen.getByText(/इसका भुगतान न करें/)).not.toBeNull();
  expect(screen.queryByText(/दोबारा/)).toBeNull();
});

test("uses Indian-number words and refund document code", () => {
  expect(amountInWords(2480)).toBe(
    "Rupees Two Thousand Four Hundred Eighty Only",
  );
  renderBill({
    requestType: "Refund",
    receiptNo: "REF-2026-000418",
    payment: { mode: "Cash" },
  });
  expect(screen.getByText("REF-2026-000418 / 1")).not.toBeNull();
});

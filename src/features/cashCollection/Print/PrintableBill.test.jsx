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
  ).toBe(false);
  expect(
    patientNameField
      .querySelector("strong")
      .classList.contains("bill-emphasis"),
  ).toBe(false);
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

test("hospital code selects the logo even when API names differ and all nonblank header fields render", () => {
  renderBill(
    { payment: { mode: "Cash" } },
    {
      hospitalCode: "37913",
      name: "Name from another database",
      shortName: "AIIMSM",
      city: "Manglagiri",
      state: "Andhra Pradesh",
      pincode: "801507",
      phone: "08645-280021",
      email: "itcell@aiimsmangalagiri.edu.in",
      stateCode: "37",
      fax: "",
      contactPerson: "",
    },
  );
  expect(
    screen.getByRole("img", { name: "Name from another database logo" }),
  ).not.toBeNull();
  expect(screen.getByText(/PIN: 801507/)).not.toBeNull();
  expect(screen.getByText(/08645-280021.*itcell@/)).not.toBeNull();
  expect(
    screen.getByText(/AIIMSM.*Hospital Code: 37913.*State Code: 37/),
  ).not.toBeNull();
  expect(screen.queryByText(/Fax:/)).toBeNull();
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

test("empty payment details print a dash instead of duplicating the mode", () => {
  expect(
    paymentFacts({ mode: "Cash", summary: "Cash", description: "  " }).details,
  ).toBe("—");
  renderBill({ payment: { mode: "Cash", summary: "Cash" } });
  expect(
    screen.getByText("Payment Details").parentElement.querySelector("strong")
      .textContent,
  ).toBe("—");
  const barcode = document.querySelector(".bill-patient-barcode");
  expect(barcode.nextElementSibling.className).toBe("aiims-bill-head");
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

test("retains all 32 tariff rows, removes Patient heading and encodes the CR barcode", () => {
  const lines = Array.from({ length: 32 }, (_, index) => ({
    code: `T${index}`,
    name: `Tariff ${index + 1}`,
    rate: 10,
    qty: 1,
    discount: 0,
  }));
  renderBill({ lines, total: 320, payment: { mode: "Cash" } });
  expect(screen.queryByRole("heading", { name: "Patient" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "S. No." })).not.toBeNull();
  expect(screen.getByText("Tariff 32")).not.toBeNull();
  expect(document.querySelectorAll(".bill-charges tbody tr")).toHaveLength(32);
  const barcode = screen.getByRole("img", {
    name: "CR number barcode 379132600004512",
  });
  expect(barcode.querySelectorAll('rect[fill="black"]').length).toBeGreaterThan(
    30,
  );
  expect(screen.queryByText(/Page 1 of 1/)).toBeNull();
});

test("API flag zero works for any mode while Net Payable remains unchanged", () => {
  renderBill({
    payment: {
      mode: "Hospital Waiver",
      receivedAmountFlag: "0",
      receivedAmount: 350,
      printNote: {
        title: "WAIVER",
        hindi: "भुगतान न करें।",
        english: "Do not pay this bill.",
      },
    },
  });
  const paid = document.querySelector(".bill-paid");
  const net = document.querySelector(".bill-net");
  expect(paid.textContent).toContain("₹ 0.00");
  expect(net.textContent).toContain("₹ 350.00");
  expect(screen.getByText("Do not pay this bill.")).not.toBeNull();
});

test("Exempted prototype policy prints zero received and its own bilingual note", () => {
  renderBill({ payment: { mode: "Exempted" } });
  expect(document.querySelector(".bill-paid").textContent).toContain("₹ 0.00");
  expect(
    screen.getByText("NOTE: This bill is exempted. Do not pay it."),
  ).not.toBeNull();
});

test("transaction configuration can disable a note and show a distinct received amount", () => {
  renderBill({
    payment: {
      mode: "Virtual Account",
      receivedAmountFlag: 1,
      receivedAmount: 100,
      printNote: null,
    },
  });
  expect(document.querySelector(".bill-paid").textContent).toContain(
    "₹ 100.00",
  );
  expect(document.querySelector(".virtual-payment-note")).toBeNull();
});

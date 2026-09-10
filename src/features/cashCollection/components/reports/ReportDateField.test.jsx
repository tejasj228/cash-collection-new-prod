import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportDateField } from "./ReportDateField";
import { isoFromDisplayDate } from "../../model/reportDates";

function Field() {
  const [value, setValue] = useState("03/09/2024");
  const iso = isoFromDisplayDate(value);
  return (
    <ReportDateField
      label="From Date"
      value={value}
      isoValue={iso}
      onChange={setValue}
      invalid={!iso}
      max="2024-09-30"
    />
  );
}

test("native calendar selection is displayed as DD/MM/YYYY", () => {
  render(<Field />);
  const calendar = screen.getByLabelText("Choose From Date");
  expect(calendar.type).toBe("date");
  expect(calendar.max).toBe("2024-09-30");
  fireEvent.change(calendar, { target: { value: "2024-09-12" } });
  expect(screen.getByLabelText("From Date").value).toBe("12/09/2024");
});

test.each([
  undefined,
  () => {
    throw new Error("Picker not allowed in frame");
  },
])(
  "typed entry works when showPicker is unavailable or denied",
  (showPicker) => {
    render(<Field />);
    const calendar = screen.getByLabelText("Choose From Date");
    calendar.showPicker = showPicker;
    fireEvent.click(calendar);
    fireEvent.change(screen.getByLabelText("From Date"), {
      target: { value: "15092024" },
    });
    expect(screen.getByLabelText("From Date").value).toBe("15/09/2024");
    expect(calendar.value).toBe("2024-09-15");
  },
);

test("impossible typed dates remain visible and invalid for correction", () => {
  render(<Field />);
  const text = screen.getByLabelText("From Date");
  fireEvent.change(text, { target: { value: "31/02/2024" } });
  expect(text.value).toBe("31/02/2024");
  expect(text.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByLabelText("Choose From Date").value).toBe("");
});

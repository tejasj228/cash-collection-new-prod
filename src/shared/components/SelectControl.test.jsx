import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectControl } from "./SelectControl";

const options = [
  { value: "cash-id", label: "Cash" },
  { value: "card-id", label: "Card" },
  { value: "upi-id", label: "UPI" },
  { value: "cheque-id", label: "Cheque — not permitted", disabled: true },
];

function PaymentModeField() {
  const [value, setValue] = useState("cash-id");
  return (
    <label>
      Payment Mode
      <SelectControl options={options} value={value} onChange={setValue} />
    </label>
  );
}

test("selects API option IDs and preserves the selected value across renders", async () => {
  const user = userEvent.setup();
  render(<PaymentModeField />);
  const select = screen.getByRole("combobox", { name: "Payment Mode" });
  expect(select.tagName).toBe("SELECT");
  await user.selectOptions(select, "card-id");
  expect(select.value).toBe("card-id");
  await user.selectOptions(select, "upi-id");
  expect(select.value).toBe("upi-id");
  await user.selectOptions(select, "cheque-id");
  expect(select.value).toBe("upi-id");
});

test("disabled controls cannot change the payment selection", async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  render(
    <SelectControl
      aria-label="Mode"
      options={options}
      value="cash-id"
      disabled
      onChange={onChange}
    />,
  );
  await user.selectOptions(screen.getByRole("combobox"), "card-id");
  expect(onChange).not.toHaveBeenCalled();
});

test("does not silently select the first option before API options arrive", () => {
  const onChange = jest.fn();
  const { rerender } = render(
    <SelectControl
      aria-label="Mode"
      options={[]}
      value=""
      onChange={onChange}
    />,
  );
  rerender(
    <SelectControl
      aria-label="Mode"
      options={options}
      value=""
      onChange={onChange}
    />,
  );
  expect(screen.getByRole("combobox").value).toBe("");
  expect(onChange).not.toHaveBeenCalled();
});

test("supports keyboard focus through the normal tab order", async () => {
  const user = userEvent.setup();
  render(<PaymentModeField />);
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("combobox"));
});

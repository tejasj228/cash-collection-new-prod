import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "./Dialogs";

jest.mock("../../../../shared/components/ui", () => ({
  Button: ({ children, onClick, disabled, type = "button" }) =>
    require("react").createElement(
      "button",
      { type, onClick, disabled },
      children,
    ),
}));
jest.mock("../../../../shared/components/FormFields", () => ({
  TextField: () => null,
}));

const renderDialog = (props = {}) =>
  render(
    <ConfirmDialog
      title="Confirm this collection?"
      lead="Review the payment."
      rows={[]}
      confirmLabel="Confirm"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

test("dismisses an ordinary payment confirmation from the backdrop", () => {
  jest.useFakeTimers();
  const onCancel = jest.fn();
  renderDialog({ onCancel });

  fireEvent.mouseDown(screen.getByRole("dialog").parentElement);
  act(() => jest.advanceTimersByTime(200));

  expect(onCancel).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test("keeps an automatic POS confirmation locked", () => {
  jest.useFakeTimers();
  const onCancel = jest.fn();
  renderDialog({ dismissible: false, onCancel });

  fireEvent.mouseDown(screen.getByRole("dialog").parentElement);
  fireEvent.keyDown(window, { key: "Escape" });
  act(() => jest.advanceTimersByTime(200));

  expect(onCancel).not.toHaveBeenCalled();
  jest.useRealTimers();
});

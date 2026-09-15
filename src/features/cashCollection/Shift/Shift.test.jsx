import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShiftEndDialog } from "./Shift.jsx";

jest.mock("../../../shared/components/ui", () => ({
  Button: ({ children, onClick, disabled, type = "button" }) =>
    require("react").createElement(
      "button",
      { type, onClick, disabled },
      children,
    ),
}));

const summary = {
  collectionCount: 2,
  refundCount: 0,
  net: 700,
  cashCollected: 700,
};

beforeEach(() => {
  window.print = jest.fn();
});

test("requires denomination reconciliation before ending a shift", async () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <ShiftEndDialog
      summary={summary}
      dateLabel="10 Sep 2026"
      preparation={{
        shiftId: "shift-1",
        version: "v1",
        expectedCash: "700.00",
        canClose: true,
        blockers: [],
        previousSubmittedCash: "0.00",
        cumulativeExpectedCash: "700.00",
        segmentNumber: "1",
        denominations: [
          { code: "NOTE_500", kind: "NOTE", value: "500", label: "₹500" },
          { code: "NOTE_200", kind: "NOTE", value: "200", label: "₹200" },
        ],
      }}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

  const continueButton = screen.getByRole("button", { name: "Continue" });
  expect(continueButton.disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "End shift" })).toBeNull();
  expect(screen.getByText("Cash in Drawer")).toBeTruthy();
  expect(screen.queryByText("Previously submitted")).toBeNull();

  fireEvent.change(screen.getByLabelText("₹500 note quantity"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("₹200 note quantity"), {
    target: { value: "1" },
  });

  expect(continueButton.disabled).toBe(false);
  fireEvent.click(continueButton);
  fireEvent.click(screen.getByRole("button", { name: "End shift" }));

  expect(onConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ expectedCash: 700, countedCash: 700 }),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(window.print).toHaveBeenCalled();
});

test("allows denomination entry to be skipped", async () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <ShiftEndDialog
      summary={summary}
      dateLabel="10 Sep 2026"
      preparation={{
        shiftId: "shift-2",
        version: "v2",
        expectedCash: "100.00",
        previousSubmittedCash: "1000.00",
        cumulativeExpectedCash: "1100.00",
        segmentNumber: "2",
        canClose: true,
        blockers: [],
        denominations: [
          { code: "NOTE_100", kind: "NOTE", value: "100", label: "₹100" },
        ],
      }}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

  fireEvent.click(
    screen.getByRole("checkbox", { name: /Skip manual note and coin count/ }),
  );
  expect(screen.getByText("Previously submitted")).toBeTruthy();
  expect(screen.getByText("Total for today")).toBeTruthy();
  expect(screen.getByLabelText("₹100 note quantity").disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "End shift" }));

  expect(onConfirm).toHaveBeenCalledWith(
    expect.objectContaining({
      reconciliationMode: "SKIPPED",
      countedCash: null,
      denominations: [],
    }),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(window.print).toHaveBeenCalled();
});

test("ending a shift left open from an earlier day shows the stale-shift messaging and a start-new-shift prompt", async () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const onStartNewShift = jest.fn();
  render(
    <ShiftEndDialog
      summary={summary}
      dateLabel="12 Sep 2026"
      isStaleShift
      staleDateLabel="10 Sep 2026"
      preparation={{
        shiftId: "shift-stale",
        version: "v1",
        expectedCash: "700.00",
        canClose: true,
        blockers: [],
        previousSubmittedCash: "0.00",
        cumulativeExpectedCash: "700.00",
        segmentNumber: "1",
        denominations: [
          { code: "NOTE_500", kind: "NOTE", value: "500", label: "₹500" },
          { code: "NOTE_200", kind: "NOTE", value: "200", label: "₹200" },
        ],
      }}
      onConfirm={onConfirm}
      onStartNewShift={onStartNewShift}
      onClose={onClose}
    />,
  );

  expect(screen.getByText(/This shift was opened on 10 Sep 2026/)).toBeTruthy();

  fireEvent.change(screen.getByLabelText("₹500 note quantity"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("₹200 note quantity"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "End shift" }));

  expect(await screen.findByText("Shift ended")).toBeTruthy();
  expect(
    screen.getByText(/successfully ended the shift for 10 Sep 2026/),
  ).toBeTruthy();
  expect(window.print).toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Start today's shift" }));
  expect(onStartNewShift).toHaveBeenCalled();
});

test("treats denomination counts as cash deducted for a refund-only segment", async () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <ShiftEndDialog
      summary={{ ...summary, collectionCount: 0, refundCount: 1 }}
      dateLabel="10 Sep 2026"
      preparation={{
        shiftId: "shift-refund",
        version: "v3",
        expectedCash: "-120.00",
        previousSubmittedCash: "1000.00",
        cumulativeExpectedCash: "880.00",
        segmentNumber: "2",
        canClose: true,
        blockers: [],
        denominations: [
          { code: "NOTE_100", kind: "NOTE", value: "100", label: "₹100" },
          { code: "COIN_20", kind: "COIN", value: "20", label: "₹20" },
        ],
      }}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

  expect(screen.getByText("Remaining").closest("div").textContent).toContain(
    "₹-120.00",
  );
  fireEvent.change(screen.getByLabelText("₹100 note quantity"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("₹20 coin quantity"), {
    target: { value: "1" },
  });

  expect(screen.getByText("Matched")).toBeTruthy();
  expect(screen.getByText("₹-100.00")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "End shift" }));

  expect(onConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ expectedCash: -120, countedCash: -120 }),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(window.print).toHaveBeenCalled();
});

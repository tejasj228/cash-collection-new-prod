import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TopNav } from "./CashCollection.jsx";

jest.mock("antd", () => ({}));

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/cash-collection/collection" }),
  useNavigate: () => jest.fn(),
}));

describe("cash collection top nav", () => {
  test("brand returns to collection home through the reset action", () => {
    const onHome = jest.fn();
    const onNavigate = jest.fn();
    render(
      <TopNav active="dashboard" onHome={onHome} onNavigate={onNavigate} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Cash Collection home" }),
    );
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });
  test("marks the active section link", () => {
    render(<TopNav active="dashboard" />);
    expect(
      screen.getByRole("button", { name: "Dashboard" }).className,
    ).toContain("is-active");
    expect(
      screen.getByRole("button", { name: "Collection" }).className,
    ).not.toContain("is-active");
  });

  test("navigates when a link is clicked", () => {
    const onNavigate = jest.fn();
    render(<TopNav active="dashboard" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Collection" }));
    expect(onNavigate).toHaveBeenCalledWith("collection");
  });

  test("fires the End Shift action", () => {
    const onEndShift = jest.fn();
    render(<TopNav active="collection" onEndShift={onEndShift} />);
    fireEvent.click(screen.getByRole("button", { name: /End Shift/ }));
    expect(onEndShift).toHaveBeenCalled();
  });

  test("changes the action to Start Shift after closing", () => {
    render(<TopNav active="collection" shiftEnded />);
    expect(
      screen.getByRole("button", { name: /Start Shift/ }).className,
    ).toContain("is-start-shift");
  });

  test("only shows the reprint action once the shift has ended", () => {
    const { rerender } = render(<TopNav active="collection" />);
    expect(
      screen.queryByRole("button", { name: /Reprint Receipt/ }),
    ).toBeNull();

    const onReprint = jest.fn();
    rerender(<TopNav active="collection" shiftEnded onReprint={onReprint} />);
    fireEvent.click(screen.getByRole("button", { name: /Reprint Receipt/ }));
    expect(onReprint).toHaveBeenCalled();
  });
});

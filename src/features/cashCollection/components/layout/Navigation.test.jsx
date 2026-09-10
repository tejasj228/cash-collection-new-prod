import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TopNav } from "./Navigation";

describe("cash collection top nav", () => {
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
});

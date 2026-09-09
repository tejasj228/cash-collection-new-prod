import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./Navigation";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("cash collection breadcrumb", () => {
  test("keeps Billing as context and links the cash collection levels", () => {
    render(<TopBar page="Overview" />);

    expect(screen.getByText("Billing").closest("a")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Cash Collection" })
        .getAttribute("href"),
    ).toBe("/cash-collection/collection");
    expect(
      screen.getByRole("link", { name: "Overview" }).getAttribute("href"),
    ).toBe("/cash-collection/overview");
  });

  test("returns an open collection flow to the collection landing page", () => {
    const onNavigate = jest.fn();
    render(<TopBar page="Collection" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Collection" }));
    expect(onNavigate).toHaveBeenCalledWith("collection");
  });
});

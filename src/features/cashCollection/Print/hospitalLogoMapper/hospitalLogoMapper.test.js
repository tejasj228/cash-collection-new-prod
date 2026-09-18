import { getHospitalLogo } from "./hospitalLogoMapper";

test("maps the API hospital name to its bundled logo", () => {
  expect(
    getHospitalLogo("All India Institute of Medical Sciences, Mangalagiri"),
  ).toContain("aiims-mangalagiri-logo.svg");
});

test("normalizes the hospital name before matching", () => {
  expect(getHospitalLogo("  AIIMS, MANGALAGIRI  ")).toContain(
    "aiims-mangalagiri-logo.svg",
  );
});

test("does not show the wrong logo for an unmapped hospital", () => {
  expect(getHospitalLogo("Unmapped Hospital")).toBeNull();
});

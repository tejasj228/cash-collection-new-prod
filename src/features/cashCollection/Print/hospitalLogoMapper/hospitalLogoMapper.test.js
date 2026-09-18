import { getHospitalLogo } from "./hospitalLogoMapper";

test("maps the stable API hospital code to its bundled logo", () => {
  expect(getHospitalLogo(37913)).toContain("aiims-mangalagiri-logo.svg");
});

test("accepts trimmed string codes", () => {
  expect(getHospitalLogo(" 37913 ")).toContain("aiims-mangalagiri-logo.svg");
});

test("does not show the wrong logo for an unmapped hospital", () => {
  expect(getHospitalLogo("99999")).toBeNull();
  expect(getHospitalLogo("AIIMS Mangalagiri")).toBeNull();
});

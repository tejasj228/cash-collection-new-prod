import aiimsMangalagiriLogo from "../../../../assets/hospitalLogos/aiims-mangalagiri-logo.svg";

const normalizeHospitalName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const HOSPITAL_LOGOS_BY_NAME = new Map(
  [
    "All India Institute of Medical Sciences, Mangalagiri",
    "AIIMS Mangalagiri",
  ].map((hospitalName) => [
    normalizeHospitalName(hospitalName),
    aiimsMangalagiriLogo,
  ]),
);

export function getHospitalLogo(hospitalName) {
  return (
    HOSPITAL_LOGOS_BY_NAME.get(normalizeHospitalName(hospitalName)) || null
  );
}

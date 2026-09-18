import aiimsMangalagiriLogo from "../../../../assets/hospitalLogos/aiims-mangalagiri-logo.svg";

const HOSPITAL_LOGOS_BY_CODE = new Map([["37913", aiimsMangalagiriLogo]]);

export function getHospitalLogo(hospitalCode) {
  return HOSPITAL_LOGOS_BY_CODE.get(String(hospitalCode ?? "").trim()) || null;
}

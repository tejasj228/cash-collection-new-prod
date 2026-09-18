import {
  fetchLegacyHospitalDetails,
  mapLegacyHospitalDetails,
} from "./legacyHbimsHospitalDetails";
import { fetchLegacyJson } from "../utilities/sessionService";
jest.mock("../utilities/sessionService", () => ({
  fetchLegacyJson: jest.fn(),
  HOSPITAL_DETAILS_URL: "/hospitaldetails",
}));

test("maps all supplied hospital fields without replacing Unicode or conflicting PIN data", async () => {
  const row = {
    hospcode: 37913,
    hospitalname: "Different DB spelling",
    hospitalnamehindiunicode: "அக்ரிப்லேவின் பிபிசி 73",
    hospitalshortname: "AIIMSM",
    address1: "MG Campus,",
    address2: "Andhra Pradesh - 522503",
    city: "Manglagiri",
    state: "Andhra Pradesh",
    statecode: 37,
    pincode: 801507,
    phone: "08645-280021",
    email: "itcell@aiimsmangalagiri.edu.in",
    fax: " ",
    contactperson: " ",
  };
  fetchLegacyJson.mockResolvedValue({ status: "success", data: [row] });
  expect(await fetchLegacyHospitalDetails()).toEqual({
    hospitalCode: "37913",
    name: row.hospitalname,
    subtitle: row.hospitalnamehindiunicode,
    shortName: "AIIMSM",
    address: "MG Campus, Andhra Pradesh - 522503",
    city: "Manglagiri",
    state: "Andhra Pradesh",
    stateCode: "37",
    pincode: "801507",
    phone: row.phone,
    email: row.email,
    fax: "",
    contactPerson: "",
  });
  expect(fetchLegacyJson).toHaveBeenCalledWith("/hospitaldetails");
});

test("invalid hospital responses reject instead of inventing a facility", async () => {
  expect(() => mapLegacyHospitalDetails({ hospitalname: "Name" })).toThrow(
    "hospital code",
  );
  fetchLegacyJson.mockResolvedValue({ status: "success", data: [] });
  await expect(fetchLegacyHospitalDetails()).rejects.toThrow(
    "valid hospital details",
  );
});

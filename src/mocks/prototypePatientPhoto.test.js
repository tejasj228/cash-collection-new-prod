import { withPrototypePatientPhoto } from "./prototypePatientPhoto";
import { mapLegacyPatientInfoRow } from "../services/legacyHbimsPatientInfo";
import { mapPatientSearchWire } from "../features/cashCollection/services/apiWireMappers";

test("prototype image decorates all resolved patients without creating missing patients or replacing API photos", () => {
  expect(withPrototypePatientPhoto(null)).toBeNull();
  const first = withPrototypePatientPhoto({ cr: "1" });
  const second = withPrototypePatientPhoto({ cr: "2" });
  expect(first.photoUrl).toBeTruthy();
  expect(second.photoUrl).toBe(first.photoUrl);
  expect(
    withPrototypePatientPhoto({ cr: "1", photoUrl: "/api/photo/1" }).photoUrl,
  ).toBe("/api/photo/1");
});

test("both API adapters map optional photo URLs and leave absent photos empty", () => {
  expect(
    mapLegacyPatientInfoRow({ photo_url: " /api/photo/1 " }).photoUrl,
  ).toBe("/api/photo/1");
  expect(mapLegacyPatientInfoRow({}).photoUrl).toBeNull();
  expect(
    mapPatientSearchWire([{ cr_num: "1", photo_url: "/api/photo/1" }])[0]
      .photoUrl,
  ).toBe("/api/photo/1");
  expect(mapPatientSearchWire([{ cr_num: "2" }])[0].photoUrl).toBeNull();
});

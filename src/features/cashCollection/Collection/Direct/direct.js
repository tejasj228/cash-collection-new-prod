export const patientEpisodeType = (service) =>
  service?.id === "ipd" ? "IPD" : "OPD";

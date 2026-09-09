const displayDate = (iso) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const amountOf = (value) => Number(String(value).replace(/,/g, ""));

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const compactIdentifier = (value) => String(value ?? "").replace(/\s+/g, "");

const optionValue = (option) =>
  typeof option === "object" ? String(option.id) : String(option);

const optionLabel = (option) =>
  typeof option === "object" ? option.label : String(option);

const firstContextValue = (values, fallback = "") =>
  optionValue(Array.isArray(values) && values.length ? values[0] : fallback);

export {
  displayDate,
  amountOf,
  money,
  compactIdentifier,
  optionValue,
  optionLabel,
  firstContextValue,
};

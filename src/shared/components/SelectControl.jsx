import React from "react";

// Let the browser own option selection and keyboard interaction. A native
// popup does not depend on portal measurement, animation, or GPU compositing.
export function SelectControl({
  options = [],
  value,
  onChange,
  disabled = false,
  className = "",
  ...inputProps
}) {
  const selectedValue = String(value ?? "");
  const hasSelectedOption = options.some(
    (option) => String(option.value) === selectedValue,
  );

  return (
    <span
      className={`select-wrap native-select ${disabled ? "native-select-disabled" : ""} ${className}`.trim()}
    >
      <select
        {...inputProps}
        value={selectedValue}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {!hasSelectedOption && <option value={selectedValue} disabled hidden />}
        {options.map((option) => (
          <option
            key={String(option.value)}
            value={String(option.value)}
            disabled={Boolean(option.disabled)}
          >
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

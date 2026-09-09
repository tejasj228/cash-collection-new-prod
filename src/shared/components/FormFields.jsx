import React from "react";
import { Input, Select } from "antd";
import { optionLabel, optionValue } from "../utils/formatters";

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  required = false,
}) {
  const normalized = options.map((option) => ({
    value: optionValue(option),
    label: optionLabel(option),
  }));
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em>*</em>}
      </span>
      <Select
        className="select-wrap antd-select"
        value={String(value ?? "")}
        onChange={onChange}
        options={normalized}
        popupMatchSelectWidth={false}
      />
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  hint,
  required = false,
  mono = false,
  readOnly = false,
  inputMode,
  maxLength,
  invalid = false,
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em>*</em>}
      </span>
      <span className={`input-wrap ${mono ? "mono" : ""}`}>
        <Input
          variant="borderless"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          suffix={suffix}
          readOnly={readOnly}
          inputMode={inputMode}
          maxLength={maxLength}
          status={invalid ? "error" : undefined}
          aria-invalid={invalid || undefined}
        />
      </span>
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

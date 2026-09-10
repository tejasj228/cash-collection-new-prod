import React, { useId } from "react";
import { Input } from "antd";
import { optionLabel, optionValue } from "../utils/formatters";
import { SelectControl } from "./SelectControl";

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  required = false,
  disabled = false,
  className = "",
  ariaLabel,
}) {
  const controlId = useId();
  const normalized = options.map((option) => ({
    value: optionValue(option),
    label: optionLabel(option),
    disabled:
      option && typeof option === "object" ? Boolean(option.disabled) : false,
  }));
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={controlId}>
          {label}
          {required && <em>*</em>}
        </label>
      )}
      <SelectControl
        id={controlId}
        aria-label={ariaLabel}
        aria-describedby={hint ? `${controlId}-hint` : undefined}
        required={required}
        className={className}
        value={String(value ?? "")}
        onChange={onChange}
        options={normalized}
        disabled={disabled}
      />
      {hint && (
        <small id={`${controlId}-hint`} className="field-hint">
          {hint}
        </small>
      )}
    </div>
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

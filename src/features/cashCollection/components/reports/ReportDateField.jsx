import React, { useId } from "react";
import { Icon } from "../../../../shared/components/Icon";
import { formatDateInput } from "../../model/reportDates";

export function ReportDateField({
  label,
  value,
  onChange,
  isoValue,
  invalid,
  min,
  max,
}) {
  const id = useId();
  return (
    <div className="report-date-field">
      <label htmlFor={id}>{label}</label>
      <div className="report-date-control">
        <input
          id={id}
          className="report-date-text"
          value={value}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          maxLength={10}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(formatDateInput(event.target.value))}
        />
        <span className="report-native-calendar">
          <Icon name="calendar" size={16} />
          <input
            type="date"
            aria-label={`Choose ${label}`}
            title={`Choose ${label}`}
            value={isoValue || ""}
            min={min || undefined}
            max={max || undefined}
            onClick={(event) => {
              // Some browsers/embedded HBIMS frames deny showPicker. Keep the
              // real native input clickable, and typed date entry available.
              try {
                event.currentTarget.showPicker?.();
              } catch {
                // Native activation and the adjacent text input still work.
              }
            }}
            onChange={(event) => {
              const iso = event.target.value;
              if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
              const [year, month, day] = iso.split("-");
              onChange(`${day}/${month}/${year}`);
            }}
          />
        </span>
      </div>
    </div>
  );
}

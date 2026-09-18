import React, { useMemo } from "react";
import JsBarcode from "jsbarcode";

export function encodePatientBarcode(value) {
  const output = {};
  JsBarcode(output, value, { format: "CODE128", displayValue: false });
  return output.encodings.map((encoding) => encoding.data).join("");
}

export function PatientBarcode({ cr }) {
  const value = String(cr ?? "").trim();
  const bits = useMemo(
    () => (/^\d+$/.test(value) ? encodePatientBarcode(value) : null),
    [value],
  );
  if (!bits) return null;
  // Uniform scaling and uninterrupted bar runs preserve a compact scan target.
  const bars = [];
  for (let i = 0; i < bits.length;) {
    if (bits[i] !== "1") {
      i++;
      continue;
    }
    const start = i;
    while (bits[i] === "1") i++;
    bars.push({ x: start + 10, width: i - start });
  }
  return (
    <div className="bill-patient-barcode">
      <svg
        role="img"
        aria-label={`CR number barcode ${value}`}
        viewBox={`0 0 ${bits.length + 20} 36`}
        width={(bits.length + 20) * 1.5}
        height="54"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect width="100%" height="100%" fill="white" />
        {bars.map((bar) => (
          <rect
            key={bar.x}
            x={bar.x}
            y="0"
            width={bar.width}
            height="36"
            fill="black"
          />
        ))}
      </svg>
    </div>
  );
}

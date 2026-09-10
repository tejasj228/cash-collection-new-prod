import React, { useEffect, useState } from "react";
import { CountUp } from "../../../../shared/components/ui";

const money0 = (value) => `₹${Math.round(value).toLocaleString("en-IN")}`;

// Payment-mode donut. Hovering a segment previews it in the centre; clicking a
// segment or legend row cross-filters the whole dashboard by that mode.
export function DonutChart({ data, total, centreCount, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  const [drawn, setDrawn] = useState(false);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  const segments = data.map((row) => {
    const length = total ? (row.value / total) * circumference : 0;
    const segment = {
      ...row,
      length,
      offset: cursor,
      share: total ? Math.round((row.value / total) * 100) : 0,
    };
    cursor += length;
    return segment;
  });
  const highlight = hover || selected;
  const shown = highlight
    ? segments.find((segment) => segment.mode === highlight)
    : null;
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="donut-wrap" onMouseLeave={() => setHover(null)}>
      <svg
        className={`donut ${drawn ? "is-drawn" : ""}`}
        viewBox="0 0 140 140"
        role="img"
        aria-label={`Collection by payment mode, total ₹${total.toLocaleString("en-IN")}`}
      >
        <g transform="rotate(-90 70 70)">
          <circle className="donut-track" cx="70" cy="70" r={radius} />
          {segments.map((segment, index) => (
            <circle
              key={segment.mode}
              className={`donut-seg ${highlight && highlight !== segment.mode ? "dim" : ""} ${selected === segment.mode ? "picked" : ""}`}
              cx="70"
              cy="70"
              r={radius}
              style={{
                stroke: segment.color,
                strokeDasharray: drawn
                  ? `${segment.length} ${circumference - segment.length}`
                  : `0 ${circumference}`,
                strokeDashoffset: -segment.offset,
                transitionDelay: `${index * 90}ms`,
                cursor: onSelect ? "pointer" : "default",
              }}
              onMouseEnter={() => setHover(segment.mode)}
              onClick={() => onSelect?.(segment.mode)}
            />
          ))}
        </g>
        <text className="donut-value" x="70" y="70">
          <CountUp
            value={shown ? shown.value : total}
            format={money0}
            duration={900}
          />
        </text>
      </svg>
      <ul className="donut-legend">
        {segments.map((segment) => (
          <li
            key={segment.mode}
            className={`${highlight && highlight !== segment.mode ? "dim" : ""} ${selected === segment.mode ? "picked" : ""} ${onSelect ? "clickable" : ""}`.trim()}
            onMouseEnter={() => setHover(segment.mode)}
            onClick={() => onSelect?.(segment.mode)}
          >
            <span
              className="legend-dot"
              style={{ background: segment.color }}
            />
            <span className="legend-name">{segment.mode}</span>
            <span className="legend-share">
              <CountUp
                value={segment.share}
                format={(number) => `${Math.round(number)}%`}
                duration={900}
              />
            </span>
            <strong className="legend-amount">
              <CountUp value={segment.value} format={money0} duration={900} />
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

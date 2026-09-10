import React, { useEffect, useState } from "react";
import { CountUp } from "../../../../shared/components/ui";

const money0 = (value) => `₹${Math.round(value).toLocaleString("en-IN")}`;

// Generic donut + legend for a categorical breakdown (patient category,
// department, …). Slices and legend rows cross-filter when `onSelect` is set.
export function MiniPie({ items, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  const slices = items.map((item) => {
    const length = total
      ? (Math.max(0, item.value) / total) * circumference
      : 0;
    const slice = {
      ...item,
      length,
      offset: cursor,
      share: total ? Math.round((Math.max(0, item.value) / total) * 100) : 0,
    };
    cursor += length;
    return slice;
  });
  const highlight = hover || selected;
  const shown = highlight
    ? slices.find((slice) => slice.key === highlight)
    : null;
  const pick = (slice) => {
    if (!onSelect || slice.isOther) return;
    onSelect(slice.key);
  };

  if (!total)
    return (
      <div className="empty-state">
        <span>No collections</span>
      </div>
    );

  return (
    <div className="mini-pie" onMouseLeave={() => setHover(null)}>
      <svg
        className={`mini-pie-svg ${drawn ? "is-drawn" : ""}`}
        viewBox="0 0 140 140"
        role="img"
      >
        <g transform="rotate(-90 70 70)">
          <circle className="mini-pie-track" cx="70" cy="70" r={radius} />
          {slices.map((slice, index) => (
            <circle
              key={slice.key}
              className={`mini-pie-seg ${highlight && highlight !== slice.key ? "dim" : ""} ${selected === slice.key ? "picked" : ""}`}
              cx="70"
              cy="70"
              r={radius}
              style={{
                stroke: slice.color,
                strokeDasharray: drawn
                  ? `${slice.length} ${circumference - slice.length}`
                  : `0 ${circumference}`,
                strokeDashoffset: -slice.offset,
                transitionDelay: `${index * 80}ms`,
                cursor: onSelect ? "pointer" : "default",
              }}
              onMouseEnter={() => setHover(slice.key)}
              onClick={() => pick(slice)}
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
      <ul className="mini-pie-legend">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className={`${highlight && highlight !== slice.key ? "dim" : ""} ${selected === slice.key ? "picked" : ""} ${onSelect && !slice.isOther ? "clickable" : ""}`.trim()}
            onMouseEnter={() => setHover(slice.key)}
            onClick={() => pick(slice)}
          >
            <span className="legend-dot" style={{ background: slice.color }} />
            <span className="legend-name" title={slice.label}>
              {slice.label}
            </span>
            <span className="legend-share">
              <CountUp
                value={slice.share}
                format={(number) => `${Math.round(number)}%`}
                duration={900}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

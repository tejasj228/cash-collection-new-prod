import React from "react";
import { Button as AntButton } from "antd";
import { Icon } from "./Icon";
import { useCountUp } from "../hooks/useCountUp";

export function CountUp({ value, format = (n) => n, duration }) {
  const animated = useCountUp(value, duration ? { duration } : undefined);
  return <>{format(animated)}</>;
}

export function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  ...rest
}) {
  return (
    <AntButton
      htmlType={type}
      className={`button button-${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      icon={icon ? <Icon name={icon} size={15} /> : undefined}
      {...rest}
    >
      {children}
    </AntButton>
  );
}

export function Loader({ label, size = 44, className = "" }) {
  return (
    <div
      className={`app-loader ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span
        className="app-loader-ring"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span className="app-loader-ring-arc" />
        <span className="app-loader-ring-core" />
      </span>
      {label && <span className="app-loader-label">{label}</span>}
    </div>
  );
}

export function LoaderOverlay({ label = "Working…" }) {
  return (
    <div className="app-loader-overlay" role="status" aria-live="polite">
      <div className="app-loader-card">
        <Loader label={label} />
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 6, cols = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr
      key={`skeleton-${rowIndex}`}
      className="skeleton-row"
      aria-hidden="true"
    >
      {Array.from({ length: cols }, (_, colIndex) => (
        <td key={colIndex}>
          <span className="skeleton-bar" />
        </td>
      ))}
    </tr>
  ));
}

export function StatusPill({ children, tone = "green" }) {
  return (
    <span className={`status-pill ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

export function PageHeading({ title, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  meta,
  icon,
  tone,
  countValue,
  formatValue,
  className = "",
  onClick,
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`stat-card ${tone || ""} ${className}`.trim()}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <strong>
        {countValue != null && formatValue ? (
          <CountUp value={countValue} format={formatValue} />
        ) : (
          value
        )}
      </strong>
      <small>{meta}</small>
    </Tag>
  );
}

export function SortHeader({ label, field, sort, onToggle, align = "num" }) {
  const active = sort && sort.field === field;
  return (
    <th className={`${align} sortable ${active ? "sorted" : ""}`}>
      <button
        type="button"
        onClick={() => onToggle(field)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="sort-arrow">
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </button>
    </th>
  );
}

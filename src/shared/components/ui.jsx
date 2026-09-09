import React from "react";
import { Button as AntButton } from "antd";
import { Icon } from "./Icon";

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

export function StatCard({ label, value, meta, icon, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
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

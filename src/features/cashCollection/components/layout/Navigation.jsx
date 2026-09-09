import React from "react";
import { Icon } from "../../../../shared/components/Icon";

function SideRail({ active, onNavigate, collapsed, onToggle }) {
  const items = [
    ["cash", "Cash Collection", "cash"],
    ["overview", "Overview", "grid"],
    ["reports", "Reports", "chart"],
  ];
  return (
    <aside className={`side-rail ${collapsed ? "collapsed" : ""}`}>
      <div className="rail-head">
        <button
          className="rail-toggle"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <Icon name="menu" size={17} />
        </button>
      </div>
      <nav className="rail-nav">
        {items.map(([id, label, icon]) => (
          <button
            key={id}
            data-label={label}
            aria-label={label}
            aria-current={active === id ? "page" : undefined}
            className={`rail-item ${active === id ? "active" : ""}`}
            onClick={() => onNavigate?.(id)}
          >
            <span className="rail-icon">
              <Icon name={icon} size={18} />
            </span>
            <span className="rail-label">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ page }) {
  const trail =
    page === "Cash Collection"
      ? ["Billing", page]
      : ["Billing", "Cash Collection", page];
  return (
    <header className="topbar">
      <div className="topbar-leading">
        <div className="breadcrumb" aria-label="Current location">
          {trail.map((item, index) => (
            <React.Fragment key={item}>
              {index > 0 && <Icon name="chevron" size={12} />}
              <span className={index === trail.length - 1 ? "current" : ""}>
                {item}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </header>
  );
}

export { SideRail, TopBar };

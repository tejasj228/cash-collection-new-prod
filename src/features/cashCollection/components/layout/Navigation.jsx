import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../../shared/components/Icon";
import { CASH_COLLECTION_ROUTES } from "../../model/navigationRoutes";

function SideRail({ active, onNavigate, collapsed, onToggle }) {
  const items = [
    ["collection", "Collection", "cash"],
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

function TopBar({ page, onNavigate }) {
  const trail = [
    { label: "Billing" },
    {
      label: "Cash Collection",
      to: CASH_COLLECTION_ROUTES.collection,
      section: "collection",
    },
    {
      label: page,
      to:
        CASH_COLLECTION_ROUTES[page.toLowerCase()] ||
        CASH_COLLECTION_ROUTES.collection,
      section: page.toLowerCase(),
    },
  ];
  return (
    <header className="topbar">
      <div className="topbar-leading">
        <div className="breadcrumb" aria-label="Current location">
          {trail.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <Icon name="chevron" size={12} />}
              {item.to ? (
                <Link
                  to={item.to}
                  className={index === trail.length - 1 ? "current" : ""}
                  aria-current={index === trail.length - 1 ? "page" : undefined}
                  onClick={(event) => {
                    if (!onNavigate) return;
                    event.preventDefault();
                    onNavigate(item.section);
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </header>
  );
}

export { SideRail, TopBar };

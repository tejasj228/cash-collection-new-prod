import React from "react";
import { Icon } from "../../../../shared/components/Icon";

const LINKS = [
  ["collection", "Collection"],
  ["dashboard", "Dashboard"],
];

// A flat product header: brand on the left, section links in the middle with a
// sliding underline, End Shift on the right. Not the pill segmented control
// used for Request / Direct collection.
function TopNav({
  active,
  onNavigate,
  onEndShift,
  onReprint,
  shiftEnded = false,
}) {
  const activeIndex = Math.max(
    0,
    LINKS.findIndex(([id]) => id === active),
  );
  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <div className="top-nav-brand">
          <span className="top-nav-mark">
            <Icon name="wallet" size={15} />
          </span>
          Cash Collection
        </div>
        <nav
          className="top-nav-links"
          aria-label="Section"
          style={{ "--nav-active": activeIndex }}
        >
          <span className="top-nav-underline" aria-hidden="true" />
          {LINKS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={active === id ? "is-active" : ""}
              aria-current={active === id ? "page" : undefined}
              onClick={() => onNavigate?.(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="top-nav-actions">
          {shiftEnded && (
            <button
              type="button"
              className="button button-soft top-nav-reprint"
              onClick={onReprint}
            >
              <Icon name="print" size={15} />
              Reprint Receipt
            </button>
          )}
          <button
            type="button"
            className={`button top-nav-end-shift ${shiftEnded ? "is-start-shift" : ""}`}
            onClick={onEndShift}
          >
            <Icon name="power" size={15} />
            {shiftEnded ? "Start Shift" : "End Shift"}
          </button>
        </div>
      </div>
    </header>
  );
}

export { TopNav };

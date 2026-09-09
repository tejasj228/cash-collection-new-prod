import React from "react";

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const px = Math.round(size * 1.2);
  const common = {
    className: "icon",
    width: px,
    height: px,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 9h.01M18 15h.01" />
      </>
    ),
    receipt: (
      <>
        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </>
    ),
    users: (
      <>
        <path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20" />
        <circle cx="10" cy="7" r="3.5" />
        <path d="M16 4.5a3.4 3.4 0 0 1 0 6.5M20 19v-1.5a4.5 4.5 0 0 0-2.6-4.1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 3-3 3 2 5-6" />
        <path d="M18 8h2v2" />
      </>
    ),
    settings: (
      <>
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="M14.2 14.2 20 20" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m6 9 6 6 6-6" />,
    arrow: (
      <>
        <path d="M5 12h13M13 6l6 6-6 6" />
      </>
    ),
    back: (
      <>
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </>
    ),
    refund: (
      <>
        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
        <path d="M9.5 12.5 7.5 10.5l2-2" />
        <path d="M7.5 10.5H14a2.5 2.5 0 0 1 0 5h-1.5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="3.5" />
        <path d="M4 20.5a8 8 0 0 1 16 0" />
      </>
    ),
    stethoscope: (
      <>
        <path d="M4 3h3v6a5 5 0 0 0 10 0V3h3" />
        <path d="M12 14v1" />
        <circle cx="12" cy="18" r="3" />
      </>
    ),
    spark: (
      <>
        <path d="M10 4 12 9 17 11 12 13 10 18 8 13 3 11 8 9Z" />
        <path d="M19 16 19.8 17.2 21 18 19.8 18.8 19 20 18.2 18.8 17 18 18.2 17.2Z" />
      </>
    ),
    bed: (
      <>
        <path d="M3 19V5" />
        <path d="M3 9h16a2 2 0 0 1 2 2v8" />
        <path d="M3 15h18" />
        <path d="M7 9V6h4" />
      </>
    ),
    pulse: (
      <>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
        <path d="M4 7h14a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5v2" />
        <path d="M15 13h.01" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    filter: (
      <>
        <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v10M8 11l4 4 4-4" />
        <path d="M5 20h14" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5l3 1.5" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] || paths.info}</svg>;
}

export { Icon };

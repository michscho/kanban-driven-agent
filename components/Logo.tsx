'use client';

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      {/* Board background */}
      <rect
        x="4"
        y="6"
        width="32"
        height="28"
        rx="3"
        className="logo-board"
      />

      {/* Three Kanban columns */}
      <rect x="8" y="10" width="7" height="20" rx="1.5" className="logo-column" />
      <rect x="16.5" y="10" width="7" height="20" rx="1.5" className="logo-column" />
      <rect x="25" y="10" width="7" height="20" rx="1.5" className="logo-column" />

      {/* Cards in columns */}
      {/* Column 1 - backlog */}
      <rect x="9.5" y="12" width="4" height="3" rx="0.5" className="logo-card" />
      <rect x="9.5" y="16.5" width="4" height="3" rx="0.5" className="logo-card" />
      <rect x="9.5" y="21" width="4" height="3" rx="0.5" className="logo-card" />

      {/* Column 2 - in progress */}
      <rect x="18" y="12" width="4" height="3" rx="0.5" className="logo-card-active" />
      <rect x="18" y="16.5" width="4" height="3" rx="0.5" className="logo-card" />

      {/* Column 3 - done */}
      <rect x="26.5" y="12" width="4" height="3" rx="0.5" className="logo-card-done" />

      {/* AI sparkle indicator */}
      <circle cx="34" cy="8" r="4" className="logo-sparkle-bg" />
      <path
        d="M34 5.5L34.5 7.5L36.5 8L34.5 8.5L34 10.5L33.5 8.5L31.5 8L33.5 7.5L34 5.5Z"
        className="logo-sparkle"
      />
    </svg>
  );
}

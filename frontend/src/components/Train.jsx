import React, { useState, useRef, useLayoutEffect } from 'react';

// Formats minute values into HH:MM time strings
function formatMinutes(minutes) {
  if (minutes == null || isNaN(minutes)) return '--:--';
  const norm = Math.max(0, minutes) % 1440;
  const hh = Math.floor(norm / 60);
  const mm = norm % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Color liveries mapped to operational train statuses
const STATUS_PALETTES = {
  on_time: {
    primary: '#0284c7',
    secondary: '#0369a1',
    stripe: '#38bdf8',
    window: '#0f172a',
    windowTint: '#38bdf8',
  },
  delayed: {
    primary: '#d97706',
    secondary: '#b45309',
    stripe: '#fde68a',
    window: '#1c1917',
    windowTint: '#f59e0b',
  },
  reassigned: {
    primary: '#7e22ce',
    secondary: '#6b21a8',
    stripe: '#e9d5ff',
    window: '#1e102a',
    windowTint: '#c084fc',
  },
  conflict: {
    primary: '#dc2626',
    secondary: '#b91c1c',
    stripe: '#fecaca',
    window: '#2a0f0f',
    windowTint: '#ef4444',
  },
};

// Realistic SVG Train rendering component
export default function Train({
  train,
  isConflict,
  isSelected,
  onClick,
  leftPct,
  widthPct,
}) {
  const containerRef = useRef(null);
  const [pixelWidth, setPixelWidth] = useState(160);
  const [isHovered, setIsHovered] = useState(false);

  // Measure train element pixel width dynamically to scale coaches
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const initialWidth = containerRef.current.getBoundingClientRect().width;
    if (initialWidth > 0) {
      setPixelWidth(Math.round(initialWidth));
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setPixelWidth(Math.round(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Determine status color palette
  const statusKey = isConflict
    ? 'conflict'
    : train.status === 'delayed' || train.delay_minutes > 0
    ? 'delayed'
    : train.status === 'reassigned'
    ? 'reassigned'
    : 'on_time';

  const palette = STATUS_PALETTES[statusKey] || STATUS_PALETTES.on_time;

  // Calculate coach and locomotive lengths based on measured pixel width
  const height = 48;
  const isCompact = pixelWidth < 100;
  const locoWidth = isCompact ? Math.max(64, pixelWidth * 0.5) : Math.min(88, Math.max(64, pixelWidth * 0.35));
  const coachesAvailableWidth = Math.max(0, pixelWidth - locoWidth);
  const coachTargetWidth = 55;
  const numCoaches = isCompact ? Math.max(1, Math.round(coachesAvailableWidth / 40)) : Math.max(1, Math.round(coachesAvailableWidth / coachTargetWidth));
  const actualCoachWidth = numCoaches > 0 ? coachesAvailableWidth / numCoaches : 0;

  const arrText = train.formatted_arrival || formatMinutes(train.arrival_time);
  const depText = train.formatted_departure || formatMinutes(train.departure_time);

  return (
    <div
      ref={containerRef}
      className={`realistic-train-block ${isConflict ? 'train-conflict-glow' : ''} ${
        isSelected ? 'is-selected' : ''
      }`}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${train.train_id} (${train.name}): ${arrText} - ${depText} [${statusKey.toUpperCase()}]`}
    >
      {/* Inline SVG drawing of locomotive and trailing coaches */}
      <svg
        className="train-svg"
        viewBox={`0 0 ${pixelWidth} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Headlight beam radial gradient */}
          <radialGradient id={`headlight-${train.train_id}`} cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Trailing Passenger Coaches (repeated to fill occupancy duration) */}
        {Array.from({ length: numCoaches }).map((_, idx) => {
          const coachX = idx * actualCoachWidth;
          const cW = actualCoachWidth;
          const bodyW = Math.max(12, cW - 3);

          return (
            <g key={`coach-${idx}`} transform={`translate(${coachX}, 0)`}>
              {/* Rubber gangway bellow connection between coaches */}
              <rect x="0" y="11" width="3" height="20" fill="#1e293b" rx="1" />

              {/* Coach aerodynamic body shell */}
              <rect
                x="3"
                y="8"
                width={bodyW}
                height="28"
                rx="3"
                fill={palette.primary}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="0.8"
              />

              {/* Coach accent color livery stripe */}
              <rect x="3" y="15" width={bodyW} height="2.5" fill={palette.stripe} opacity="0.95" />

              {/* Passenger entrance door */}
              {bodyW > 34 && (
                <g transform="translate(6, 11)">
                  <rect x="0" y="0" width="6" height="24" rx="1" fill={palette.secondary} />
                  <rect x="1" y="2" width="4" height="6" rx="1" fill={palette.window} />
                </g>
              )}

              {/* Passenger tinted windows with subtle glow */}
              {bodyW > 28 && (
                <g transform="translate(16, 11)">
                  <rect x="0" y="0" width={Math.max(6, (bodyW - 24) * 0.42)} height="7.5" rx="1.5" fill={palette.window} stroke={palette.windowTint} strokeWidth="0.5" />
                  <rect x={Math.max(8, (bodyW - 24) * 0.52)} y="0" width={Math.max(6, (bodyW - 24) * 0.42)} height="7.5" rx="1.5" fill={palette.window} stroke={palette.windowTint} strokeWidth="0.5" />
                </g>
              )}

              {/* Wheel Bogie 1 (Rear) */}
              <g transform="translate(9, 39)">
                <circle cx="0" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.5" fill="#f8fafc" />
                <circle cx="8" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                <circle cx="8" cy="0" r="1.5" fill="#f8fafc" />
              </g>

              {/* Wheel Bogie 2 (Front) */}
              {bodyW > 32 && (
                <g transform={`translate(${bodyW - 14}, 39)`}>
                  <circle cx="0" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill="#f8fafc" />
                  <circle cx="8" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="8" cy="0" r="1.5" fill="#f8fafc" />
                </g>
              )}
            </g>
          );
        })}

        {/* 2. Leading Locomotive (facing forward right towards departure) */}
        <g transform={`translate(${coachesAvailableWidth}, 0)`}>
          {/* Gangway coupler linking to preceding coach */}
          {numCoaches > 0 && (
            <rect x="0" y="11" width="3" height="20" fill="#1e293b" rx="1" />
          )}

          {/* Locomotive streamlined body shell with curved nose */}
          <path
            d={`
              M 3 8
              L ${locoWidth - 18} 8
              Q ${locoWidth - 3} 11, ${locoWidth} 23
              L ${locoWidth} 33
              L ${locoWidth - 4} 36
              L 3 36
              Z
            `}
            fill={palette.primary}
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="0.8"
          />

          {/* Locomotive roof profile & pantograph */}
          <path
            d="M 10 8 L 16 3 L 22 8"
            stroke="#94a3b8"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Aerodynamic livery stripe */}
          <path
            d={`M 3 15 L ${locoWidth - 14} 15 Q ${locoWidth - 4} 17, ${locoWidth} 24`}
            stroke={palette.stripe}
            strokeWidth="2.5"
            fill="none"
            opacity="0.95"
          />

          {/* Driver cab windshield */}
          <polygon
            points={`
              ${locoWidth - 18},10
              ${locoWidth - 8},13
              ${locoWidth - 5},20
              ${locoWidth - 17},19
            `}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="0.8"
          />

          {/* Train number identifier on the locomotive side */}
          <text
            x={Math.max(14, locoWidth * 0.35)}
            y="26"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="800"
            fontFamily="monospace"
            letterSpacing="0.04em"
          >
            {train.train_id}
          </text>

          {/* Forward glowing headlight */}
          <circle
            cx={locoWidth - 2}
            cy="25"
            r="3"
            fill="#fef08a"
            stroke="#eab308"
            strokeWidth="0.5"
          />

          {/* Headlight beam throw */}
          <polygon
            points={`
              ${locoWidth},25
              ${Math.min(pixelWidth, locoWidth + 16)},19
              ${Math.min(pixelWidth, locoWidth + 16)},31
            `}
            fill={`url(#headlight-${train.train_id})`}
          />

          {/* Locomotive Rear Bogie Wheels */}
          <g transform="translate(10, 39)">
            <circle cx="0" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="#f8fafc" />
            <circle cx="8" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="8" cy="0" r="1.5" fill="#f8fafc" />
          </g>

          {/* Locomotive Front Bogie Wheels */}
          <g transform={`translate(${locoWidth - 20}, 39)`}>
            <circle cx="0" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="#f8fafc" />
            <circle cx="8" cy="0" r="4.2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="8" cy="0" r="1.5" fill="#f8fafc" />
          </g>
        </g>
      </svg>

      {/* Train Informational Overlay (ID, Name, and Schedule directly visible on the train) */}
      <div className="train-info-overlay">
        <div className="train-info-top">
          <span className="train-label-id font-mono">{train.train_id}</span>
          <span className="train-label-time font-mono">{arrText}–{depText}</span>
        </div>
        <div className="train-label-name truncate">{train.name}</div>
      </div>

      {/* Delay pill badge if train is behind schedule */}
      {train.delay_minutes > 0 && (
        <div className="train-delay-pill">+{train.delay_minutes}m</div>
      )}

      {/* Floating glassmorphism tooltip on train hover */}
      {isHovered && (
        <div className="train-glass-tooltip" role="tooltip">
          <div className="tooltip-header">
            <span className="tooltip-id font-mono">{train.train_id}</span>
            <span className="tooltip-name truncate">{train.name}</span>
          </div>
          <div className="tooltip-grid">
            <div className="tooltip-row">
              <span className="tooltip-key">Platform:</span>
              <span className="tooltip-val highlight-cyan font-mono">
                {train.assigned_platform || 'UNASSIGNED'}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-key">Arrival:</span>
              <span className="tooltip-val font-mono">{arrText}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-key">Departure:</span>
              <span className="tooltip-val font-mono">{depText}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-key">Delay:</span>
              <span className={`tooltip-val font-mono ${train.delay_minutes > 0 ? 'highlight-delay' : ''}`}>
                {train.delay_minutes > 0 ? `+${train.delay_minutes} min` : '0 min'}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-key">Status:</span>
              <span className={`tooltip-status-pill status-${statusKey}`}>
                {isConflict ? 'CONFLICT' : (train.status || 'ON TIME').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

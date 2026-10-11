import React from 'react';

export default function MetricsBar({
  station,
  trainsCount,
  platformsCount,
  validationResult,
  noSolutionState,
  isReplanning,
}) {
  let badgeClass = 'badge-valid';
  let badgeText = 'SCHEDULE VALID';

  if (isReplanning) {
    badgeClass = 'badge-replan';
    badgeText = 'REPLANNING...';
  } else if (noSolutionState) {
    badgeClass = 'badge-nosolution';
    badgeText = 'NO SOLUTION';
  } else if (validationResult && !validationResult.is_valid) {
    badgeClass = 'badge-conflict';
    badgeText = `${validationResult.errors?.length || 0} CONFLICT(S)`;
  } else if (!validationResult) {
    badgeClass = 'badge-idle';
    badgeText = 'UNCHECKED';
  }

  return (
    <div className="metrics-bar">
      <div className="metric-card">
        <div className="metric-label">STATION</div>
        <div className="metric-value truncate" title={station?.station_name || 'Loading...'}>
          {station?.station_name || 'Central Grand Junction'}
        </div>
        <div className="metric-sub">{station?.station_id || 'STN_CENTRAL'}</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">ACTIVE PLATFORMS</div>
        <div className="metric-value font-mono">{platformsCount || 0}</div>
        <div className="metric-sub">Track bays available</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">SCHEDULED TRAINS</div>
        <div className="metric-value font-mono">{trainsCount || 0}</div>
        <div className="metric-sub">Active services</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">HEADWAY BUFFER</div>
        <div className="metric-value font-mono">
          {station?.minimum_gap_minutes ?? 5} min
        </div>
        <div className="metric-sub">Required min platform gap</div>
      </div>

      <div className="metric-card status-card">
        <div className="metric-label">VALIDATION STATUS</div>
        <div className={`metric-badge ${badgeClass}`}>
          <span className="badge-dot"></span>
          <span>{badgeText}</span>
        </div>
        <div className="metric-sub">
          {noSolutionState
            ? 'Solver: Infeasible'
            : validationResult?.is_valid
            ? 'Independent verification passed'
            : validationResult
            ? `${validationResult.summary?.conflict_count || 0} integrity violations`
            : 'Standby'}
        </div>
      </div>
    </div>
  );
}


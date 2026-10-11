import React, { useState, useMemo } from 'react';
import Train from './Train';

// Formats minute integers into 24-hour HH:MM format
function minutesToHhmm(minutes) {
  if (minutes == null || isNaN(minutes)) return '--:--';
  const norm = Math.max(0, minutes) % 1440;
  const hh = Math.floor(norm / 60);
  const mm = norm % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function PlatformTimeline({
  platforms = [],
  trains = [],
  closures = [],
  minimumGap = 5,
  validationErrors = [],
}) {
  const [selectedTrain, setSelectedTrain] = useState(null);

  // Set of train IDs involved in conflicts
  const conflictingTrainIds = useMemo(() => {
    const ids = new Set();
    validationErrors.forEach((err) => {
      if (err.train_ids) {
        err.train_ids.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [validationErrors]);

  // Compute dynamic timeline boundaries and ticks
  const { timelineStart, timelineEnd, totalDuration, timeTicks } = useMemo(() => {
    let minT = 600; // default 10:00
    let maxT = 720; // default 12:00

    const allTimes = [];
    trains.forEach((t) => {
      if (t.arrival_time != null) allTimes.push(t.arrival_time);
      if (t.departure_time != null) allTimes.push(t.departure_time);
    });
    closures.forEach((c) => {
      if (c.start_time != null) allTimes.push(c.start_time);
      if (c.end_time != null) allTimes.push(c.end_time);
    });

    if (allTimes.length > 0) {
      minT = Math.min(...allTimes);
      maxT = Math.max(...allTimes);
    }

    // Pad by 15 mins and align to 15-min intervals
    const start = Math.floor(Math.max(0, minT - 15) / 15) * 15;
    const end = Math.ceil((maxT + 15) / 15) * 15;
    const duration = Math.max(30, end - start);

    const ticks = [];
    for (let t = start; t <= end; t += 15) {
      ticks.push(t);
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDuration: duration,
      timeTicks: ticks,
    };
  }, [trains, closures]);

  // Calculate current time position for the vertical "now" line
  const nowPos = useMemo(() => {
    const now = new Date();
    const realMinutes = now.getHours() * 60 + now.getMinutes();
    const effectiveMinutes =
      realMinutes >= timelineStart && realMinutes <= timelineEnd
        ? realMinutes
        : timelineStart + Math.round(totalDuration * 0.32);
    const pct = Math.max(0, Math.min(100, ((effectiveMinutes - timelineStart) / totalDuration) * 100));
    return {
      minutes: effectiveMinutes,
      pct,
    };
  }, [timelineStart, timelineEnd, totalDuration]);

  return (
    <div className="timeline-container">
      {/* Header with Title and Status Color Legend */}
      <div className="timeline-header-bar">
        <div className="timeline-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>PLATFORM OCCUPANCY TIMELINE</span>
          <span className="timeline-legend">
            <span className="legend-item"><span className="legend-chip chip-ontime"></span> On Time</span>
            <span className="legend-item"><span className="legend-chip chip-delayed"></span> Delayed</span>
            <span className="legend-item"><span className="legend-chip chip-reassigned"></span> Reassigned</span>
            <span className="legend-item"><span className="legend-chip chip-conflict"></span> Conflict</span>
            <span className="legend-item"><span className="legend-chip chip-closed"></span> Closed Platform</span>
          </span>
        </div>
      </div>

      <div className="timeline-scroll-area">
        <div className="timeline-content-inner">
          {/* Time Axis Ruler */}
          <div className="timeline-ruler-row">
            <div className="timeline-platform-label-spacer">TRACK BAY</div>
            <div className="timeline-ruler-track">
              {timeTicks.map((t) => {
                const posPercent = ((t - timelineStart) / totalDuration) * 100;
                return (
                  <div
                    key={t}
                    className="timeline-tick"
                    style={{ left: `${posPercent}%` }}
                  >
                    <div className="tick-line"></div>
                    <div className="tick-label font-mono">{minutesToHhmm(t)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Lanes rendered as Railway Tracks */}
          <div className="timeline-lanes">
            {platforms.map((platform) => {
              const platformTrains = trains.filter(
                (tr) => tr.assigned_platform === platform.platform_id
              );
              const platformClosures = closures.filter(
                (c) => c.platform_id === platform.platform_id
              );

              return (
                <div key={platform.platform_id} className="timeline-lane">
                  {/* Platform Info Bay */}
                  <div className="platform-meta-cell">
                    <div className="platform-tag font-mono">{platform.platform_id}</div>
                    <div className="platform-name">{platform.name}</div>
                    {platform.description && (
                      <div className="platform-desc truncate">{platform.description}</div>
                    )}
                  </div>

                  {/* Railway Track Lane with Platform Edge Strip and Rails */}
                  <div className="track-lane">
                    {/* Platform edge tactile safety strip */}
                    <div className="platform-edge-strip">
                      <span className="platform-edge-tag font-mono">{platform.platform_id}</span>
                      <span className="platform-edge-tactile"></span>
                    </div>

                    {/* Timeline background vertical grid lines */}
                    {timeTicks.map((t) => {
                      const posPercent = ((t - timelineStart) / totalDuration) * 100;
                      return (
                        <div
                          key={`grid-${t}`}
                          className="lane-grid-line"
                          style={{ left: `${posPercent}%` }}
                        />
                      );
                    })}

                    {/* Railway Track Bed: Sleepers (ties) + 2 Steel Rails */}
                    <div className="railway-track-bed">
                      <div className="track-sleepers"></div>
                      <div className="steel-rail steel-rail-top"></div>
                      <div className="steel-rail steel-rail-bottom"></div>
                    </div>

                    {/* Closed Platform Overlay with Red/White Hazard Stripes */}
                    {platformClosures.map((cl, idx) => {
                      const leftPct = Math.max(
                        0,
                        ((cl.start_time - timelineStart) / totalDuration) * 100
                      );
                      const widthPct = Math.max(
                        3,
                        ((cl.end_time - cl.start_time) / totalDuration) * 100
                      );

                      return (
                        <div
                          key={cl.closure_id || `closure-${idx}`}
                          className="closure-block"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                          title={`Platform ${platform.platform_id} Closed: ${minutesToHhmm(
                            cl.start_time
                          )} - ${minutesToHhmm(cl.end_time)} (${cl.reason || 'Maintenance'})`}
                        >
                          <div className="closure-badge">
                            <span className="closure-hazard-icon">⚠️</span>
                            <span className="closure-title">Closed</span>
                            <span className="closure-times font-mono">
                              {minutesToHhmm(cl.start_time)}–{minutesToHhmm(cl.end_time)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Realistic SVG Train Occupancy Blocks */}
                    {platformTrains.map((tr) => {
                      const leftPct = Math.max(
                        0,
                        ((tr.arrival_time - timelineStart) / totalDuration) * 100
                      );
                      const widthPct = Math.max(
                        6,
                        ((tr.departure_time - tr.arrival_time) / totalDuration) * 100
                      );

                      const isConflict = conflictingTrainIds.has(tr.train_id);
                      const isSelected = selectedTrain?.train_id === tr.train_id;

                      return (
                        <Train
                          key={tr.train_id}
                          train={tr}
                          isConflict={isConflict}
                          isSelected={isSelected}
                          leftPct={leftPct}
                          widthPct={widthPct}
                          onClick={() => setSelectedTrain(isSelected ? null : tr)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vertical "Now" Time Indicator spanning across all platform tracks */}
          <div className="timeline-now-overlay">
            <div className="now-line-indicator" style={{ left: `${nowPos.pct}%` }}>
              <div className="now-pill font-mono">
                <span className="now-pulse-dot"></span>
                <span>NOW {minutesToHhmm(nowPos.minutes)}</span>
              </div>
              <div className="now-vertical-beam"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Train Inspector Drawer */}
      {selectedTrain && (
        <div className="train-inspector-bar">
          <div className="inspector-content">
            <div className="inspector-id">
              <span className="inspector-badge font-mono">{selectedTrain.train_id}</span>
              <span className="inspector-name">{selectedTrain.name}</span>
            </div>
            <div className="inspector-detail">
              <span className="detail-label">ROUTE:</span>
              <span className="detail-value">
                {selectedTrain.origin || 'Origin'} ➔ {selectedTrain.destination || 'Destination'}
              </span>
            </div>
            <div className="inspector-detail">
              <span className="detail-label">TIMES:</span>
              <span className="detail-value font-mono">
                {selectedTrain.formatted_arrival || minutesToHhmm(selectedTrain.arrival_time)} arr ➔{' '}
                {selectedTrain.formatted_departure || minutesToHhmm(selectedTrain.departure_time)} dep (
                {(selectedTrain.departure_time - selectedTrain.arrival_time)} min dwell)
              </span>
            </div>
            <div className="inspector-detail">
              <span className="detail-label">PLATFORM:</span>
              <span className="detail-value font-mono highlight-platform">
                {selectedTrain.assigned_platform || 'UNASSIGNED'}
              </span>
            </div>
            <div className="inspector-detail">
              <span className="detail-label">STATUS:</span>
              <span className={`detail-status-pill ${selectedTrain.status}`}>
                {selectedTrain.delay_minutes > 0
                  ? `Delayed (+${selectedTrain.delay_minutes} min)`
                  : selectedTrain.status.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            className="btn-close-inspector"
            onClick={() => setSelectedTrain(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

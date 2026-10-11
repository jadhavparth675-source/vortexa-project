import React, { useState } from 'react';

function minutesToHhmm(minutes) {
  if (minutes == null || isNaN(minutes)) return '--:--';
  const norm = Math.max(0, minutes) % 1440;
  const hh = Math.floor(norm / 60);
  const mm = norm % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function TimetableTable({ trains = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTrains = trains.filter((tr) => {
    const term = searchTerm.toLowerCase();
    return (
      tr.train_id.toLowerCase().includes(term) ||
      tr.name.toLowerCase().includes(term) ||
      (tr.assigned_platform && tr.assigned_platform.toLowerCase().includes(term)) ||
      (tr.origin && tr.origin.toLowerCase().includes(term)) ||
      (tr.destination && tr.destination.toLowerCase().includes(term))
    );
  });

  return (
    <div className="control-card timetable-table-panel">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>STATION TIMETABLE SCHEDULE</span>
        </div>
        <div className="table-search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Filter trains or platforms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="control-table">
            <thead>
              <tr>
                <th>TRAIN ID</th>
                <th>SERVICE NAME</th>
                <th>ORIGIN ➔ DESTINATION</th>
                <th>PLATFORM</th>
                <th>ARRIVAL</th>
                <th>DEPARTURE</th>
                <th>DWELL</th>
                <th>DELAY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrains.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-muted">
                    No matching train services found.
                  </td>
                </tr>
              ) : (
                filteredTrains.map((tr) => {
                  const dwell = tr.departure_time - tr.arrival_time;
                  let statusBadge = 'status-tag-ontime';
                  if (tr.status === 'delayed' || tr.delay_minutes > 0) {
                    statusBadge = 'status-tag-delayed';
                  } else if (tr.status === 'reassigned') {
                    statusBadge = 'status-tag-reassigned';
                  }

                  return (
                    <tr key={tr.train_id}>
                      <td className="font-mono font-bold">
                        <span className="train-id-badge">{tr.train_id}</span>
                      </td>
                      <td className="font-medium text-light">{tr.name}</td>
                      <td className="text-muted text-sm">
                        {tr.origin || 'Origin'} ➔ {tr.destination || 'Destination'}
                      </td>
                      <td>
                        <span className="platform-pill font-mono">
                          {tr.assigned_platform || 'UNASSIGNED'}
                        </span>
                      </td>
                      <td className="font-mono">
                        {tr.formatted_arrival || minutesToHhmm(tr.arrival_time)}
                      </td>
                      <td className="font-mono">
                        {tr.formatted_departure || minutesToHhmm(tr.departure_time)}
                      </td>
                      <td className="font-mono text-muted text-sm">{dwell} min</td>
                      <td>
                        {tr.delay_minutes > 0 ? (
                          <span className="delay-badge font-mono">+{tr.delay_minutes}m</span>
                        ) : (
                          <span className="font-mono text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-tag ${statusBadge}`}>
                          {tr.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


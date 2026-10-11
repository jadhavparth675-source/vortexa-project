import React from 'react';

export default function ChangeLogPanel({ changes = [] }) {
  return (
    <div className="control-card changelog-panel">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>TIMETABLE AUDIT CHANGE LOG</span>
        </div>
        <div className="card-header-badge font-mono">
          {changes.length} {changes.length === 1 ? 'CHANGE' : 'CHANGES'}
        </div>
      </div>

      <div className="card-body p-0">
        {changes.length === 0 ? (
          <div className="empty-changelog">
            <div className="empty-icon">✓</div>
            <div className="empty-title">Nominal Timetable</div>
            <div className="empty-desc">
              No active schedule adjustments. Timetable operating on standard base allocation.
            </div>
          </div>
        ) : (
          <div className="changelog-table-wrapper">
            <table className="changelog-table">
              <thead>
                <tr>
                  <th>TRAIN</th>
                  <th>TYPE</th>
                  <th>FIELD</th>
                  <th>MODIFICATION (OLD ➔ NEW)</th>
                  <th>EXPLANATION / REASON</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((ch, idx) => {
                  let badgeClass = 'badge-general';
                  if (ch.change_type === 'delay_applied') badgeClass = 'badge-delay';
                  if (ch.change_type === 'platform_reassigned') badgeClass = 'badge-reassign';

                  return (
                    <tr key={idx}>
                      <td className="font-mono font-bold">
                        <span className="train-id-pill">{ch.train_id}</span>
                      </td>
                      <td>
                        <span className={`change-badge ${badgeClass}`}>
                          {ch.change_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="font-mono text-muted">{ch.field}</td>
                      <td>
                        <div className="value-diff">
                          <span className="diff-old font-mono">{ch.old_value}</span>
                          <span className="diff-arrow">➔</span>
                          <span className="diff-new font-mono">{ch.new_value}</span>
                        </div>
                      </td>
                      <td className="change-reason-cell">
                        <span className="reason-text">{ch.reason}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


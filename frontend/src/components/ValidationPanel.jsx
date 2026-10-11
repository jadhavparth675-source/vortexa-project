import React from 'react';

function minutesToHhmm(minutes) {
  if (minutes == null || isNaN(minutes)) return '--:--';
  const norm = Math.max(0, minutes) % 1440;
  const hh = Math.floor(norm / 60);
  const mm = norm % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function ValidationPanel({
  validationResult,
  noSolutionState,
  onRevalidate,
  isValidating,
}) {
  return (
    <div className="control-card validation-panel">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>INDEPENDENT TIMETABLE VALIDATION</span>
        </div>
        <button
          className="btn-revalidate"
          onClick={onRevalidate}
          disabled={isValidating}
          title="Query POST /api/validate for authoritative validation"
        >
          {isValidating ? 'Validating...' : 'Re-Validate'}
        </button>
      </div>

      <div className="card-body">
        {/* Case 1: No Solution State */}
        {noSolutionState ? (
          <div className="validation-state-banner state-nosolution">
            <div className="state-banner-header">
              <span className="state-icon">⛔</span>
              <div>
                <div className="state-title">SOLVER RESULT: NO FEASIBLE SOLUTION</div>
                <div className="state-desc">
                  The constraint-based solver could not discover any conflict-free platform allocation satisfying minimum gaps and closure windows.
                </div>
              </div>
            </div>
            {noSolutionState.message && (
              <div className="state-detail-box font-mono">
                {noSolutionState.message}
              </div>
            )}
          </div>
        ) : validationResult?.is_valid ? (
          /* Case 2: Valid Timetable */
          <div className="validation-state-banner state-valid">
            <div className="state-banner-header">
              <span className="state-icon">✓</span>
              <div>
                <div className="state-title">SCHEDULE AUTHORITATIVELY VERIFIED</div>
                <div className="state-desc">
                  Independent timetable validator confirmed 0 platform overlaps, 0 closure clashes, and all minimum headway gaps satisfied.
                </div>
              </div>
            </div>

            <div className="validation-summary-grid">
              <div className="v-summary-item">
                <span className="v-label">Total Trains:</span>
                <span className="v-val font-mono">{validationResult.summary?.total_trains ?? 0}</span>
              </div>
              <div className="v-summary-item">
                <span className="v-label">Total Platforms:</span>
                <span className="v-val font-mono">{validationResult.summary?.total_platforms ?? 0}</span>
              </div>
              <div className="v-summary-item">
                <span className="v-label">Active Closures:</span>
                <span className="v-val font-mono">{validationResult.summary?.total_closures ?? 0}</span>
              </div>
              <div className="v-summary-item">
                <span className="v-label">Conflict Count:</span>
                <span className="v-val font-mono text-success">0</span>
              </div>
            </div>
          </div>
        ) : validationResult && !validationResult.is_valid ? (
          /* Case 3: Rejected / Integrity Conflicts */
          <div className="validation-state-banner state-invalid">
            <div className="state-banner-header">
              <span className="state-icon">✗</span>
              <div>
                <div className="state-title">TIMETABLE REJECTED — CONFLICTS DETECTED</div>
                <div className="state-desc">
                  Independent validation found {validationResult.errors?.length || 0} integrity violations in this timetable.
                </div>
              </div>
            </div>

            <div className="conflict-errors-list">
              {validationResult.errors?.map((err, i) => (
                <div key={i} className="conflict-card">
                  <div className="conflict-card-header">
                    <span className="conflict-code-badge font-mono">{err.code}</span>
                    {err.platform_id && (
                      <span className="conflict-platform font-mono">Platform {err.platform_id}</span>
                    )}
                  </div>
                  <div className="conflict-message">{err.message}</div>
                  <div className="conflict-meta-row">
                    {err.train_ids && err.train_ids.length > 0 && (
                      <span className="conflict-trains font-mono">
                        Trains: {err.train_ids.join(', ')}
                      </span>
                    )}
                    {err.conflict_time_start != null && err.conflict_time_end != null && (
                      <span className="conflict-time font-mono">
                        Window: {minutesToHhmm(err.conflict_time_start)} ➔{' '}
                        {minutesToHhmm(err.conflict_time_end)} ({err.conflict_time_start}m–{err.conflict_time_end}m)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="validation-state-banner state-idle">
            <div className="state-title">Validation Awaiting Input</div>
            <div className="state-desc">Click 'Re-Validate' to query the backend validator.</div>
          </div>
        )}
      </div>
    </div>
  );
}


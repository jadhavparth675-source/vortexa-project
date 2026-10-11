import React, { useState } from 'react';

const PRESET_EXAMPLES = [
  {
    label: 'Delay T101 by 20m',
    text: 'Train T101 delayed 20 min due to signal inspection',
  },
  {
    label: 'Close Platform P2',
    text: 'Platform P2 closed 10:15-10:45 for emergency track maintenance',
  },
  {
    label: 'Compound Disruption',
    text: 'Train T101 delayed 25 min and Platform P3 closed 10:00-10:30',
  },
  {
    label: 'Impossible Scenario (All Closed)',
    text: 'Platform P1 closed 10:00-11:30. Platform P2 closed 10:00-11:30. Platform P3 closed 10:00-11:30. Platform P4 closed 10:00-11:30',
  },
  {
    label: 'Ambiguous Query',
    text: 'Heavy rain reported in northern sector, potential delay soon',
  },
];

export default function DisruptionPanel({
  onParse,
  onApply,
  isParsing,
  isApplying,
  parsedPreview,
  onClearPreview,
}) {
  const [inputText, setInputText] = useState('');

  const handleSelectPreset = (text) => {
    setInputText(text);
    if (parsedPreview) {
      onClearPreview();
    }
  };

  const handleParseSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onParse(inputText);
  };

  const handleConfirmApply = () => {
    if (!parsedPreview || !parsedPreview.disruptions) return;
    onApply(parsedPreview.disruptions);
  };

  return (
    <div className="control-card disruption-panel">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>DISRUPTION INJECTION & PARSER</span>
        </div>
      </div>

      <div className="card-body">
        {/* Preset suggestions */}
        <div className="preset-container">
          <span className="preset-label">Quick Presets:</span>
          <div className="preset-buttons">
            {PRESET_EXAMPLES.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="btn-preset"
                onClick={() => handleSelectPreset(item.text)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleParseSubmit} className="disruption-form">
          <div className="form-group">
            <label className="form-label">
              Free-Text Disruption Report
              <span className="form-hint">Regex & dateparser NLP extraction</span>
            </label>
            <textarea
              className="disruption-textarea"
              rows={3}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (parsedPreview) onClearPreview();
              }}
              placeholder="e.g. Train T12 delayed 20 min. Platform P2 closed 10:00-11:00"
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-parse"
              disabled={isParsing || isApplying || !inputText.trim()}
            >
              {isParsing ? (
                <>
                  <span className="mini-spin">◌</span>
                  <span>Parsing Notice...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Parse Disruption</span>
                </>
              )}
            </button>

            {inputText && (
              <button
                type="button"
                className="btn-clear"
                onClick={() => {
                  setInputText('');
                  onClearPreview();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Confirmation Preview Section */}
        {parsedPreview && (
          <div className="preview-confirmation-box">
            <div className="preview-header">
              <div className="preview-title">
                <span className="preview-badge">CONFIRMATION PREVIEW</span>
                <span>Review Identified Disruptions Before Applying</span>
              </div>
              <div className="preview-req-tag">needs_confirmation: true</div>
            </div>

            {/* Warnings list */}
            {parsedPreview.warnings && parsedPreview.warnings.length > 0 && (
              <div className="preview-warnings-list">
                {parsedPreview.warnings.map((w, i) => (
                  <div key={i} className="warning-item">
                    <span className="warning-icon">⚠️</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Parsed disruptions list */}
            {parsedPreview.disruptions && parsedPreview.disruptions.length > 0 ? (
              <div className="disruptions-grid">
                {parsedPreview.disruptions.map((d, index) => (
                  <div key={index} className={`disruption-card ${d.type}`}>
                    <div className="disruption-card-header">
                      <span className="disruption-type-tag">
                        {d.type === 'train_delay' ? 'TRAIN DELAY' : 'PLATFORM CLOSURE'}
                      </span>
                      <span className="disruption-target font-mono">
                        {d.type === 'train_delay' ? d.train_id : d.platform_id}
                      </span>
                    </div>

                    <div className="disruption-card-body">
                      {d.type === 'train_delay' ? (
                        <div className="disruption-data-row">
                          <span className="data-key">Delay:</span>
                          <span className="data-val font-mono highlight-delay">
                            +{d.delay_minutes} minutes
                          </span>
                        </div>
                      ) : (
                        <div className="disruption-data-row">
                          <span className="data-key">Closed Interval:</span>
                          <span className="data-val font-mono highlight-closure">
                            {d.formatted_start} ➔ {d.formatted_end} ({d.start_time}m - {d.end_time}m)
                          </span>
                        </div>
                      )}

                      <div className="disruption-data-row">
                        <span className="data-key">Reason:</span>
                        <span className="data-val truncate">{d.reason || 'Reported disruption'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-preview-msg">
                No actionable disruptions parsed. Review warnings above or refine input text.
              </div>
            )}

            {/* Confirm / Cancel Buttons */}
            <div className="preview-footer-actions">
              <button
                type="button"
                className="btn-confirm-apply"
                onClick={handleConfirmApply}
                disabled={isApplying || !parsedPreview.disruptions?.length}
              >
                {isApplying ? (
                  <>
                    <span className="mini-spin">◌</span>
                    <span>Solving & Replanning Schedule...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Confirm & Apply Disruptions</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-cancel-preview"
                onClick={onClearPreview}
                disabled={isApplying}
              >
                Discard Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


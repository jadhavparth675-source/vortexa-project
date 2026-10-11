import React from 'react';

export default function AlertBanner({ type = 'error', message, onDismiss }) {
  if (!message) return null;

  return (
    <div className={`alert-banner alert-${type}`}>
      <div className="alert-content">
        <span className="alert-icon">
          {type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️'}
        </span>
        <span className="alert-message">{message}</span>
      </div>
      {onDismiss && (
        <button className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}


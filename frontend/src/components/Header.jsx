import React, { useState, useEffect } from 'react';
import { apiConfig } from '../services/api';

export default function Header({
  backendStatus,
  isMockMode,
  onToggleMock,
  onRefresh,
  loading,
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="control-header">
      <div className="header-brand">
        <div className="brand-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c-4 0-8 .5-8 4v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5v.5h12v-.5L16.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-4-4-8-4zm-4 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2-6H6V6h12v3z" />
          </svg>
        </div>
        <div>
          <div className="brand-title">
            RAILFLOW <span className="brand-tag">CONTROL ROOM</span>
          </div>
          <div className="brand-subtitle">
            Railway Disruption & Platform Conflict Simulator
          </div>
        </div>
      </div>

      <div className="header-actions">
        <div className="live-clock">
          <span className="clock-dot"></span>
          <span className="clock-digits">{timeStr || '00:00:00'} UTC</span>
        </div>

        <div className={`status-pill ${backendStatus.healthy ? 'status-online' : 'status-offline'}`}>
          <span className="status-indicator"></span>
          <span>{backendStatus.message || (backendStatus.healthy ? 'API Connected' : 'Offline')}</span>
        </div>

        <button
          className={`btn-toggle-mock ${isMockMode ? 'mock-active' : ''}`}
          onClick={onToggleMock}
          title="Toggle between Live FastAPI Backend and Mock Data"
        >
          {isMockMode ? 'Mock Data Mode: ON' : 'Live API Mode'}
        </button>

        <button
          className="btn-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Reload timetable and re-check health"
        >
          <svg
            className={loading ? 'spin' : ''}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Sync</span>
        </button>
      </div>
    </header>
  );
}


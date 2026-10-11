import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import PlatformTimeline from './components/PlatformTimeline';
import TimetableTable from './components/TimetableTable';
import DisruptionPanel from './components/DisruptionPanel';
import ChangeLogPanel from './components/ChangeLogPanel';
import ValidationPanel from './components/ValidationPanel';
import AlertBanner from './components/AlertBanner';

import {
  getHealth,
  getTimetable,
  validateTimetable,
  parseDisruptions,
  applyDisruptions,
  apiConfig,
} from './services/api';

import './App.css';

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [changes, setChanges] = useState([]);
  const [noSolutionState, setNoSolutionState] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);

  const [backendStatus, setBackendStatus] = useState({ healthy: false, message: 'Connecting...' });
  const [isMockMode, setIsMockMode] = useState(apiConfig.isMockMode());

  const [loading, setLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [alert, setAlert] = useState(null);

  // Tab navigation between Timeline and Timetable table view
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'table'

  // Load initial data from backend
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setAlert(null);
    try {
      // 1. Health check
      try {
        const health = await getHealth();
        setBackendStatus({ healthy: true, message: `${health.service} (${health.status})` });
      } catch (healthErr) {
        setBackendStatus({ healthy: false, message: 'Backend Offline' });
      }

      // 2. Fetch timetable
      const tt = await getTimetable();
      setTimetable(tt);
      setNoSolutionState(null);

      // 3. Independent validation
      try {
        const valRes = await validateTimetable(tt);
        setValidationResult(valRes);
      } catch (valErr) {
        console.warn('Initial validation warning:', valErr);
      }
    } catch (err) {
      console.error('Failed to load initial timetable:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to connect to backend server. Switch to Mock Mode or verify backend.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Toggle Mock Mode
  const handleToggleMock = () => {
    const nextMock = !isMockMode;
    apiConfig.setMockMode(nextMock);
    setIsMockMode(nextMock);
    setAlert({
      type: 'info',
      message: nextMock
        ? 'Switched to Mock Data Mode (FastAPI backend bypassed).'
        : 'Switched to Live API Mode (Connecting to FastAPI backend).',
    });
    setTimeout(() => {
      loadInitialData();
    }, 100);
  };

  // Re-validate current timetable
  const handleRevalidate = async () => {
    if (!timetable) return;
    setIsValidating(true);
    try {
      const res = await validateTimetable(timetable);
      setValidationResult(res);
      setAlert({
        type: res.is_valid ? 'info' : 'warning',
        message: res.is_valid
          ? 'Authoritative validation confirmed: timetable is valid & conflict-free.'
          : `Validation warning: ${res.errors?.length || 0} conflict(s) detected.`,
      });
    } catch (err) {
      setAlert({ type: 'error', message: `Validation request failed: ${err.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  // Parse disruption text
  const handleParse = async (text) => {
    setIsParsing(true);
    setAlert(null);
    try {
      const res = await parseDisruptions(text);
      setParsedPreview(res);
      if (res.warnings && res.warnings.length > 0) {
        setAlert({
          type: 'warning',
          message: `Parser warning: ${res.warnings.join(' | ')}`,
        });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to parse disruptions.' });
    } finally {
      setIsParsing(false);
    }
  };

  // Clear preview
  const handleClearPreview = () => {
    setParsedPreview(null);
  };

  // Apply disruptions and replan
  const handleApply = async (disruptions) => {
    if (!timetable) return;
    setIsApplying(true);
    setAlert(null);
    try {
      const res = await applyDisruptions({
        timetable,
        disruptions,
      });

      if (res.status === 'success' && res.timetable) {
        setTimetable(res.timetable);
        setChanges(res.changes || []);
        setValidationResult(res.validation || null);
        setNoSolutionState(null);
        setParsedPreview(null);

        setAlert({
          type: 'info',
          message: res.message || 'Timetable replanned and validated successfully.',
        });
      } else if (res.status === 'no_solution') {
        // Solver could not find feasible assignment
        setNoSolutionState({
          status: 'no_solution',
          message: res.message || 'No feasible platform assignment found for specified constraints.',
        });
        setChanges([]);
        setParsedPreview(null);

        setAlert({
          type: 'error',
          message: `Re-planning Impossible: ${res.message || 'No conflict-free schedule exists.'}`,
        });
      } else {
        setAlert({
          type: 'warning',
          message: res.message || 'Unexpected response status from scheduling solver.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Error occurred while applying disruptions.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="control-app-layout">
      {/* Decorative blurred background glowing blobs */}
      <div className="glass-blobs" aria-hidden="true">
        <div className="glass-blob glass-blob-1" />
        <div className="glass-blob glass-blob-2" />
        <div className="glass-blob glass-blob-3" />
      </div>

      {/* Top Header */}
      <Header
        backendStatus={backendStatus}
        isMockMode={isMockMode}
        onToggleMock={handleToggleMock}
        onRefresh={loadInitialData}
        loading={loading}
      />

      {/* Main Content Area */}
      <main className="control-main-container">
        {/* Alerts / Error Toasts */}
        {alert && (
          <AlertBanner
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        )}

        {/* Top Operational Metrics */}
        <MetricsBar
          station={timetable}
          trainsCount={timetable?.trains?.length || 0}
          platformsCount={timetable?.platforms?.length || 0}
          validationResult={validationResult}
          noSolutionState={noSolutionState}
          isReplanning={isApplying}
        />

        {/* View Switcher Tabs */}
        <div className="view-navigation-bar">
          <div className="tab-group">
            <button
              className={`tab-btn ${activeTab === 'timeline' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span>Platform Timeline (Visual Tracks)</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'table' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Timetable List ({timetable?.trains?.length || 0})</span>
            </button>
          </div>

          <div className="view-mode-hint">
            {activeTab === 'timeline'
              ? 'Real-time platform track occupancy visualization'
              : 'Complete tabular station service schedule'}
          </div>
        </div>

        {/* Primary View: Timeline or Table */}
        <div className="primary-view-container">
          {activeTab === 'timeline' ? (
            <PlatformTimeline
              platforms={timetable?.platforms || []}
              trains={timetable?.trains || []}
              closures={timetable?.platform_closures || []}
              minimumGap={timetable?.minimum_gap_minutes || 5}
              validationErrors={validationResult?.errors || []}
            />
          ) : (
            <TimetableTable trains={timetable?.trains || []} />
          )}
        </div>

        {/* Operations Split Grid: Disruption Input vs Validation & Audit */}
        <div className="operations-grid">
          {/* Left Column: Disruption Injection & Parser */}
          <div className="operations-col">
            <DisruptionPanel
              onParse={handleParse}
              onApply={handleApply}
              isParsing={isParsing}
              isApplying={isApplying}
              parsedPreview={parsedPreview}
              onClearPreview={handleClearPreview}
            />
          </div>

          {/* Right Column: Validation Status & Change Log Audit */}
          <div className="operations-col flex-col-stack">
            <ValidationPanel
              validationResult={validationResult}
              noSolutionState={noSolutionState}
              onRevalidate={handleRevalidate}
              isValidating={isValidating}
            />

            <ChangeLogPanel changes={changes} />
          </div>
        </div>
      </main>
    </div>
  );
}


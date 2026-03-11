// src/components/Toolbar.tsx
import { useState } from 'react';
import { useTreeStore } from '../store/treeStore';
import { ImportAnomalyDashboard } from './ImportAnomalyDashboard';
import { ImportDialog, type ImportIssueSnapshot } from './ImportDialog';
import { exportToExcel } from '../services/excelService';
import './Toolbar.css';

interface ToolbarProps {
  onOpenPrintPreview: () => void;
}

export function Toolbar({ onOpenPrintPreview }: ToolbarProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAnomalyDashboard, setShowAnomalyDashboard] = useState(false);
  const [latestImportSnapshot, setLatestImportSnapshot] = useState<ImportIssueSnapshot | null>(null);
  const [clearing, setClearing] = useState(false);
  const {
    searchNodesBy,
    loadNodes,
    filterNodesByLevel,
    filterLevel,
    searchQuery,
    setSearchQuery,
    clearAllNodes,
    undoLastAction,
    redoLastAction,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    loading,
  } = useTreeStore();

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setSearchQuery(trimmed);
      searchNodesBy(trimmed);
    } else {
      setSearchQuery('');
      loadNodes();
    }
  };

  const handleFilterLevel = (level: number | null) => {
    filterNodesByLevel(level);
  };

  const handleImportSuccess = () => {
    loadNodes();
  };

  const latestIssueCount = latestImportSnapshot
    ? latestImportSnapshot.result.errors.length + latestImportSnapshot.result.warnings.length
    : 0;

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'Warning: This will delete ALL data from the database!\n\nAre you sure you want to continue?'
    );

    if (!confirmed) return;

    setClearing(true);
    try {
      const count = await clearAllNodes();
      alert(`Successfully cleared ${count} nodes from database`);
    } catch (error) {
      alert(`Failed to clear database: ${error}`);
    } finally {
      setClearing(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h1 className="app-title">CMMS Staging Software</h1>
      </div>

      <div className="toolbar-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="btn btn-primary">
            Search
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              loadNodes();
            }}
            className="btn btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <label className="filter-label">Filter by Level:</label>
        <select
          value={filterLevel || ''}
          onChange={(e) => handleFilterLevel(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="filter-select"
        >
          <option value="">All Levels</option>
          {Array.from({ length: 16 }, (_, i) => i + 1).map((level) => (
            <option key={level} value={level}>Level {level}</option>
          ))}
        </select>
      </div>

      <div className="toolbar-section">
        <button
          onClick={() => void undoLastAction()}
          disabled={!canUndo || loading}
          className="btn btn-undo"
          title={canUndo ? `Undo the last edit operation (${undoCount} step${undoCount === 1 ? '' : 's'} available)` : 'No edit operation to undo'}
        >
          Undo ({undoCount})
        </button>
        <button
          onClick={() => void redoLastAction()}
          disabled={!canRedo || loading}
          className="btn btn-redo"
          title={canRedo ? `Redo the last undone edit operation (${redoCount} step${redoCount === 1 ? '' : 's'} available)` : 'No edit operation to redo'}
        >
          Redo ({redoCount})
        </button>
        <button onClick={() => setShowImportDialog(true)} className="btn btn-import">
          Import Excel
        </button>
        <button
          onClick={() => setShowAnomalyDashboard(true)}
          className="btn btn-anomaly"
          disabled={!latestImportSnapshot}
          title={latestImportSnapshot ? `Open anomaly dashboard (${latestIssueCount} issues in latest import)` : 'No import result available yet'}
        >
          Anomaly Dashboard{latestImportSnapshot ? ` (${latestIssueCount})` : ''}
        </button>
        <button onClick={handleExport} className="btn btn-export">
          Export Excel
        </button>
        <button onClick={onOpenPrintPreview} className="btn btn-print">
          Print / PDF
        </button>
        <button
          onClick={handleClearData}
          disabled={clearing || loading}
          className="btn btn-danger"
          title="Clear all data from database"
        >
          {clearing ? 'Clearing...' : 'Clear All Data'}
        </button>
      </div>

      <div className="toolbar-section toolbar-history-status">
        <span className="history-pill">Undo left: {undoCount}</span>
        <span className="history-pill">Redo available: {redoCount}</span>
      </div>

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={handleImportSuccess}
        onImportResult={(snapshot) => {
          setLatestImportSnapshot(snapshot);
          setShowAnomalyDashboard(true);
        }}
      />
      <ImportAnomalyDashboard
        isOpen={showAnomalyDashboard}
        snapshot={latestImportSnapshot}
        onClose={() => setShowAnomalyDashboard(false)}
      />
    </div>
  );
}

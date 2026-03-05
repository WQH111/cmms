// src/components/Toolbar.tsx
import { useState } from 'react';
import { useTreeStore } from '../store/treeStore';
import { ImportDialog } from './ImportDialog';
import { clearAllData } from '../services/database';
import { exportToExcel } from '../services/excelService';
import './Toolbar.css';

export function Toolbar() {
  const [searchInput, setSearchInput] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { searchNodesBy, loadNodes, filterNodesByLevel, filterLevel } = useTreeStore();

  const handleSearch = () => {
    if (searchInput.trim()) {
      searchNodesBy(searchInput);
    } else {
      loadNodes();
    }
  };

  const handleFilterLevel = (level: number | null) => {
    filterNodesByLevel(level);
  };

  const handleImportSuccess = () => {
    loadNodes(); // 重新加载数据
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      '⚠️ Warning: This will delete ALL data from the database!\n\nAre you sure you want to continue?'
    );

    if (!confirmed) return;

    setClearing(true);
    try {
      const count = await clearAllData();
      alert(`✅ Successfully cleared ${count} nodes from database`);
      loadNodes(); // 重新加载（应该是空的）
    } catch (error) {
      alert(`❌ Failed to clear database: ${error}`);
    } finally {
      setClearing(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel();
    } catch (error) {
      console.error('❌ Export error:', error);
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="btn btn-primary">
            Search
          </button>
          <button onClick={() => { setSearchInput(''); loadNodes(); }} className="btn btn-secondary">
            Clear
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <label className="filter-label">Filter by Level:</label>
        <select
          value={filterLevel || ''}
          onChange={(e) => handleFilterLevel(e.target.value ? parseInt(e.target.value) : null)}
          className="filter-select"
        >
          <option value="">All Levels</option>
          {Array.from({ length: 16 }, (_, i) => i + 1).map(level => (
            <option key={level} value={level}>Level {level}</option>
          ))}
        </select>
      </div>

      <div className="toolbar-section">
        <button onClick={() => setShowImportDialog(true)} className="btn btn-import">
          📥 Import Excel
        </button>
        <button onClick={handleExport} className="btn btn-export">
          📤 Export Excel
        </button>
        <button
          onClick={handleClearData}
          disabled={clearing}
          className="btn btn-danger"
          title="Clear all data from database"
        >
          {clearing ? '🔄 Clearing...' : '🗑️ Clear All Data'}
        </button>
      </div>

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}

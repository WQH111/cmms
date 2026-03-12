// src/components/ImportDialog.tsx
import { useState, useRef } from 'react';
import { importExcelFile, type ImportError, type ImportResult } from '../services/excelService';
import { createBackup } from '../services/backupService';
import './ImportDialog.css';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onImportResult?: (snapshot: ImportIssueSnapshot) => void;
}

export interface ImportIssueSnapshot {
  fileName: string;
  importedAt: string;
  backupId: string | null;
  result: ImportResult;
}

interface WarningBucket {
  id: string;
  title: string;
  count: number;
  tone: 'critical' | 'warning' | 'neutral';
}

function buildWarningBuckets(warnings: ImportError[]): WarningBucket[] {
  const hierarchyConflicts = warnings.filter((warning) => warning.field === 'Code (Function Number)');
  const trackedColumnGaps = warnings.filter(
    (warning) => warning.field === 'AN' || warning.field === 'AO'
  );
  const missingCodes = warnings.filter(
    (warning) =>
      warning.field.includes('(code)') &&
      warning.message.includes('missing code')
  );
  const emptyRows = warnings.filter((warning) => warning.message.includes('no level data'));
  const otherWarnings = warnings.filter(
    (warning) =>
      !hierarchyConflicts.includes(warning) &&
      !trackedColumnGaps.includes(warning) &&
      !missingCodes.includes(warning) &&
      !emptyRows.includes(warning)
  );

  const buckets: WarningBucket[] = [
    {
      id: 'hierarchy',
      title: 'Hierarchy Conflicts',
      count: hierarchyConflicts.length,
      tone: 'critical',
    },
    {
      id: 'tracked-columns',
      title: 'AN/AO Empty',
      count: trackedColumnGaps.length,
      tone: 'warning',
    },
    {
      id: 'missing-code',
      title: 'Missing Codes',
      count: missingCodes.length,
      tone: 'warning',
    },
    {
      id: 'empty-row',
      title: 'Empty Rows',
      count: emptyRows.length,
      tone: 'neutral',
    },
    {
      id: 'other',
      title: 'Other Warnings',
      count: otherWarnings.length,
      tone: 'warning',
    },
  ];

  return buckets.filter((bucket) => bucket.count > 0);
}

export function ImportDialog({ isOpen, onClose, onSuccess, onImportResult }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [backupId, setBackupId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const warningBuckets = result ? buildWarningBuckets(result.warnings) : [];
  const highRiskWarnings = result
    ? result.warnings.filter((warning) => warning.field === 'Code (Function Number)')
    : [];

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    console.log('🎬 Starting import process...');
    setImporting(true);
    setResult(null);

    try {
      // 1. Create backup
      console.log('💾 Creating backup...');
      const backup = await createBackup(`Pre-import backup - ${new Date().toLocaleString()}`);
      console.log('✅ Backup created:', backup);
      setBackupId(backup);

      // 2. Wait a moment to ensure backup is fully committed
      console.log('⏳ Waiting for backup to settle...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 200ms to 500ms

      // 3. Import data
      console.log('📥 Starting Excel import...');
      const importResult = await importExcelFile(file);
      console.log('✅ Import result:', importResult);
      setResult(importResult);
      onImportResult?.({
        fileName: file.name,
        importedAt: new Date().toISOString(),
        backupId: backup,
        result: importResult,
      });

      // 4. Refresh data if successful
      if (importResult.success && importResult.warnings.length === 0) {
        console.log('🎉 Import successful, refreshing data...');
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else if (importResult.success) {
        console.log('Import completed with warnings, keeping dialog open for review...');
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Import error:', error);
      setResult({
        success: false,
        imported: 0,
        errors: [
          {
            row: 0,
            field: 'file',
            message: `Import failed: ${error}`,
            severity: 'error',
          },
        ],
        warnings: [],
      });
    } finally {
      console.log('🏁 Import process finished');
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setBackupId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="import-dialog-overlay">
      <div className="import-dialog">
        <div className="import-dialog-header">
          <h2>Import Excel Data</h2>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="import-dialog-body">
          {/* File selection */}
          <div className="file-input-section">
            <label htmlFor="file-input" className="file-input-label">
              Select Excel File
            </label>
            <div className="file-input-wrapper">
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={importing}
                className="file-input-hidden"
              />
              <label htmlFor="file-input" className="file-input-button">
                📁 Choose File
              </label>
              {file && (
                <span className="file-selected-name">{file.name}</span>
              )}
            </div>
            {file && (
              <div className="file-info">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Import instructions */}
          <div className="import-instructions">
            <h3>Import Instructions</h3>
            <ul>
              <li>Supports Level 1-10 hierarchy data</li>
              <li>Automatic backup will be created before import</li>
              <li>System will validate data format and level continuity</li>
              <li>Duplicate nodes will be marked as warnings</li>
            </ul>
          </div>

          {/* Import result */}
          {result && (
            <div className={`import-result ${result.success ? 'success' : 'error'}`}>
              <h3>
                {result.success ? '✓ Import Successful' : '✗ Import Failed'}
              </h3>
              <p>Successfully imported: {result.imported} nodes</p>

              {result.errors.length > 0 && (
                <div className="error-list">
                  <h4>Errors ({result.errors.length})</h4>
                  <ul>
                    {result.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>
                        <strong>Row {error.row}</strong> - {error.field}: {error.message}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... and {result.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="warning-section">
                  <div className="warning-dashboard">
                    <div className="warning-dashboard-header">
                      <h4>Anomaly Dashboard</h4>
                      <span>{result.warnings.length} warnings detected</span>
                    </div>
                    <div className="warning-dashboard-grid">
                      {warningBuckets.map((bucket) => (
                        <div
                          key={bucket.id}
                          className={`warning-bucket warning-bucket-${bucket.tone}`}
                        >
                          <span className="warning-bucket-title">{bucket.title}</span>
                          <strong className="warning-bucket-count">{bucket.count}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {highRiskWarnings.length > 0 && (
                    <div className="warning-spotlight">
                      <h4>High-Risk Anomalies</h4>
                      <ul>
                        {highRiskWarnings.slice(0, 3).map((warning, idx) => (
                          <li key={idx}>
                            <strong>Row {warning.row}</strong> - {warning.message}
                          </li>
                        ))}
                        {highRiskWarnings.length > 3 && (
                          <li>... and {highRiskWarnings.length - 3} more hierarchy conflicts</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="warning-list">
                    <h4>Warnings ({result.warnings.length})</h4>
                    <ul>
                      {result.warnings.slice(0, 5).map((warning, idx) => (
                        <li key={idx}>
                          <strong>Row {warning.row}</strong> - {warning.field}: {warning.message}
                        </li>
                      ))}
                      {result.warnings.length > 5 && (
                        <li>... and {result.warnings.length - 5} more warnings</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {backupId && (
                <p className="backup-info">
                  Backup ID: {backupId}
                </p>
              )}
            </div>
          )}

          {/* Loading status */}
          {importing && (
            <div className="importing-status">
              <div className="spinner"></div>
              <p>Importing data, please wait...</p>
            </div>
          )}
        </div>

        <div className="import-dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={importing}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

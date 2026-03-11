import type { ImportError } from '../services/excelService';
import type { ImportIssueSnapshot } from './ImportDialog';
import './ImportAnomalyDashboard.css';

interface ImportAnomalyDashboardProps {
  isOpen: boolean;
  snapshot: ImportIssueSnapshot | null;
  onClose: () => void;
}

interface WarningBucket {
  id: string;
  title: string;
  count: number;
  tone: 'critical' | 'warning' | 'neutral';
}

function buildWarningBuckets(warnings: ImportError[]): WarningBucket[] {
  const hierarchyConflicts = warnings.filter((warning) => warning.field === 'Code (Function Number)');
  const missingCodes = warnings.filter(
    (warning) => warning.field.includes('(code)') && warning.message.includes('missing code')
  );
  const emptyRows = warnings.filter((warning) => warning.message.includes('no level data'));
  const otherWarnings = warnings.filter(
    (warning) =>
      !hierarchyConflicts.includes(warning) &&
      !missingCodes.includes(warning) &&
      !emptyRows.includes(warning)
  );

  const buckets: WarningBucket[] = [
    { id: 'hierarchy', title: 'Hierarchy Conflicts', count: hierarchyConflicts.length, tone: 'critical' },
    { id: 'missing-code', title: 'Missing Codes', count: missingCodes.length, tone: 'warning' },
    { id: 'empty-row', title: 'Empty Rows', count: emptyRows.length, tone: 'neutral' },
    { id: 'other', title: 'Other Warnings', count: otherWarnings.length, tone: 'warning' },
  ];

  return buckets.filter((bucket) => bucket.count > 0);
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function ImportAnomalyDashboard({
  isOpen,
  snapshot,
  onClose,
}: ImportAnomalyDashboardProps) {
  if (!isOpen || !snapshot) {
    return null;
  }

  const warnings = snapshot.result.warnings;
  const errors = snapshot.result.errors;
  const warningBuckets = buildWarningBuckets(warnings);
  const highRiskWarnings = warnings.filter((warning) => warning.field === 'Code (Function Number)');
  const totalIssues = warnings.length + errors.length;

  return (
    <div className="anomaly-dashboard-overlay">
      <div className="anomaly-dashboard-dialog">
        <div className="anomaly-dashboard-header">
          <div>
            <h2>Anomaly Dashboard</h2>
            <p>{snapshot.fileName}</p>
          </div>
          <button className="anomaly-dashboard-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="anomaly-dashboard-body">
          <div className="anomaly-summary-strip">
            <div className="anomaly-summary-card">
              <span className="anomaly-summary-label">Imported At</span>
              <strong>{formatTimestamp(snapshot.importedAt)}</strong>
            </div>
            <div className="anomaly-summary-card">
              <span className="anomaly-summary-label">Imported Nodes</span>
              <strong>{snapshot.result.imported}</strong>
            </div>
            <div className="anomaly-summary-card">
              <span className="anomaly-summary-label">Total Issues</span>
              <strong>{totalIssues}</strong>
            </div>
            <div className="anomaly-summary-card">
              <span className="anomaly-summary-label">Backup ID</span>
              <strong>{snapshot.backupId || 'N/A'}</strong>
            </div>
          </div>

          {warningBuckets.length > 0 && (
            <div className="anomaly-panel">
              <h3>Warning Summary</h3>
              <div className="anomaly-bucket-grid">
                {warningBuckets.map((bucket) => (
                  <div
                    key={bucket.id}
                    className={`anomaly-bucket anomaly-bucket-${bucket.tone}`}
                  >
                    <span>{bucket.title}</span>
                    <strong>{bucket.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {highRiskWarnings.length > 0 && (
            <div className="anomaly-panel anomaly-panel-critical">
              <h3>High-Risk Anomalies</h3>
              <ul>
                {highRiskWarnings.map((warning, idx) => (
                  <li key={`${warning.row}-${idx}`}>
                    <strong>Row {warning.row}</strong> - {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errors.length > 0 && (
            <div className="anomaly-panel anomaly-panel-error">
              <h3>Errors</h3>
              <ul>
                {errors.map((error, idx) => (
                  <li key={`${error.row}-${idx}`}>
                    <strong>Row {error.row}</strong> - {error.field}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="anomaly-panel">
              <h3>All Warnings</h3>
              <ul>
                {warnings.map((warning, idx) => (
                  <li key={`${warning.row}-${idx}`}>
                    <strong>Row {warning.row}</strong> - {warning.field}: {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalIssues === 0 && (
            <div className="anomaly-empty">No anomalies detected in the latest import.</div>
          )}
        </div>
      </div>
    </div>
  );
}

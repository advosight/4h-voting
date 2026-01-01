import React, { useState, useEffect } from 'react';

interface ScoreAuditEntry {
  id: string;
  scoreId: string;
  action: string;
  modifiedBy: string;
  modifiedAt: string;
  previousValues?: any;
  newValues?: any;
  reason?: string;
}

interface ScoreAuditHistoryProps {
  scoreId: string;
  onLoadAuditHistory: (scoreId: string) => Promise<ScoreAuditEntry[]>;
  loading?: boolean;
}

interface AuditEntryDetailsProps {
  entry: ScoreAuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function AuditEntryDetails({ entry, isExpanded, onToggle }: AuditEntryDetailsProps): JSX.Element {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getChangedFields = (): string[] => {
    if (!entry.previousValues || !entry.newValues) return [];
    
    const changed: string[] = [];
    const prev = entry.previousValues;
    const curr = entry.newValues;
    
    // Compare scoring fields
    const fieldsToCheck = [
      'cageConditionScore', 'cageConditionComments',
      'catConditionScore', 'catConditionComments', 
      'groomingScore', 'groomingComments',
      'overallScore', 'overallComments',
      'totalScore', 'isFinalized'
    ];
    
    fieldsToCheck.forEach(field => {
      if (prev[field] !== curr[field]) {
        changed.push(field);
      }
    });
    
    return changed;
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'CREATE': return '✨';
      case 'UPDATE': return '✏️';
      case 'FINALIZE': return '🔒';
      default: return '📝';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'CREATE': return '#28a745';
      case 'UPDATE': return '#ffc107';
      case 'FINALIZE': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const changedFields = getChangedFields();

  return (
    <div className="audit-entry">
      <div className="audit-entry-header" onClick={onToggle}>
        <div className="audit-entry-summary">
          <span 
            className="action-badge" 
            style={{ backgroundColor: getActionColor(entry.action) }}
          >
            {getActionIcon(entry.action)} {entry.action}
          </span>
          <span className="modified-by">{entry.modifiedBy}</span>
          <span className="modified-at">{new Date(entry.modifiedAt).toLocaleString()}</span>
        </div>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="audit-entry-details">
          {entry.reason && (
            <div className="audit-reason">
              <strong>Reason:</strong> {entry.reason}
            </div>
          )}
          
          {changedFields.length > 0 && (
            <div className="changed-fields">
              <strong>Changed Fields:</strong>
              <ul>
                {changedFields.map(field => (
                  <li key={field}>
                    <strong>{field}:</strong>
                    <div className="field-change">
                      <span className="old-value">
                        From: {formatValue(entry.previousValues?.[field])}
                      </span>
                      <span className="arrow">→</span>
                      <span className="new-value">
                        To: {formatValue(entry.newValues?.[field])}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {entry.action === 'CREATE' && entry.newValues && (
            <div className="initial-values">
              <strong>Initial Values:</strong>
              <pre>{JSON.stringify(entry.newValues, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreAuditHistory({ 
  scoreId, 
  onLoadAuditHistory, 
  loading = false 
}: ScoreAuditHistoryProps): JSX.Element {
  const [auditEntries, setAuditEntries] = useState<ScoreAuditEntry[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAuditHistory();
  }, [scoreId]);

  const loadAuditHistory = async () => {
    if (!scoreId) return;
    
    setLoadingHistory(true);
    setError('');
    
    try {
      const entries = await onLoadAuditHistory(scoreId);
      setAuditEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedEntries(new Set(auditEntries.map(entry => entry.id)));
  };

  const collapseAll = () => {
    setExpandedEntries(new Set());
  };

  if (loadingHistory) {
    return (
      <div className="audit-history-loading">
        <p>Loading audit history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audit-history-error">
        <p>Error loading audit history: {error}</p>
        <button onClick={loadAuditHistory} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="score-audit-history">
      <div className="audit-history-header">
        <h3>📋 Score Audit History</h3>
        {auditEntries.length > 0 && (
          <div className="audit-controls">
            <button 
              onClick={expandAll} 
              className="btn btn-sm btn-secondary"
              disabled={loading}
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll} 
              className="btn btn-sm btn-secondary"
              disabled={loading}
            >
              Collapse All
            </button>
            <button 
              onClick={loadAuditHistory} 
              className="btn btn-sm btn-primary"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {auditEntries.length === 0 ? (
        <div className="no-audit-entries">
          <p>No audit history available for this score.</p>
        </div>
      ) : (
        <div className="audit-entries">
          {auditEntries.map(entry => (
            <AuditEntryDetails
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntries.has(entry.id)}
              onToggle={() => toggleEntryExpansion(entry.id)}
            />
          ))}
        </div>
      )}

      <div className="audit-summary">
        <p>
          <strong>Total Modifications:</strong> {auditEntries.length}
        </p>
        {auditEntries.length > 0 && (
          <p>
            <strong>Last Modified:</strong> {new Date(auditEntries[0].modifiedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default ScoreAuditHistory;
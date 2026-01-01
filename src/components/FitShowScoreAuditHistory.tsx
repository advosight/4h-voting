import React, { useState, useEffect } from 'react';

interface AuditEntry {
  id: string;
  fitShowScoreId: string;
  action: 'CREATE' | 'UPDATE' | 'FINALIZE' | 'DELETE';
  modifiedBy: string;
  modifiedAt: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
}

interface FitShowScoreAuditHistoryProps {
  scoreId: string;
  onLoadAuditHistory?: (scoreId: string) => Promise<AuditEntry[]>;
}

export const FitShowScoreAuditHistory: React.FC<FitShowScoreAuditHistoryProps> = ({
  scoreId,
  onLoadAuditHistory
}) => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    loadAuditHistory();
  }, [scoreId]);

  const loadAuditHistory = async () => {
    if (!onLoadAuditHistory) return;

    setIsLoading(true);
    setError(null);

    try {
      const entries = await onLoadAuditHistory(scoreId);
      setAuditEntries(entries.sort((a, b) => 
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
      ));
    } catch (err) {
      setError('Failed to load audit history');
      console.error('Error loading audit history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatActionType = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Created';
      case 'UPDATE': return 'Updated';
      case 'FINALIZE': return 'Finalized';
      case 'DELETE': return 'Deleted';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'blue';
      case 'FINALIZE': return 'orange';
      case 'DELETE': return 'red';
      default: return 'gray';
    }
  };

  const formatFieldChanges = (previousValues?: Record<string, any>, newValues?: Record<string, any>) => {
    if (!previousValues || !newValues) return null;

    const changes: Array<{ field: string; from: any; to: any }> = [];
    
    Object.keys(newValues).forEach(key => {
      if (previousValues[key] !== newValues[key]) {
        changes.push({
          field: key,
          from: previousValues[key],
          to: newValues[key]
        });
      }
    });

    return changes;
  };

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  if (isLoading) {
    return (
      <div className="audit-history-loading">
        <div className="loading-spinner"></div>
        <p>Loading audit history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audit-history-error">
        <p className="error-message">{error}</p>
        <button onClick={loadAuditHistory} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fit-show-score-audit-history">
      <div className="audit-header">
        <h3>Audit History</h3>
        <button onClick={loadAuditHistory} className="refresh-button">
          Refresh
        </button>
      </div>

      {auditEntries.length === 0 ? (
        <div className="no-audit-entries">
          <p>No audit entries found for this score.</p>
        </div>
      ) : (
        <div className="audit-entries">
          {auditEntries.map((entry) => {
            const isExpanded = expandedEntry === entry.id;
            const changes = formatFieldChanges(entry.previousValues, entry.newValues);

            return (
              <div key={entry.id} className="audit-entry">
                <div 
                  className="audit-entry-header"
                  onClick={() => toggleEntryExpansion(entry.id)}
                >
                  <div className="audit-action">
                    <span 
                      className="action-badge"
                      style={{ backgroundColor: getActionColor(entry.action) }}
                    >
                      {formatActionType(entry.action)}
                    </span>
                  </div>
                  <div className="audit-details">
                    <div className="audit-user">{entry.modifiedBy}</div>
                    <div className="audit-timestamp">
                      {new Date(entry.modifiedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="expand-indicator">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>

                {isExpanded && (
                  <div className="audit-entry-details">
                    {entry.reason && (
                      <div className="audit-reason">
                        <strong>Reason:</strong> {entry.reason}
                      </div>
                    )}

                    {changes && changes.length > 0 && (
                      <div className="audit-changes">
                        <strong>Changes:</strong>
                        <div className="changes-list">
                          {changes.map((change, index) => (
                            <div key={index} className="change-item">
                              <span className="field-name">{change.field}:</span>
                              <span className="change-values">
                                <span className="old-value">{String(change.from)}</span>
                                <span className="arrow">→</span>
                                <span className="new-value">{String(change.to)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.action === 'CREATE' && entry.newValues && (
                      <div className="audit-initial-values">
                        <strong>Initial Values:</strong>
                        <div className="initial-values-list">
                          {Object.entries(entry.newValues).map(([key, value]) => (
                            <div key={key} className="initial-value-item">
                              <span className="field-name">{key}:</span>
                              <span className="field-value">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="audit-summary">
        <p>Total entries: {auditEntries.length}</p>
        {auditEntries.length > 0 && (
          <p>
            Last modified: {new Date(auditEntries[0].modifiedAt).toLocaleString()} 
            by {auditEntries[0].modifiedBy}
          </p>
        )}
      </div>
    </div>
  );
};
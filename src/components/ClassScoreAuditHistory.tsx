import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Create as CreateIcon,
  Edit as EditIcon,
  Lock as LockIcon
} from '@mui/icons-material';

export interface ClassScoreAuditEntry {
  id: string;
  classScoreId: string;
  action: string;
  modifiedBy: string;
  modifiedAt: string;
  previousValues?: any;
  newValues?: any;
  reason?: string;
}

interface ClassScoreAuditHistoryProps {
  classScoreId: string;
  auditEntries: ClassScoreAuditEntry[];
  loading?: boolean;
  error?: string;
}

export const ClassScoreAuditHistory: React.FC<ClassScoreAuditHistoryProps> = ({
  classScoreId,
  auditEntries,
  loading = false,
  error
}) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <CreateIcon color="success" />;
      case 'UPDATE':
        return <EditIcon color="primary" />;
      case 'FINALIZE':
        return <LockIcon color="warning" />;
      default:
        return <HistoryIcon />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'primary';
      case 'FINALIZE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatFieldName = (fieldName: string): string => {
    // Convert camelCase to readable format
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const renderValueComparison = (entry: ClassScoreAuditEntry) => {
    if (!entry.previousValues || !entry.newValues) {
      return null;
    }

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    // Compare all fields between previous and new values
    const allFields = new Set([
      ...Object.keys(entry.previousValues),
      ...Object.keys(entry.newValues)
    ]);

    allFields.forEach(field => {
      const oldValue = entry.previousValues[field];
      const newValue = entry.newValues[field];
      
      if (oldValue !== newValue) {
        changes.push({ field, oldValue, newValue });
      }
    });

    if (changes.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No field changes detected
        </Typography>
      );
    }

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Changes Made:
        </Typography>
        {changes.map((change, index) => (
          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {formatFieldName(change.field)}:
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Chip 
                label={`From: ${change.oldValue ?? 'N/A'}`} 
                size="small" 
                color="error" 
                variant="outlined" 
              />
              <Typography variant="body2">→</Typography>
              <Chip 
                label={`To: ${change.newValue ?? 'N/A'}`} 
                size="small" 
                color="success" 
                variant="outlined" 
              />
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading audit history...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <HistoryIcon sx={{ mr: 1 }} />
        <Typography variant="h6">
          Class Score Audit History
        </Typography>
      </Box>

      {auditEntries.length === 0 ? (
        <Alert severity="info">
          No audit history available for this class score.
        </Alert>
      ) : (
        <List>
          {auditEntries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              <ListItem sx={{ px: 0 }}>
                <Accordion sx={{ width: '100%' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Box display="flex" alignItems="center" mr={2}>
                        {getActionIcon(entry.action)}
                      </Box>
                      <Box flexGrow={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Chip 
                            label={entry.action} 
                            size="small" 
                            color={getActionColor(entry.action) as any}
                          />
                          <Typography variant="body2" color="text.secondary">
                            by {entry.modifiedBy}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(entry.modifiedAt).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {entry.reason && (
                        <Box mb={2}>
                          <Typography variant="subtitle2" gutterBottom>
                            Reason:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.reason}
                          </Typography>
                        </Box>
                      )}
                      
                      {entry.action === 'CREATE' ? (
                        <Typography variant="body2" color="text.secondary">
                          Initial class score created
                        </Typography>
                      ) : (
                        renderValueComparison(entry)
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </ListItem>
              {index < auditEntries.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ClassScoreAuditHistory;
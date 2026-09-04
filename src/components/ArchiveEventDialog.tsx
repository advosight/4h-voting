import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Archive as ArchiveIcon } from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import { useEvent } from '../contexts/EventContext';

const client = generateClient();

// GraphQL queries to fetch counts
const listCatsQuery = `
  query ListCats {
    listCats {
      items {
        id
      }
    }
  }
`;

const listAllScoresQuery = `
  query ListAllScores($limit: Int, $nextToken: String) {
    listAllScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
      }
      nextToken
    }
  }
`;

const listAllClassScoresQuery = `
  query ListAllClassScores($limit: Int, $nextToken: String) {
    listAllClassScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
      }
      nextToken
    }
  }
`;

const listAllFitShowScoresQuery = `
  query ListAllFitShowScores($limit: Int, $nextToken: String) {
    listAllFitShowScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
      }
      nextToken
    }
  }
`;

interface ArchiveEventDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ArchiveEventDialog: React.FC<ArchiveEventDialogProps> = ({
  open,
  onClose
}) => {
  const { activeEvent, archiveCurrentEvent } = useEvent();

  const [catCount, setCatCount] = useState<number | null>(null);
  const [scoreCount, setScoreCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch counts when dialog opens
  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchCounts = async () => {
      setCountLoading(true);
      setError(null);
      try {
        // Fetch cat count
        const catsResult = await client.graphql({ query: listCatsQuery });
        const cats = catsResult.data?.listCats?.items || [];
        setCatCount(cats.length);

        // Fetch all scores (cage, class, fit & show)
        let cageScores = 0;
        let classScores = 0;
        let fitShowScores = 0;

        try {
          const cageScoresResult = await client.graphql({
            query: listAllScoresQuery,
            variables: { limit: 1000 }
          });
          cageScores = cageScoresResult.data?.listAllScores?.items?.length || 0;
        } catch (err) {
          console.error('Error fetching cage scores:', err);
        }

        try {
          const classScoresResult = await client.graphql({
            query: listAllClassScoresQuery,
            variables: { limit: 1000 }
          });
          classScores = classScoresResult.data?.listAllClassScores?.items?.length || 0;
        } catch (err) {
          console.error('Error fetching class scores:', err);
        }

        try {
          const fitShowScoresResult = await client.graphql({
            query: listAllFitShowScoresQuery,
            variables: { limit: 1000 }
          });
          fitShowScores = fitShowScoresResult.data?.listAllFitShowScores?.items?.length || 0;
        } catch (err) {
          console.error('Error fetching fit & show scores:', err);
        }

        setScoreCount(cageScores + classScores + fitShowScores);
      } catch (err) {
        console.error('Error fetching counts:', err);
        setError('Failed to load current event data');
      } finally {
        setCountLoading(false);
      }
    };

    fetchCounts();
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await archiveCurrentEvent();
      // Close dialog on success
      onClose();
    } catch (err) {
      console.error('Error archiving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ArchiveIcon />
        Archive Current Event
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {/* Current event info */}
          {activeEvent && (
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Current Event: {activeEvent.name}
              </Typography>

              {countLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading event data...</Typography>
                </Box>
              ) : (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Participants (cats): <strong>{catCount ?? 0}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Scores (total across all types): <strong>{scoreCount ?? 0}</strong>
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {/* Warning message */}
          <Alert severity="warning">
            This action will mark the current event as archived. The event data will remain in
            the system and you can switch back to it at any time using the Event Selector.
          </Alert>

          {/* Error message */}
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2">
              After archiving, you can create a new event or switch to a previous one using
              the Event Selector in the toolbar.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={isSubmitting}
          sx={{ gap: 1 }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : <ArchiveIcon />}
          Archive Event
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ArchiveEventDialog;

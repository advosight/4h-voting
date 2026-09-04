import React, { useState } from 'react';
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
import { Add as AddIcon } from '@mui/icons-material';
import { useEvent } from '../contexts/EventContext';

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onClose
}) => {
  const { createEvent } = useEvent();

  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newEventName.trim()) {
      setError('Event name is required');
      return;
    }

    if (!newEventDate.trim()) {
      setError('Event date is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createEvent(newEventName, newEventDate);
      // Close dialog and reset form on success
      setNewEventName('');
      setNewEventDate('');
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNewEventName('');
      setNewEventDate('');
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
        <AddIcon />
        Create New Event
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          <Alert severity="info">
            Creating a new event will make it the active event. Judges will start scoring for this new event.
          </Alert>

          {/* Error message */}
          {error && <Alert severity="error">{error}</Alert>}

          {/* New event form */}
          <Box>
            <Stack spacing={2}>
              <TextField
                label="Event Name"
                fullWidth
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., Regional Competition 2025"
                autoFocus
              />
              <TextField
                label="Event Date"
                fullWidth
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                disabled={isSubmitting}
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    paddingTop: '28px',
                    paddingBottom: '12px',
                  },
                  '& .MuiOutlinedInput-root': {
                    paddingTop: '8px',
                  },
                }}
              />
            </Stack>
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
          disabled={isSubmitting || !newEventName.trim() || !newEventDate.trim()}
          sx={{ gap: 1 }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : <AddIcon />}
          Create Event
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEventDialog;

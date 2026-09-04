import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  EventNote as EventNoteIcon,
  SwapHoriz as SwitchIcon,
  Add as AddIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useEvent, ActiveEvent } from '../contexts/EventContext';
import { useUserRole } from '../utils/roleUtils';
import CreateEventDialog from './CreateEventDialog';
import ArchiveEventDialog from './ArchiveEventDialog';

interface EventSelectorProps {
  onArchiveClick?: () => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({ onArchiveClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { activeEvent, loading, listEvents, switchActiveEvent } = useEvent();
  const { userInfo } = useUserRole();

  const isAdmin = userInfo?.role === 'admin';

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [eventList, setEventList] = useState<ActiveEvent[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedEventForSwitch, setSelectedEventForSwitch] = useState<ActiveEvent | null>(null);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const menuOpen = Boolean(anchorEl);

  // Fetch event list when menu opens
  const handleMenuOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setListLoading(true);
    try {
      const events = await listEvents();
      setEventList(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEventList([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEventSelect = (event: ActiveEvent) => {
    if (activeEvent?.id !== event.id) {
      setSelectedEventForSwitch(event);
      setConfirmDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleConfirmSwitch = async () => {
    if (!selectedEventForSwitch) return;

    setSwitchLoading(true);
    try {
      await switchActiveEvent(selectedEventForSwitch.id);
      setConfirmDialogOpen(false);
      setSelectedEventForSwitch(null);
    } catch (err) {
      console.error('Error switching event:', err);
    } finally {
      setSwitchLoading(false);
    }
  };

  const handleCreateClick = () => {
    handleMenuClose();
    setCreateDialogOpen(true);
  };

  const handleArchiveClick = () => {
    handleMenuClose();
    setArchiveDialogOpen(true);
    if (onArchiveClick) {
      onArchiveClick();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!activeEvent) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <Chip
          icon={<EventNoteIcon />}
          label="No active event"
          variant="outlined"
          size={isMobile ? 'small' : 'medium'}
          disabled
          sx={{
            maxWidth: isMobile ? 150 : 250,
            color: 'inherit',
            borderColor: 'rgba(255, 255, 255, 0.23)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>
    );
  }

  // Read-only display for judges
  if (!isAdmin) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <Chip
          icon={<EventNoteIcon />}
          label={activeEvent.name}
          variant="outlined"
          size={isMobile ? 'small' : 'medium'}
          sx={{
            maxWidth: isMobile ? 150 : 300,
            color: 'inherit',
            borderColor: 'rgba(255, 255, 255, 0.23)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>
    );
  }

  // Admin-facing dropdown and archive button
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
      {/* Active event display */}
      <Chip
        icon={<EventNoteIcon />}
        label={activeEvent.name}
        variant="outlined"
        size={isMobile ? 'small' : 'medium'}
        sx={{
          maxWidth: isMobile ? 150 : 300,
          color: 'inherit',
          borderColor: 'rgba(255, 255, 255, 0.23)',
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />

      {/* Desktop menu button */}
      {!isMobile && (
        <>
          <Tooltip title="Manage events">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{ color: 'inherit' }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <ListItemText
                primary="Switch Event"
                secondary={listLoading ? 'Loading...' : undefined}
                sx={{ fontSize: '0.85rem' }}
              />
            </MenuItem>

            {listLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mx: 'auto' }} />
              </MenuItem>
            ) : (
              eventList.map((event) => (
                <MenuItem
                  key={event.id}
                  onClick={() => handleEventSelect(event)}
                  selected={activeEvent.id === event.id}
                  sx={{
                    pl: 4,
                    opacity: activeEvent.id === event.id ? 0.7 : 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <SwitchIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={event.name}
                    secondary={event.date}
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
              ))
            )}

            <MenuItem divider />

            <MenuItem onClick={handleCreateClick}>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Create New Event" />
            </MenuItem>

            <MenuItem onClick={handleArchiveClick}>
              <ListItemIcon>
                <ArchiveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Archive Current Event" />
            </MenuItem>
          </Menu>
        </>
      )}

      {/* Mobile menu button (icon only) */}
      {isMobile && (
        <>
          <Tooltip title="Manage events">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{ color: 'inherit' }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <ListItemText
                primary="Switch Event"
                secondary={listLoading ? 'Loading...' : undefined}
                sx={{ fontSize: '0.75rem' }}
              />
            </MenuItem>

            {listLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mx: 'auto' }} />
              </MenuItem>
            ) : (
              eventList.map((event) => (
                <MenuItem
                  key={event.id}
                  onClick={() => handleEventSelect(event)}
                  selected={activeEvent.id === event.id}
                  sx={{
                    pl: 4,
                    opacity: activeEvent.id === event.id ? 0.7 : 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <SwitchIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={event.name}
                    primaryTypographyProps={{ fontSize: '0.85rem' }}
                  />
                </MenuItem>
              ))
            )}

            <MenuItem divider />

            <MenuItem onClick={handleCreateClick}>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Create New" />
            </MenuItem>

            <MenuItem onClick={handleArchiveClick}>
              <ListItemIcon>
                <ArchiveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Archive" />
            </MenuItem>
          </Menu>
        </>
      )}

      {/* Confirmation dialog for switching events */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !switchLoading && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Switch to Event</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <p>
            Switch the active event to{' '}
            <strong>{selectedEventForSwitch?.name}</strong>? All judges will see
            data for this event.
          </p>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={switchLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSwitch}
            variant="contained"
            disabled={switchLoading}
          >
            {switchLoading ? <CircularProgress size={20} /> : 'Switch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create event dialog */}
      <CreateEventDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      {/* Archive event dialog */}
      <ArchiveEventDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
      />
    </Box>
  );
};

export default EventSelector;

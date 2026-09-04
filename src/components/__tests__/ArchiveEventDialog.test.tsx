import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import ArchiveEventDialog from '../ArchiveEventDialog';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: vi.fn()
  }))
}));

// Mock useEvent from EventContext
vi.mock('../../contexts/EventContext', () => ({
  useEvent: vi.fn(),
  EventProvider: ({ children }: any) => <>{children}</>,
  EventContext: {}
}));

import { useEvent as _useEvent } from '../../contexts/EventContext';

const useEvent = vi.mocked(_useEvent, { partial: true });

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ArchiveEventDialog', () => {
  const mockActiveEvent = {
    id: 'event-1',
    name: 'Current Event',
    date: '2026-09-03',
    status: 'active',
    archivedAt: null,
    archivedBy: null,
    createdAt: '2026-09-03'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open is true', () => {
    const mockArchiveAndCreateEvent = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    renderWithTheme(
      <ArchiveEventDialog open={true} onClose={vi.fn()} />
    );

    expect(screen.getByText(/Archive Event & Start New One/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Event/i)).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    const mockArchiveAndCreateEvent = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    renderWithTheme(
      <ArchiveEventDialog open={false} onClose={vi.fn()} />
    );

    expect(screen.queryByText(/Archive Event & Start New One/i)).not.toBeInTheDocument();
  });

  it('should display current event name and counts', async () => {
    const mockArchiveAndCreateEvent = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    renderWithTheme(
      <ArchiveEventDialog open={true} onClose={vi.fn()} />
    );

    expect(screen.getByText('Current Event: Current Event')).toBeInTheDocument();
  });

  it('should accept new event name and date', async () => {
    const mockArchiveAndCreateEvent = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    const user = userEvent.setup();

    renderWithTheme(
      <ArchiveEventDialog open={true} onClose={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/Event Name/i);
    const dateInput = screen.getByLabelText(/Event Date/i);

    await user.type(nameInput, 'New Event');
    await user.type(dateInput, '2026-09-10');

    expect((nameInput as HTMLInputElement).value).toBe('New Event');
    expect((dateInput as HTMLInputElement).value).toBe('2026-09-10');
  });

  it('should call archiveAndCreateEvent with correct parameters when submitting', async () => {
    const mockArchiveAndCreateEvent = vi.fn().mockResolvedValue(undefined);

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    renderWithTheme(
      <ArchiveEventDialog open={true} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Event Name/i);
    const dateInput = screen.getByLabelText(/Event Date/i);
    const archiveButton = screen.getByRole('button', { name: /Archive & Create/i });

    await user.type(nameInput, 'New Event 2024');
    await user.type(dateInput, '2026-09-10');
    await user.click(archiveButton);

    expect(mockArchiveAndCreateEvent).toHaveBeenCalledWith('New Event 2024', '2026-09-10');
  });

  it('should close dialog on successful archive', async () => {
    const mockArchiveAndCreateEvent = vi.fn().mockResolvedValue(undefined);

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    const { rerender } = renderWithTheme(
      <ArchiveEventDialog open={true} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText(/Event Name/i);
    const dateInput = screen.getByLabelText(/Event Date/i);
    const archiveButton = screen.getByRole('button', { name: /Archive & Create/i });

    await user.type(nameInput, 'New Event 2024');
    await user.type(dateInput, '2026-09-10');
    await user.click(archiveButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should disable submit button when fields are empty', async () => {
    const mockArchiveAndCreateEvent = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    renderWithTheme(
      <ArchiveEventDialog open={true} onClose={vi.fn()} />
    );

    const archiveButton = screen.getByRole('button', { name: /Archive & Create/i });
    expect(archiveButton).toBeDisabled();
  });

  it('should handle cancel button', async () => {
    const mockArchiveAndCreateEvent = vi.fn();
    const mockOnClose = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn(),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: mockArchiveAndCreateEvent,
    });

    const user = userEvent.setup();

    renderWithTheme(
      <ArchiveEventDialog open={true} onClose={mockOnClose} />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});

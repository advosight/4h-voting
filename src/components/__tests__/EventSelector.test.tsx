import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import EventSelector from '../EventSelector';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: vi.fn()
  }))
}));

// Mock useUserRole
vi.mock('../../utils/roleUtils', () => ({
  useUserRole: vi.fn()
}));

// Mock useEvent from EventContext
vi.mock('../../contexts/EventContext', () => ({
  useEvent: vi.fn(),
  EventProvider: ({ children }: any) => <>{children}</>,
  EventContext: {}
}));

import { useEvent as _useEvent } from '../../contexts/EventContext';
import { useUserRole as _useUserRole } from '../../utils/roleUtils';

const useEvent = vi.mocked(_useEvent, { partial: true });
const useUserRole = vi.mocked(_useUserRole, { partial: true });

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EventSelector', () => {
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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: !query.includes('(max-width:'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should render active event name for judges', async () => {
    useUserRole.mockReturnValue({
      userInfo: { role: 'judge' } as any,
      loading: false,
      error: null
    });

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockResolvedValue([]),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: vi.fn(),
    });

    renderWithTheme(<EventSelector />);

    expect(screen.getByText('Current Event')).toBeInTheDocument();
  });

  it('should show read-only event display for judges without menu button', () => {
    useUserRole.mockReturnValue({
      userInfo: { role: 'judge' } as any,
      loading: false,
      error: null
    });

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockResolvedValue([]),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: vi.fn(),
    });

    renderWithTheme(<EventSelector />);

    expect(screen.getByText('Current Event')).toBeInTheDocument();

    // Judge should not see menu button for managing events
    const menuButtons = screen.queryAllByRole('button');
    expect(menuButtons.length).toBe(0);
  });

  it('should show admin-facing menu button for admins', () => {
    useUserRole.mockReturnValue({
      userInfo: { role: 'admin' } as any,
      loading: false,
      error: null
    });

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockResolvedValue([]),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: vi.fn(),
    });

    renderWithTheme(<EventSelector />);

    expect(screen.getByText('Current Event')).toBeInTheDocument();

    // Admin should see menu button
    const menuButton = screen.getByRole('button', { name: /Manage events/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('should display event list when admin opens menu', async () => {
    const mockEventList = [
      mockActiveEvent,
      {
        id: 'event-2',
        name: 'Previous Event',
        date: '2026-09-01',
        status: 'archived',
        archivedAt: '2026-09-02T00:00:00Z',
        archivedBy: 'admin@example.com',
        createdAt: '2026-09-01'
      }
    ];

    useUserRole.mockReturnValue({
      userInfo: { role: 'admin' } as any,
      loading: false,
      error: null
    });

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockResolvedValue(mockEventList),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: vi.fn(),
    });

    const user = userEvent.setup();

    renderWithTheme(<EventSelector />);

    const menuButton = screen.getByRole('button', { name: /Manage events/i });
    await user.click(menuButton);

    // Should see both events after menu opens
    await waitFor(() => {
      expect(screen.getByText('Previous Event')).toBeInTheDocument();
    });
  });

  it('should call switchActiveEvent when selecting a different event', async () => {
    const mockEventList = [
      mockActiveEvent,
      {
        id: 'event-2',
        name: 'Previous Event',
        date: '2026-09-01',
        status: 'archived',
        archivedAt: '2026-09-02T00:00:00Z',
        archivedBy: 'admin@example.com',
        createdAt: '2026-09-01'
      }
    ];

    useUserRole.mockReturnValue({
      userInfo: { role: 'admin' } as any,
      loading: false,
      error: null
    });

    const mockSwitchActiveEvent = vi.fn();

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockResolvedValue(mockEventList),
      switchActiveEvent: mockSwitchActiveEvent,
      archiveAndCreateEvent: vi.fn(),
    });

    const user = userEvent.setup();

    renderWithTheme(<EventSelector />);

    const menuButton = screen.getByRole('button', { name: /Manage events/i });
    await user.click(menuButton);

    // Wait for previous event to appear
    await waitFor(() => {
      expect(screen.getByText('Previous Event')).toBeInTheDocument();
    });

    // Click on the previous event
    const previousEventItem = screen.getByText('Previous Event');
    await user.click(previousEventItem);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/Switch to Event/i)).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /Switch/i });
    await user.click(confirmButton);

    // Verify switchActiveEvent was called with correct eventId
    expect(mockSwitchActiveEvent).toHaveBeenCalledWith('event-2');
  });

  it('should call onArchiveClick when archive button is clicked', async () => {
    useUserRole.mockReturnValue({
      userInfo: { role: 'admin' } as any,
      loading: false,
      error: null
    });

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockResolvedValue([mockActiveEvent]),
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: vi.fn(),
    });

    const mockOnArchiveClick = vi.fn();
    const user = userEvent.setup();

    renderWithTheme(<EventSelector onArchiveClick={mockOnArchiveClick} />);

    const menuButton = screen.getByRole('button', { name: /Manage events/i });
    await user.click(menuButton);

    // Find and click archive button
    const archiveButton = await screen.findByText(/Archive & Start/i);
    await user.click(archiveButton);

    expect(mockOnArchiveClick).toHaveBeenCalled();
  });

  it('should show loading state when fetching events', async () => {
    useUserRole.mockReturnValue({
      userInfo: { role: 'admin' } as any,
      loading: false,
      error: null
    });

    useEvent.mockReturnValue({
      activeEvent: mockActiveEvent,
      activeEventId: 'event-1',
      loading: false,
      error: null,
      refetchActiveEvent: vi.fn(),
      listEvents: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      switchActiveEvent: vi.fn(),
      archiveAndCreateEvent: vi.fn(),
    });

    const user = userEvent.setup();

    renderWithTheme(<EventSelector />);

    const menuButton = screen.getByRole('button', { name: /Manage events/i });
    await user.click(menuButton);

    // Should show loading text
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});

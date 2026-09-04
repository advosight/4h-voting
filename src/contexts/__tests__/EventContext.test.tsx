import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventProvider, useEvent } from '../EventContext';

// Mock AWS Amplify - must be before any imports of EventContext
vi.mock('aws-amplify/api', () => {
  const mockGraphql = vi.fn();
  return {
    generateClient: vi.fn(() => ({
      graphql: mockGraphql
    }))
  };
});

// Now import after mocking
import { generateClient as _generateClient } from 'aws-amplify/api';
const generateClient = vi.mocked(_generateClient, { partial: true });

describe('EventContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestComponent = ({ onContextReady }: { onContextReady?: () => void }) => {
    const { activeEvent, activeEventId, loading } = useEvent();

    React.useEffect(() => {
      if (!loading && onContextReady) {
        onContextReady();
      }
    }, [loading, onContextReady]);

    return (
      <div>
        {loading ? (
          <div>Loading...</div>
        ) : activeEvent ? (
          <div data-testid="event-display">
            <span data-testid="event-name">{activeEvent.name}</span>
            <span data-testid="event-id">{activeEventId}</span>
          </div>
        ) : (
          <div data-testid="no-event">No active event</div>
        )}
      </div>
    );
  };

  it('should throw an error when useEvent is called outside of EventProvider', () => {
    const BadComponent = () => {
      try {
        useEvent();
        return <div>Should not render</div>;
      } catch (error) {
        return <div>{(error as Error).message}</div>;
      }
    };

    render(<BadComponent />);
    expect(screen.getByText(/useEvent must be used within an EventProvider/i)).toBeInTheDocument();
  });

  it('should render EventProvider without crashing', async () => {
    // Set up mock for generateClient
    const mockGraphql = vi.fn().mockImplementation((options: any) => {
      if (options.query && options.query.includes('GetActiveEvent')) {
        return Promise.resolve({
          data: {
            getActiveEvent: null
          }
        });
      }
      // For subscriptions, return an observable-like object
      return {
        subscribe: (observer: any) => {
          return { unsubscribe: vi.fn() };
        }
      };
    });

    generateClient.mockReturnValue({
      graphql: mockGraphql
    } as any);

    render(
      <EventProvider>
        <TestComponent />
      </EventProvider>
    );

    // Should eventually render without crashing
    await waitFor(() => {
      expect(screen.getByTestId('no-event')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should provide context values', async () => {
    const mockGraphql = vi.fn().mockImplementation((options: any) => {
      if (options.query && options.query.includes('GetActiveEvent')) {
        return Promise.resolve({
          data: {
            getActiveEvent: null
          }
        });
      }
      return {
        subscribe: (observer: any) => {
          return { unsubscribe: vi.fn() };
        }
      };
    });

    generateClient.mockReturnValue({
      graphql: mockGraphql
    } as any);

    const ContextConsumer = () => {
      const context = useEvent();
      return (
        <div>
          <span data-testid="has-list-events">{typeof context.listEvents}</span>
          <span data-testid="has-switch-event">{typeof context.switchActiveEvent}</span>
          <span data-testid="has-archive">{typeof context.archiveAndCreateEvent}</span>
        </div>
      );
    };

    render(
      <EventProvider>
        <ContextConsumer />
      </EventProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-list-events')).toHaveTextContent('function');
      expect(screen.getByTestId('has-switch-event')).toHaveTextContent('function');
      expect(screen.getByTestId('has-archive')).toHaveTextContent('function');
    }, { timeout: 3000 });
  });
});

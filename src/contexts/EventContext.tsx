import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

// GraphQL query and mutation strings
const getActiveEventQuery = `
  query GetActiveEvent {
    getActiveEvent {
      id
      name
      date
      status
      archivedAt
      archivedBy
      createdAt
    }
  }
`;

const listEventsQuery = `
  query ListEvents {
    listEvents {
      items {
        id
        name
        date
        status
        archivedAt
        archivedBy
        createdAt
      }
    }
  }
`;

const onActiveEventChangeSubscription = `
  subscription OnActiveEventChange {
    onActiveEventChange {
      id
      name
      date
      status
      archivedAt
      archivedBy
      createdAt
    }
  }
`;

export interface ActiveEvent {
  id: string;
  name: string;
  date: string;
  status: string;
  archivedAt: string | null;
  archivedBy: string | null;
  createdAt: string;
}

export interface EventContextType {
  activeEvent: ActiveEvent | null;
  activeEventId: string | null;
  loading: boolean;
  error: string | null;
  refetchActiveEvent: () => Promise<void>;
  listEvents: () => Promise<ActiveEvent[]>;
  switchActiveEvent: (eventId: string) => Promise<void>;
  archiveAndCreateEvent: (newEventName: string, newEventDate: string) => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEvent = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the active event on mount
  const fetchActiveEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await client.graphql({ query: getActiveEventQuery });
      if (result.data?.getActiveEvent) {
        setActiveEvent(result.data.getActiveEvent as ActiveEvent);
      } else {
        setActiveEvent(null);
      }
    } catch (err) {
      console.error('Error fetching active event:', err);
      // Don't set error state here - public/unauthenticated pages may mount EventProvider
      // before Cognito session is established. Just log and leave activeEvent as null.
      setActiveEvent(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all events
  const fetchListEvents = async (): Promise<ActiveEvent[]> => {
    try {
      const result = await client.graphql({ query: listEventsQuery });
      return (result.data?.listEvents?.items || []) as ActiveEvent[];
    } catch (err) {
      console.error('Error listing events:', err);
      throw err;
    }
  };

  // Switch to a different active event
  const doSwitchActiveEvent = async (eventId: string) => {
    try {
      const mutation = `
        mutation SwitchActiveEvent($eventId: ID!) {
          switchActiveEvent(eventId: $eventId) {
            id
            name
            date
            status
            archivedAt
            archivedBy
            createdAt
          }
        }
      `;
      await client.graphql({
        query: mutation,
        variables: { eventId }
      });
      // Rely on onActiveEventChange subscription to update state
    } catch (err) {
      console.error('Error switching active event:', err);
      throw err;
    }
  };

  // Archive the current event and create a new one
  const doArchiveAndCreateEvent = async (newEventName: string, newEventDate: string) => {
    try {
      const mutation = `
        mutation ArchiveAndCreateEvent($newEventName: String!, $newEventDate: String!) {
          archiveAndCreateEvent(newEventName: $newEventName, newEventDate: $newEventDate) {
            id
            name
            date
            status
            archivedAt
            archivedBy
            createdAt
          }
        }
      `;
      await client.graphql({
        query: mutation,
        variables: { newEventName, newEventDate }
      });
      // Rely on onActiveEventChange subscription to update state
    } catch (err) {
      console.error('Error archiving and creating event:', err);
      throw err;
    }
  };

  // Set up subscriptions and initial fetch
  useEffect(() => {
    fetchActiveEvent();

    let eventChangeSubscription: any;

    try {
      const eventChangeSubscriptionObservable = client.graphql({
        query: onActiveEventChangeSubscription
      });

      if ('subscribe' in eventChangeSubscriptionObservable) {
        eventChangeSubscription = eventChangeSubscriptionObservable.subscribe({
          next: (result: any) => {
            console.log('Active event change received:', result);
            if (result?.data?.onActiveEventChange) {
              setActiveEvent(result.data.onActiveEventChange as ActiveEvent);
            }
          },
          error: (err: any) => {
            console.error('Active event subscription error:', err);
          }
        });
      }
    } catch (err) {
      console.error('Error setting up event subscription:', err);
    }

    return () => {
      if (eventChangeSubscription?.unsubscribe) {
        eventChangeSubscription.unsubscribe();
      }
    };
  }, []);

  const contextValue: EventContextType = {
    activeEvent,
    activeEventId: activeEvent?.id ?? null,
    loading,
    error,
    refetchActiveEvent: fetchActiveEvent,
    listEvents: fetchListEvents,
    switchActiveEvent: doSwitchActiveEvent,
    archiveAndCreateEvent: doArchiveAndCreateEvent,
  };

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );
};

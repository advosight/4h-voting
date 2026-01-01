import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { generateClient } from 'aws-amplify/api';
import FitShowScoreNotifications from '../FitShowScoreNotifications';
import { FitShowScore } from '../../types/scoring';

// Mock AWS Amplify
jest.mock('aws-amplify/api');

const mockClient = {
  graphql: jest.fn()
};

const mockGenerateClient = generateClient as jest.MockedFunction<typeof generateClient>;

describe('FitShowScoreNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateClient.mockReturnValue(mockClient as any);
  });

  const mockFitShowScore: FitShowScore = {
    id: 'score123',
    catId: 'cat123',
    participantName: 'John Doe',
    judgeId: 'judge123',
    judgeName: 'Judge Smith',
    totalScore: 85,
    isFinalized: false,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    // Score fields
    attire: 8,
    attentive: 4,
    courteous: 5,
    controlEquipment: 7,
    pickupCarrying: 3,
    showingHeadShape: 4,
    showingBodyType: 3,
    showingTail: 4,
    showingCoatTexture: 3,
    showingMouthTeethGums: 2,
    conditionMouthTeethGums: 2,
    showingNose: 2,
    showingEyes: 2,
    conditionNoseEyes: 2,
    showingEars: 2,
    earsClean: 2,
    showingToenailsClaws: 3,
    toenailsClipped: 5,
    showingBellyCoatCleanliness: 3,
    coatCleanWellGroomed: 7,
    catHealthCare: 3,
    generalKnowledge: 3,
    catBreedsShowing: 3,
    catAnatomy: 3,
    fourHKnowledge: 3,
    // Calculated totals
    appearanceTotal: 17,
    handlingTotal: 10,
    demonstrationTotal: 14,
    healthExaminationTotal: 21,
    groomingCareTotal: 13,
    knowledgeTotal: 12
  };

  it('should render nothing when no notifications', () => {
    const mockSubscription = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: jest.fn()
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    const { container } = render(<FitShowScoreNotifications />);
    expect(container.firstChild).toBeNull();
  });

  it('should setup subscriptions on mount', () => {
    const mockSubscription = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: jest.fn()
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications />);

    expect(mockClient.graphql).toHaveBeenCalledTimes(2);
    expect(mockSubscription.subscribe).toHaveBeenCalledTimes(2);
  });

  it('should display connection status', async () => {
    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        // Simulate successful connection
        setTimeout(() => next({ data: { onFitShowScoreCreated: mockFitShowScore } }), 0);
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications />);

    await waitFor(() => {
      expect(screen.getByText('Live Updates')).toBeInTheDocument();
    });
  });

  it('should handle score creation notifications', async () => {
    const onScoreCreated = jest.fn();
    let subscriptionCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        subscriptionCallback = next;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications onScoreCreated={onScoreCreated} />);

    // Simulate score creation event
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: mockFitShowScore } });
    });

    await waitFor(() => {
      expect(onScoreCreated).toHaveBeenCalledWith(mockFitShowScore);
      expect(screen.getByText('New Fit & Show Score')).toBeInTheDocument();
      expect(screen.getByText(/John Doe scored by Judge Smith \(85\/100\)/)).toBeInTheDocument();
    });
  });

  it('should handle score update notifications', async () => {
    const onScoreUpdate = jest.fn();
    let subscriptionCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        subscriptionCallback = next;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications onScoreUpdate={onScoreUpdate} />);

    // Simulate score update event
    const updatedScore = { ...mockFitShowScore, isFinalized: true };
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreUpdated: updatedScore } });
    });

    await waitFor(() => {
      expect(onScoreUpdate).toHaveBeenCalledWith(updatedScore);
      expect(screen.getByText('Fit & Show Score Updated')).toBeInTheDocument();
      expect(screen.getByText(/John Doe's score finalized by Judge Smith \(85\/100\)/)).toBeInTheDocument();
    });
  });

  it('should filter notifications by catId', async () => {
    const onScoreCreated = jest.fn();
    let subscriptionCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        subscriptionCallback = next;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications catId="cat456" onScoreCreated={onScoreCreated} />);

    // Simulate score creation for different cat
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: mockFitShowScore } });
    });

    await waitFor(() => {
      expect(onScoreCreated).not.toHaveBeenCalled();
    });

    // Simulate score creation for matching cat
    const matchingScore = { ...mockFitShowScore, catId: 'cat456' };
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: matchingScore } });
    });

    await waitFor(() => {
      expect(onScoreCreated).toHaveBeenCalledWith(matchingScore);
    });
  });

  it('should filter notifications by judgeId', async () => {
    const onScoreCreated = jest.fn();
    let subscriptionCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        subscriptionCallback = next;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications judgeId="judge456" onScoreCreated={onScoreCreated} />);

    // Simulate score creation for different judge
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: mockFitShowScore } });
    });

    await waitFor(() => {
      expect(onScoreCreated).not.toHaveBeenCalled();
    });

    // Simulate score creation for matching judge
    const matchingScore = { ...mockFitShowScore, judgeId: 'judge456' };
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: matchingScore } });
    });

    await waitFor(() => {
      expect(onScoreCreated).toHaveBeenCalledWith(matchingScore);
    });
  });

  it('should handle subscription errors', async () => {
    let subscriptionCallback: any;
    let errorCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next, error }) => {
        subscriptionCallback = next;
        errorCallback = error;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications />);

    // Simulate subscription error
    act(() => {
      errorCallback(new Error('Connection failed'));
    });

    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Lost connection to real-time updates')).toBeInTheDocument();
    });
  });

  it('should auto-hide notifications after timeout', async () => {
    jest.useFakeTimers();
    
    let subscriptionCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        subscriptionCallback = next;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications />);

    // Simulate score creation
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: mockFitShowScore } });
    });

    await waitFor(() => {
      expect(screen.getByText('New Fit & Show Score')).toBeInTheDocument();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('New Fit & Show Score')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('should cleanup subscriptions on unmount', () => {
    const mockUnsubscribe = jest.fn();
    const mockSubscription = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    const { unmount } = render(<FitShowScoreNotifications />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('should allow manual dismissal of notifications', async () => {
    let subscriptionCallback: any;

    const mockSubscription = {
      subscribe: jest.fn().mockImplementation(({ next }) => {
        subscriptionCallback = next;
        return { unsubscribe: jest.fn() };
      })
    };

    mockClient.graphql.mockReturnValue(mockSubscription);

    render(<FitShowScoreNotifications />);

    // Simulate score creation
    act(() => {
      subscriptionCallback({ data: { onFitShowScoreCreated: mockFitShowScore } });
    });

    await waitFor(() => {
      expect(screen.getByText('New Fit & Show Score')).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getByLabelText('Dismiss notification');
    act(() => {
      dismissButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByText('New Fit & Show Score')).not.toBeInTheDocument();
    });
  });
});
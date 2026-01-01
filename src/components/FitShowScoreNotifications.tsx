import React, { useEffect, useState, useCallback } from 'react';
import { FitShowScore } from '../types/scoring';
import { getAmplifyClient } from '../hooks/useAmplifyClient';

interface FitShowScoreNotificationsProps {
  onScoreUpdate?: (score: FitShowScore) => void;
  onScoreCreated?: (score: FitShowScore) => void;
  catId?: string;
  judgeId?: string;
  className?: string;
}

interface NotificationMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
}

const onFitShowScoreCreated = `
  subscription OnFitShowScoreCreated {
    onFitShowScoreCreated {
      id
      catId
      participantName
      judgeId
      judgeName
      totalScore
      isFinalized
      createdAt
      updatedAt
    }
  }
`;

const onFitShowScoreUpdated = `
  subscription OnFitShowScoreUpdated {
    onFitShowScoreUpdated {
      id
      catId
      participantName
      judgeId
      judgeName
      totalScore
      isFinalized
      createdAt
      updatedAt
    }
  }
`;

export const FitShowScoreNotifications: React.FC<FitShowScoreNotificationsProps> = ({
  onScoreUpdate,
  onScoreCreated,
  catId,
  judgeId,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => {
    const newNotification: NotificationMessage = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only 5 most recent

    if (notification.autoHide !== false) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    let createdSubscription: any;
    let updatedSubscription: any;

    const setupSubscriptions = async () => {
      try {
        setConnectionError(null);
        const client = getAmplifyClient();
        if (!client) {
          console.error('Amplify client not available');
          return;
        }
        
        // Subscribe to score creation events
        createdSubscription = client.graphql({
          query: onFitShowScoreCreated
        }).subscribe({
          next: ({ data }) => {
            const score = data.onFitShowScoreCreated as FitShowScore;
            
            // Filter by catId or judgeId if specified
            if (catId && score.catId !== catId) return;
            if (judgeId && score.judgeId !== judgeId) return;

            addNotification({
              type: 'success',
              title: 'New Fit & Show Score',
              message: `${score.participantName} scored by ${score.judgeName} (${score.totalScore}/100)`,
              autoHide: true
            });

            onScoreCreated?.(score);
          },
          error: (error) => {
            console.error('Fit & Show score creation subscription error:', error);
            setConnectionError('Failed to connect to real-time updates');
            addNotification({
              type: 'error',
              title: 'Connection Error',
              message: 'Lost connection to real-time updates',
              autoHide: false
            });
          }
        });

        // Subscribe to score update events
        updatedSubscription = client.graphql({
          query: onFitShowScoreUpdated
        }).subscribe({
          next: ({ data }) => {
            const score = data.onFitShowScoreUpdated as FitShowScore;
            
            // Filter by catId or judgeId if specified
            if (catId && score.catId !== catId) return;
            if (judgeId && score.judgeId !== judgeId) return;

            const statusText = score.isFinalized ? 'finalized' : 'updated';
            addNotification({
              type: score.isFinalized ? 'info' : 'warning',
              title: 'Fit & Show Score Updated',
              message: `${score.participantName}'s score ${statusText} by ${score.judgeName} (${score.totalScore}/100)`,
              autoHide: true
            });

            onScoreUpdate?.(score);
          },
          error: (error) => {
            console.error('Fit & Show score update subscription error:', error);
            setConnectionError('Failed to connect to real-time updates');
            addNotification({
              type: 'error',
              title: 'Connection Error',
              message: 'Lost connection to real-time updates',
              autoHide: false
            });
          }
        });

        setIsConnected(true);
        addNotification({
          type: 'info',
          title: 'Connected',
          message: 'Real-time fit & show score updates enabled',
          autoHide: true
        });

      } catch (error) {
        console.error('Failed to setup fit & show score subscriptions:', error);
        setConnectionError('Failed to setup real-time connections');
        addNotification({
          type: 'error',
          title: 'Setup Error',
          message: 'Failed to setup real-time updates',
          autoHide: false
        });
      }
    };

    setupSubscriptions();

    return () => {
      if (createdSubscription) {
        createdSubscription.unsubscribe();
      }
      if (updatedSubscription) {
        updatedSubscription.unsubscribe();
      }
      setIsConnected(false);
    };
  }, [catId, judgeId, onScoreCreated, onScoreUpdate, addNotification]);

  const getNotificationIcon = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (notifications.length === 0 && !connectionError) {
    return null;
  }

  return (
    <div className={`fit-show-notifications ${className}`}>
      {/* Connection Status */}
      <div className="mb-2">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          {isConnected ? 'Live Updates' : 'Disconnected'}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} relative`}
          >
            <button
              onClick={() => removeNotification(notification.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss notification"
            >
              ×
            </button>
            
            <div className="flex items-start">
              <span className="mr-2 text-lg">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  {notification.title}
                </h4>
                <p className="text-sm mt-1">
                  {notification.message}
                </p>
                <p className="text-xs mt-1 opacity-75">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <div>
              <h4 className="font-medium text-red-800 text-sm">
                Connection Issue
              </h4>
              <p className="text-red-700 text-sm mt-1">
                {connectionError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitShowScoreNotifications;
import React, { useState, useEffect } from 'react';
import { Score } from '../types/scoring';
import { getAmplifyClient } from '../hooks/useAmplifyClient';

const onScoreUpdate = `
  subscription OnScoreUpdate {
    onScoreUpdate {
      id
      catId
      judgeId
      judgeName
      totalScore
      timestamp
      isFinalized
    }
  }
`;

const getCatById = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
    }
  }
`;

interface Notification {
  id: string;
  type: 'new_score' | 'score_updated' | 'score_finalized';
  message: string;
  timestamp: Date;
  scoreId: string;
  catId: string;
  catName?: string;
  judgeName: string;
  totalScore: number;
  isRead: boolean;
}

interface ScoreNotificationsProps {
  maxNotifications?: number;
  autoHideDelay?: number;
  showOnlyFinalized?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

function ScoreNotifications({
  maxNotifications = 5,
  autoHideDelay = 5000,
  showOnlyFinalized = false,
  position = 'top-right'
}: ScoreNotificationsProps): JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Set up real-time subscription for score updates
    console.log('Setting up score notifications subscription...');
    const client = getAmplifyClient();
    if (!client) {
      console.error('Amplify client not available');
      return;
    }
    const scoreSubscription = client.graphql({
      query: onScoreUpdate
    }).subscribe({
      next: ({ data }) => {
        console.log('Score notification received:', data);
        if (data?.onScoreUpdate) {
          handleScoreUpdate(data.onScoreUpdate);
        }
      },
      error: (error) => {
        console.error('Score notifications subscription error:', error);
      }
    });

    return () => {
      console.log('Cleaning up score notifications subscription');
      scoreSubscription.unsubscribe();
    };
  }, []);

  const handleScoreUpdate = async (score: any) => {
    // Skip if we're only showing finalized scores and this isn't finalized
    if (showOnlyFinalized && !score.isFinalized) {
      return;
    }

    try {
      // Fetch cat name for better notification
      const client = getAmplifyClient();
      if (!client) {
        console.error('Amplify client not available');
        return;
      }
      const catResult = await client.graphql({
        query: getCatById,
        variables: { id: score.catId }
      });
      
      const catName = catResult.data.getCat?.name || 'Unknown Cat';
      
      // Determine notification type and message
      let type: Notification['type'];
      let message: string;
      
      if (score.isFinalized) {
        type = 'score_finalized';
        message = `${catName} received a final score of ${score.totalScore}/100 from ${score.judgeName}`;
      } else {
        // Check if this is a new score or an update
        const existingNotification = notifications.find(n => n.scoreId === score.id);
        if (existingNotification) {
          type = 'score_updated';
          message = `${catName}'s score was updated to ${score.totalScore}/100 by ${score.judgeName}`;
        } else {
          type = 'new_score';
          message = `${catName} received a new score of ${score.totalScore}/100 from ${score.judgeName}`;
        }
      }

      const notification: Notification = {
        id: `${score.id}-${Date.now()}`,
        type,
        message,
        timestamp: new Date(),
        scoreId: score.id,
        catId: score.catId,
        catName,
        judgeName: score.judgeName,
        totalScore: score.totalScore,
        isRead: false
      };

      setNotifications(prev => {
        const updated = [notification, ...prev.slice(0, maxNotifications - 1)];
        return updated;
      });

      // Auto-hide notification after delay
      if (autoHideDelay > 0) {
        setTimeout(() => {
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id ? { ...n, isRead: true } : n
            )
          );
        }, autoHideDelay);
      }

    } catch (error) {
      console.error('Error creating score notification:', error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_score': return '🆕';
      case 'score_updated': return '📝';
      case 'score_finalized': return '✅';
      default: return '📊';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'new_score': return '#17a2b8';
      case 'score_updated': return '#ffc107';
      case 'score_finalized': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1050,
      maxWidth: '400px',
      width: '100%'
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' };
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' };
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' };
      default:
        return { ...baseStyles, top: '20px', right: '20px' };
    }
  };

  if (!isVisible || notifications.length === 0) {
    return <></>;
  }

  return (
    <div style={getPositionStyles()}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '0.9em',
          fontWeight: 'bold'
        }}>
          <span>🔔 Score Updates</span>
          <div>
            <button
              onClick={clearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#6c757d',
                cursor: 'pointer',
                fontSize: '0.8em',
                marginRight: '8px'
              }}
              title="Clear all notifications"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6c757d',
                cursor: 'pointer',
                fontSize: '1.2em'
              }}
              title="Hide notifications"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notifications
          .filter(n => !n.isRead)
          .map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: '12px',
                backgroundColor: 'white',
                border: `2px solid ${getNotificationColor(notification.type)}`,
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                animation: 'slideIn 0.3s ease-out',
                cursor: 'pointer'
              }}
              onClick={() => markAsRead(notification.id)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <div style={{ fontSize: '1.2em' }}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9em',
                    lineHeight: '1.4',
                    marginBottom: '4px'
                  }}>
                    {notification.message}
                  </div>
                  <div style={{
                    fontSize: '0.75em',
                    color: '#6c757d'
                  }}>
                    {notification.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    cursor: 'pointer',
                    fontSize: '1em'
                  }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Show/Hide Toggle */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          style={{
            position: 'fixed',
            ...getPositionStyles(),
            width: 'auto',
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          🔔 Show Notifications ({notifications.filter(n => !n.isRead).length})
        </button>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ScoreNotifications;
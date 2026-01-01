import React, { useState, useEffect } from 'react';
import { ClassScore, RibbonType } from '../types/scoring';
import { getAmplifyClient } from '../hooks/useAmplifyClient';

const onClassScoreUpdate = `
  subscription OnClassScoreUpdate {
    onClassScoreUpdate {
      id
      catId
      judgeId
      judgeName
      totalScore
      ribbonEligibility
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

interface ClassScoreNotification {
  id: string;
  type: 'new_class_score' | 'class_score_updated' | 'class_score_finalized' | 'ribbon_achieved';
  message: string;
  timestamp: Date;
  scoreId: string;
  catId: string;
  catName?: string;
  judgeName: string;
  totalScore: number;
  ribbonEligibility: RibbonType;
  isRead: boolean;
}

interface ClassScoreNotificationsProps {
  maxNotifications?: number;
  autoHideDelay?: number;
  showOnlyFinalized?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

function ClassScoreNotifications({
  maxNotifications = 5,
  autoHideDelay = 5000,
  showOnlyFinalized = false,
  position = 'top-right'
}: ClassScoreNotificationsProps): JSX.Element {
  const [notifications, setNotifications] = useState<ClassScoreNotification[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Set up real-time subscription for class score updates
    console.log('Setting up class score notifications subscription...');
    const client = getAmplifyClient();
    if (!client) {
      console.error('Amplify client not available');
      return;
    }
    const classScoreSubscription = client.graphql({
      query: onClassScoreUpdate
    }).subscribe({
      next: ({ data }) => {
        console.log('Class score notification received:', data);
        if (data?.onClassScoreUpdate) {
          handleClassScoreUpdate(data.onClassScoreUpdate);
        }
      },
      error: (error) => {
        console.error('Class score notifications subscription error:', error);
      }
    });

    return () => {
      console.log('Cleaning up class score notifications subscription');
      classScoreSubscription.unsubscribe();
    };
  }, []);

  const handleClassScoreUpdate = async (score: any) => {
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
      let type: ClassScoreNotification['type'];
      let message: string;
      
      if (score.isFinalized) {
        type = 'class_score_finalized';
        message = `${catName} received a final class score of ${score.totalScore}/50 from ${score.judgeName}`;
        
        // Add ribbon achievement notification if it's a high ribbon
        if (score.ribbonEligibility === 'Blue') {
          setTimeout(() => {
            const ribbonNotification: ClassScoreNotification = {
              id: `${score.id}-ribbon-${Date.now()}`,
              type: 'ribbon_achieved',
              message: `🥇 ${catName} achieved Blue Ribbon eligibility with ${score.totalScore}/50 points!`,
              timestamp: new Date(),
              scoreId: score.id,
              catId: score.catId,
              catName,
              judgeName: score.judgeName,
              totalScore: score.totalScore,
              ribbonEligibility: score.ribbonEligibility,
              isRead: false
            };
            
            setNotifications(prev => [ribbonNotification, ...prev.slice(0, maxNotifications - 1)]);
            
            if (autoHideDelay > 0) {
              setTimeout(() => {
                setNotifications(prev => 
                  prev.map(n => 
                    n.id === ribbonNotification.id ? { ...n, isRead: true } : n
                  )
                );
              }, autoHideDelay);
            }
          }, 1000);
        }
      } else {
        // Check if this is a new score or an update
        const existingNotification = notifications.find(n => n.scoreId === score.id);
        if (existingNotification) {
          type = 'class_score_updated';
          message = `${catName}'s class score was updated to ${score.totalScore}/50 by ${score.judgeName}`;
        } else {
          type = 'new_class_score';
          message = `${catName} received a new class score of ${score.totalScore}/50 from ${score.judgeName}`;
        }
      }

      const notification: ClassScoreNotification = {
        id: `${score.id}-${Date.now()}`,
        type,
        message,
        timestamp: new Date(),
        scoreId: score.id,
        catId: score.catId,
        catName,
        judgeName: score.judgeName,
        totalScore: score.totalScore,
        ribbonEligibility: score.ribbonEligibility,
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
      console.error('Error creating class score notification:', error);
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

  const getNotificationIcon = (type: ClassScoreNotification['type']) => {
    switch (type) {
      case 'new_class_score': return '🆕';
      case 'class_score_updated': return '📝';
      case 'class_score_finalized': return '✅';
      case 'ribbon_achieved': return '🏆';
      default: return '📊';
    }
  };

  const getNotificationColor = (type: ClassScoreNotification['type']) => {
    switch (type) {
      case 'new_class_score': return '#2196f3'; // Blue theme for class scoring
      case 'class_score_updated': return '#ff9800'; // Orange
      case 'class_score_finalized': return '#4caf50'; // Green
      case 'ribbon_achieved': return '#ffd700'; // Gold
      default: return '#6c757d';
    }
  };

  const getRibbonIcon = (ribbonType: RibbonType) => {
    switch (ribbonType) {
      case 'Blue': return '🥇';
      case 'Red': return '🥈';
      case 'White': return '🥉';
      case 'Participation': return '🎖️';
      default: return '🏆';
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
          backgroundColor: '#e3f2fd', // Light blue for class scoring theme
          borderRadius: '6px',
          fontSize: '0.9em',
          fontWeight: 'bold',
          color: '#1976d2'
        }}>
          <span>🔔 Class Score Updates</span>
          <div>
            <button
              onClick={clearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#1976d2',
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
                color: '#1976d2',
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.75em',
                    color: '#6c757d'
                  }}>
                    <span>{notification.timestamp.toLocaleTimeString()}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getRibbonIcon(notification.ribbonEligibility)}
                      {notification.ribbonEligibility} Ribbon
                    </span>
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
            backgroundColor: '#2196f3', // Blue theme for class scoring
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          🔔 Show Class Score Notifications ({notifications.filter(n => !n.isRead).length})
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

export default ClassScoreNotifications;
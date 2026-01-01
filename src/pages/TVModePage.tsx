import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

interface Cat {
  id: string;
  name: string;
  owner: string;
  votes: number;
  cageNumber: number;
  ownerAgeGroup?: string;
  catAgeGroup?: string;
  peoplesChoiceGroup?: number;
}

interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
}

const listCats = `
  query ListCats {
    listCats {
      items {
        id
        name
        owner
        votes
        cageNumber
        ownerAgeGroup
        catAgeGroup
        peoplesChoiceGroup
      }
    }
  }
`;

const onVoteUpdate = `
  subscription OnVoteUpdate {
    onVoteUpdate {
      id
      votes
    }
  }
`;

function TVModePage(): JSX.Element {
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: window.innerWidth,
    height: window.innerHeight,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    isSmallScreen: window.innerWidth < 768,
    isMediumScreen: window.innerWidth >= 768 && window.innerWidth < 1200,
    isLargeScreen: window.innerWidth >= 1200
  });

  // Handle viewport changes and orientation
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';
    
    setViewportInfo({
      width,
      height,
      orientation,
      isSmallScreen: width < 768,
      isMediumScreen: width >= 768 && width < 1200,
      isLargeScreen: width >= 1200
    });
  }, []);

  // Handle orientation change with debouncing
  const handleOrientationChange = useCallback(() => {
    // Small delay to ensure viewport dimensions are updated
    setTimeout(handleResize, 100);
  }, [handleResize]);

  useEffect(() => {
    fetchCats();

    // Set up viewport and orientation listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Set up real-time subscription for vote updates
    console.log('Setting up TV mode vote subscription...');
    let voteSubscription: any;
    
    try {
      const subscription = client.graphql({
        query: onVoteUpdate
      });
      
      // Check if it's a subscription (has subscribe method)
      if (subscription && typeof (subscription as any).subscribe === 'function') {
        voteSubscription = (subscription as any).subscribe({
          next: ({ data }: any) => {
            console.log('TV mode vote update received:', data);
            if (data?.onVoteUpdate?.id) {
              setCats(prev => {
                const updated = prev.map(cat =>
                  cat.id === data.onVoteUpdate.id
                    ? { ...cat, votes: data.onVoteUpdate.votes }
                    : cat
                );
                return updated.sort((a: Cat, b: Cat) => b.votes - a.votes);
              });
            }
          },
          error: (error: any) => {
            console.error('TV mode vote subscription error:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to set up TV mode subscription:', error);
    }

    return () => {
      console.log('Cleaning up TV mode subscription and listeners');
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (voteSubscription && typeof voteSubscription.unsubscribe === 'function') {
        voteSubscription.unsubscribe();
      }
    };
  }, [handleResize, handleOrientationChange]);

  const fetchCats = async () => {
    try {
      const result = await client.graphql({ query: listCats });
      if (result.data && result.data.listCats && result.data.listCats.items) {
        const sortedCats = result.data.listCats.items.sort((a: Cat, b: Cat) => b.votes - a.votes);
        setCats(sortedCats);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cats:', error);
      setLoading(false);
    }
  };

  // Calculate responsive grid columns based on viewport
  const getGridColumns = () => {
    if (viewportInfo.isSmallScreen) {
      return viewportInfo.orientation === 'landscape' ? 2 : 1;
    } else if (viewportInfo.isMediumScreen) {
      return viewportInfo.orientation === 'landscape' ? 4 : 3;
    } else {
      return viewportInfo.orientation === 'landscape' ? 6 : 4;
    }
  };

  // Calculate font sizes based on screen size
  const getFontSizes = () => {
    if (viewportInfo.isSmallScreen) {
      return {
        title: viewportInfo.orientation === 'landscape' ? '2rem' : '1.5rem',
        subtitle: viewportInfo.orientation === 'landscape' ? '1.2rem' : '1rem',
        votes: viewportInfo.orientation === 'landscape' ? '1.5rem' : '1.2rem',
        rank: viewportInfo.orientation === 'landscape' ? '1.8rem' : '1.4rem'
      };
    } else if (viewportInfo.isMediumScreen) {
      return {
        title: '2.5rem',
        subtitle: '1.4rem',
        votes: '1.8rem',
        rank: '2rem'
      };
    } else {
      return {
        title: '3rem',
        subtitle: '1.6rem',
        votes: '2rem',
        rank: '2.5rem'
      };
    }
  };

  const fontSizes = getFontSizes();

  // Filter cats by selected group
  const filteredCats = selectedGroup 
    ? cats.filter(cat => cat.peoplesChoiceGroup === selectedGroup)
    : cats;

  if (loading) {
    return (
      <div className="tv-mode" data-orientation={viewportInfo.orientation}>
        <div className="tv-header">
          <h1 style={{ fontSize: fontSizes.title }}>🐱 4H People's Choice Award 🐱</h1>
          <p style={{ fontSize: fontSizes.subtitle }}>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-mode" data-orientation={viewportInfo.orientation}>
      <div className="tv-header">
        <h1 style={{ fontSize: fontSizes.title }}>🐱 4H People's Choice Award 🐱</h1>
        <p className="tv-subtitle" style={{ fontSize: fontSizes.subtitle }}>
          Live Results - Real-time Updates
          {selectedGroup && ` • Group ${selectedGroup}`}
        </p>
        
        {/* Group Selection */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          margin: '1rem 0',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: viewportInfo.isSmallScreen ? '0.9rem' : '1rem',
              backgroundColor: selectedGroup === null ? '#2e7d32' : 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            All Groups
          </button>
          {[1, 2, 3, 4].map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: viewportInfo.isSmallScreen ? '0.9rem' : '1rem',
                backgroundColor: selectedGroup === group ? '#2e7d32' : 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Group {group}
            </button>
          ))}
        </div>
        
        <div className="tv-total-votes" style={{ fontSize: fontSizes.subtitle }}>
          <strong>
            {selectedGroup 
              ? `Group ${selectedGroup} Votes: ${filteredCats.reduce((sum, cat) => sum + cat.votes, 0)}`
              : `Total Votes: ${cats.reduce((sum, cat) => sum + cat.votes, 0)}`
            }
          </strong>
        </div>
        <div className="tv-viewport-info">
          <small>
            {viewportInfo.width}×{viewportInfo.height} • {viewportInfo.orientation}
          </small>
        </div>
      </div>

      <div 
        className="tv-grid" 
        style={{ 
          gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
          gap: viewportInfo.isSmallScreen ? '0.5rem' : '1rem'
        }}
      >
        {filteredCats.map((cat, index) => (
          <div key={cat.id} className="tv-cat-card">
            <div className="tv-rank" style={{ fontSize: fontSizes.rank }}>
              #{index + 1}
            </div>
            <div className="tv-cage" style={{ fontSize: fontSizes.subtitle }}>
              Cage {cat.cageNumber || (index + 1)}
            </div>
            <div className="tv-votes" style={{ fontSize: fontSizes.votes }}>
              {cat.votes} vote{cat.votes !== 1 ? 's' : ''}
            </div>
            {viewportInfo.isLargeScreen && cat.name && (
              <div className="tv-cat-name" style={{ fontSize: fontSizes.subtitle }}>
                {cat.name}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="tv-footer">
        <p style={{ fontSize: fontSizes.subtitle }}>
          Scan QR codes at each cage to vote! 📱
        </p>
      </div>
    </div>
  );
}

export default TVModePage;
import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { OWNER_AGE_GROUPS, getOwnerAgeGroupLabel } from '../utils/ageGroups';

const client = generateClient();

type ViewMode = 'ranked' | 'ageGroups';
// 'total' or a specific day's bucket, keyed by its YYYY-MM-DD (Pacific) date string
type VoteMetric = 'total' | string;

const RECENT_VOTES_REFRESH_MS = 30000;

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

const getVotesByDay = `
  query GetVotesByDay($catId: ID!) {
    getVotesByDay(catId: $catId) {
      date
      votes
    }
  }
`;

// Same convention as the venue-local day bucketing on the backend: sample a
// moment ~24h apart and read its Pacific calendar date, rather than doing
// timezone-aware date math (which DST makes fiddly for little benefit here).
function getLastPacificDates(days: number): string[] {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });
  const now = Date.now();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(formatter.format(new Date(now - i * 24 * 60 * 60 * 1000)));
  }
  return dates;
}

// `date` is a YYYY-MM-DD bucket key, not a real instant, so parse it as a
// local date (no time component) rather than letting `new Date(string)`
// interpret it as UTC midnight and risk shifting it to the wrong day.
function formatDayLabel(date: string, todayStr: string, yesterdayStr: string): string {
  if (date === todayStr) return 'Today';
  if (date === yesterdayStr) return 'Yesterday';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TVModePage(): JSX.Element {
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ranked');
  const [voteMetric, setVoteMetric] = useState<VoteMetric>('total');
  const [recentVotesByDay, setRecentVotesByDay] = useState<Record<string, Record<string, number>>>({});
  const [recentVotesLoading, setRecentVotesLoading] = useState(false);
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

  const recentDates = getLastPacificDates(4);

  const fetchRecentVotesByDay = useCallback(async (catList: Cat[]) => {
    if (catList.length === 0) {
      setRecentVotesByDay({});
      return;
    }

    setRecentVotesLoading(true);
    try {
      const results = await Promise.all(
        catList.map(async (cat) => {
          try {
            const result: any = await client.graphql({
              query: getVotesByDay,
              variables: { catId: cat.id },
            });
            const byDate: Record<string, number> = {};
            (result.data?.getVotesByDay || []).forEach((day: any) => {
              byDate[day.date] = day.votes;
            });
            return { catId: cat.id, byDate };
          } catch (error) {
            console.error(`Error fetching daily votes for cat ${cat.id}:`, error);
            return { catId: cat.id, byDate: {} };
          }
        })
      );

      const map: Record<string, Record<string, number>> = {};
      results.forEach(({ catId, byDate }) => {
        map[catId] = byDate;
      });
      setRecentVotesByDay(map);
    } finally {
      setRecentVotesLoading(false);
    }
  }, []);

  // Live per-vote subscription updates keep `cats` (event totals) current, but
  // per-day totals aren't worth recomputing on every single vote — refresh
  // them on an interval instead while a specific day is selected.
  useEffect(() => {
    if (voteMetric === 'total' || cats.length === 0) return;

    fetchRecentVotesByDay(cats);
    const interval = setInterval(() => fetchRecentVotesByDay(cats), RECENT_VOTES_REFRESH_MS);
    return () => clearInterval(interval);
  }, [voteMetric, cats, fetchRecentVotesByDay]);

  const getVoteCount = useCallback(
    (cat: Cat) => (voteMetric === 'total' ? cat.votes : recentVotesByDay[cat.id]?.[voteMetric] ?? 0),
    [voteMetric, recentVotesByDay]
  );

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

  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    margin: '1rem 0',
    flexWrap: 'wrap',
  };

  const toggleButtonStyle = (active: boolean, isSmallScreen: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    fontSize: isSmallScreen ? '0.9rem' : '1rem',
    backgroundColor: active ? '#2e7d32' : 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  });

  // Filter cats by selected group, sorted by whichever vote metric is active
  const filteredCats = (selectedGroup
    ? cats.filter(cat => cat.peoplesChoiceGroup === selectedGroup)
    : cats
  ).slice().sort((a, b) => getVoteCount(b) - getVoteCount(a));

  // Top 5 per owner age group, sorted by whichever vote metric is active.
  // Cloverbuds displayed last -- everywhere else (forms, etc.) still uses
  // OWNER_AGE_GROUPS' natural youngest-to-oldest order.
  const tvAgeGroupOrder = [
    ...OWNER_AGE_GROUPS.filter(group => group.value !== 'cloverbuds'),
    ...OWNER_AGE_GROUPS.filter(group => group.value === 'cloverbuds'),
  ];
  const topByAgeGroup = tvAgeGroupOrder.map(group => ({
    group,
    cats: cats
      .filter(cat => cat.ownerAgeGroup === group.value)
      .slice()
      .sort((a, b) => getVoteCount(b) - getVoteCount(a))
      .slice(0, 5),
  }));

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
          Live Results
          {viewMode === 'ranked' && selectedGroup && ` • Group ${selectedGroup}`}
          {viewMode === 'ageGroups' && ' • Top 5 by Age Group'}
          {voteMetric !== 'total' && ` • ${formatDayLabel(voteMetric, recentDates[0], recentDates[1])}`}
        </p>

        {/* View Mode Selection */}
        <div style={toggleRowStyle}>
          {(['ranked', 'ageGroups'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={toggleButtonStyle(viewMode === mode, viewportInfo.isSmallScreen)}
            >
              {mode === 'ranked' ? 'Ranked List' : 'Top 5 by Age Group'}
            </button>
          ))}
        </div>

        {/* Vote Metric Selection — total, or any one of the last 4 days */}
        <div style={toggleRowStyle}>
          <button
            onClick={() => setVoteMetric('total')}
            style={toggleButtonStyle(voteMetric === 'total', viewportInfo.isSmallScreen)}
          >
            Total Votes
          </button>
          {recentDates.map(date => (
            <button
              key={date}
              onClick={() => setVoteMetric(date)}
              style={toggleButtonStyle(voteMetric === date, viewportInfo.isSmallScreen)}
            >
              {formatDayLabel(date, recentDates[0], recentDates[1])}
            </button>
          ))}
          {voteMetric !== 'total' && recentVotesLoading && (
            <span style={{ alignSelf: 'center', opacity: 0.8, fontSize: '0.9rem' }}>Updating…</span>
          )}
        </div>

        {/* Group Selection (People's Choice) — only meaningful in the ranked list view */}
        {viewMode === 'ranked' && (
          <div style={toggleRowStyle}>
            <button
              onClick={() => setSelectedGroup(null)}
              style={toggleButtonStyle(selectedGroup === null, viewportInfo.isSmallScreen)}
            >
              All Groups
            </button>
            {[1, 2, 3, 4].map(group => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                style={toggleButtonStyle(selectedGroup === group, viewportInfo.isSmallScreen)}
              >
                Group {group}
              </button>
            ))}
          </div>
        )}

        <div className="tv-total-votes" style={{ fontSize: fontSizes.subtitle }}>
          <strong>
            {(() => {
              const metricLabel = voteMetric === 'total' ? '' : ` (${formatDayLabel(voteMetric, recentDates[0], recentDates[1])})`;
              return viewMode === 'ranked'
                ? `${selectedGroup ? `Group ${selectedGroup} Votes` : 'Total Votes'}${metricLabel}: ${filteredCats.reduce((sum, cat) => sum + getVoteCount(cat), 0)}`
                : `Votes Shown${metricLabel || ' (Total)'}: ${topByAgeGroup.reduce((sum, g) => sum + g.cats.reduce((s, cat) => s + getVoteCount(cat), 0), 0)}`;
            })()}
          </strong>
        </div>
        <div className="tv-viewport-info">
          <small>
            {viewportInfo.width}×{viewportInfo.height} • {viewportInfo.orientation}
          </small>
        </div>
      </div>

      {viewMode === 'ranked' ? (
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
                {getVoteCount(cat)} vote{getVoteCount(cat) !== 1 ? 's' : ''}
              </div>
              {viewportInfo.isLargeScreen && cat.name && (
                <div className="tv-cat-name" style={{ fontSize: fontSizes.subtitle }}>
                  {cat.name}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="tv-age-group-grid"
          style={{
            gridTemplateColumns: `repeat(${viewportInfo.isSmallScreen ? 1 : 2}, 1fr)`,
            gap: viewportInfo.isSmallScreen ? '0.5rem' : '1rem'
          }}
        >
          {topByAgeGroup.map(({ group, cats: groupCats }) => (
            <div key={group.value} className="tv-age-group-panel">
              <div className="tv-age-group-title" style={{ fontSize: fontSizes.subtitle }}>
                {getOwnerAgeGroupLabel(group.value)}
              </div>
              {groupCats.length === 0 ? (
                <div className="tv-age-group-empty">No entries yet</div>
              ) : (
                groupCats.map((cat, index) => (
                  <div key={cat.id} className="tv-age-group-item">
                    <span className="tv-age-group-rank" style={{ fontSize: fontSizes.rank }}>
                      #{index + 1}
                    </span>
                    <span className="tv-age-group-cage">Cage {cat.cageNumber || (index + 1)}</span>
                    {viewportInfo.isLargeScreen && cat.name && (
                      <span className="tv-age-group-name">{cat.name}</span>
                    )}
                    <span className="tv-age-group-votes" style={{ fontSize: fontSizes.votes }}>
                      {getVoteCount(cat)} vote{getVoteCount(cat) !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      <div className="tv-footer">
        <p style={{ fontSize: fontSizes.subtitle }}>
          Scan QR codes at each cage to vote! 📱
        </p>
      </div>
    </div>
  );
}

export default TVModePage;
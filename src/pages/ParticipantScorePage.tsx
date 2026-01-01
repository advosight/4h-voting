import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import ParticipantScoreView from '../components/ParticipantScoreView';
import { Score } from '../types/scoring';

const client = generateClient();

const getCat = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
      votes
    }
  }
`;

const getScoresByCat = `
  query GetScoresByCat($catId: ID!) {
    getScoresByCat(catId: $catId) {
      items {
        id
        catId
        judgeId
        judgeName
        cageConditionScore
        cageConditionComments
        catConditionScore
        catConditionComments
        groomingScore
        groomingComments
        overallScore
        overallComments
        totalScore
        timestamp
        isFinalized
      }
    }
  }
`;

const listAllScores = `
  query ListAllScores {
    listAllScores {
      items {
        id
        catId
        judgeId
        judgeName
        totalScore
        timestamp
        isFinalized
      }
    }
  }
`;

const onScoreUpdate = `
  subscription OnScoreUpdate {
    onScoreUpdate {
      id
      catId
      judgeId
      judgeName
      cageConditionScore
      cageConditionComments
      catConditionScore
      catConditionComments
      groomingScore
      groomingComments
      overallScore
      overallComments
      totalScore
      timestamp
      isFinalized
    }
  }
`;

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber?: number;
}

const ParticipantScorePage: React.FC = () => {
  const { catId } = useParams<{ catId: string }>();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Cat | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [allScores, setAllScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!catId) {
      setError('No cat ID provided');
      setLoading(false);
      return;
    }

    fetchCatAndScores();
    
    // Set up real-time subscription for score updates
    console.log('Setting up participant score subscription...');
    const scoreSubscription = client.graphql({
      query: onScoreUpdate
    }).subscribe({
      next: ({ data }) => {
        console.log('Participant score update received:', data);
        if (data?.onScoreUpdate) {
          const updatedScore = data.onScoreUpdate;
          
          // Update scores if this update is for our cat
          if (updatedScore.catId === catId) {
            setScores(prev => {
              const existingIndex = prev.findIndex(score => score.id === updatedScore.id);
              
              if (existingIndex >= 0) {
                // Update existing score
                const updated = [...prev];
                updated[existingIndex] = updatedScore;
                return updated;
              } else {
                // Add new score
                return [...prev, updatedScore];
              }
            });
          }
          
          // Update all scores for ranking calculation
          setAllScores(prev => {
            const existingIndex = prev.findIndex(score => score.id === updatedScore.id);
            
            if (existingIndex >= 0) {
              // Update existing score
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                totalScore: updatedScore.totalScore,
                timestamp: updatedScore.timestamp,
                isFinalized: updatedScore.isFinalized
              };
              return updated;
            } else {
              // Add new score
              return [...prev, {
                id: updatedScore.id,
                catId: updatedScore.catId,
                judgeId: updatedScore.judgeId,
                judgeName: updatedScore.judgeName,
                totalScore: updatedScore.totalScore,
                timestamp: updatedScore.timestamp,
                isFinalized: updatedScore.isFinalized
              }];
            }
          });
        }
      },
      error: (error) => {
        console.error('Participant score subscription error:', error);
      }
    });

    return () => {
      console.log('Cleaning up participant score subscription');
      scoreSubscription.unsubscribe();
    };
  }, [catId]);

  const fetchCatAndScores = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cat data
      const catResult = await client.graphql({
        query: getCat,
        variables: { id: catId }
      });

      if (!catResult.data.getCat) {
        throw new Error('Cat not found');
      }

      const catData = catResult.data.getCat;
      setCat(catData);

      // Fetch scores for this cat
      const scoresResult = await client.graphql({
        query: getScoresByCat,
        variables: { catId }
      });

      setScores(scoresResult.data.getScoresByCat.items || []);

      // Fetch all scores for ranking calculation
      try {
        const allScoresResult = await client.graphql({
          query: listAllScores
        });
        setAllScores(allScoresResult.data.listAllScores.items || []);
      } catch (allScoresError) {
        console.warn('Could not fetch all scores for ranking:', allScoresError);
        // Continue without ranking data
      }

    } catch (err) {
      console.error('Error fetching cat scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (!catId) {
    return (
      <div className="participant-score-page error">
        <h1>Invalid Cat ID</h1>
        <p>Please provide a valid cat ID to view scores.</p>
        <button onClick={handleBackToHome} className="back-button">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="participant-score-page">
      <div className="page-header">
        <button onClick={handleBackToHome} className="back-button">
          ← Back to Home
        </button>
        <h1>Cat Scores</h1>
      </div>

      <div className="score-content">
        <ParticipantScoreView
          catId={catId}
          scores={scores}
          cat={cat}
          allScores={allScores}
          loading={loading}
          error={error}
        />
      </div>

      <div className="page-footer">
        <p>
          Questions about your scores? Contact the 4H organizers for more information.
        </p>
      </div>
    </div>
  );
};

export default ParticipantScorePage;
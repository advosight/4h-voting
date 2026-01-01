import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import ParticipantClassScoreView from '../components/ParticipantClassScoreView';
import { ClassScore, Cat } from '../types/scoring';

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

const getClassScoresByCat = `
  query GetClassScoresByCat($catId: ID!) {
    getClassScoresByCat(catId: $catId) {
      items {
        id
        catId
        judgeId
        judgeName
        beautyScore
        beautyComments
        personalityScore
        personalityComments
        balanceProportionScore
        balanceProportionComments
        coatCleanGroomed
        teethGumsHealthy
        eyesNoseClear
        earsCleanMiteFree
        toenailsClipped
        fleaIssues
        healthGroomingComments
        totalScore
        ribbonEligibility
        timestamp
        isFinalized
      }
    }
  }
`;

const listAllClassScores = `
  query ListAllClassScores {
    listAllClassScores {
      items {
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
  }
`;

const onClassScoreUpdate = `
  subscription OnClassScoreUpdate {
    onClassScoreUpdate {
      id
      catId
      judgeId
      judgeName
      beautyScore
      beautyComments
      personalityScore
      personalityComments
      balanceProportionScore
      balanceProportionComments
      coatCleanGroomed
      teethGumsHealthy
      eyesNoseClear
      earsCleanMiteFree
      toenailsClipped
      fleaIssues
      healthGroomingComments
      totalScore
      ribbonEligibility
      timestamp
      isFinalized
    }
  }
`;

const ParticipantClassScorePage: React.FC = () => {
  const { catId } = useParams<{ catId: string }>();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Cat | null>(null);
  const [classScores, setClassScores] = useState<ClassScore[]>([]);
  const [allClassScores, setAllClassScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!catId) {
      setError('No cat ID provided');
      setLoading(false);
      return;
    }

    fetchCatAndClassScores();
    
    // Set up real-time subscription for class score updates
    console.log('Setting up participant class score subscription...');
    const classScoreSubscription = client.graphql({
      query: onClassScoreUpdate
    }).subscribe({
      next: (result) => {
        console.log('Participant class score update received:', result);
        if (result.data?.onClassScoreUpdate) {
          const updatedScore = result.data.onClassScoreUpdate;
          
          // Update class scores if this update is for our cat
          if (updatedScore.catId === catId) {
            setClassScores(prev => {
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
          
          // Update all class scores for ranking calculation
          setAllClassScores(prev => {
            const existingIndex = prev.findIndex(score => score.id === updatedScore.id);
            
            if (existingIndex >= 0) {
              // Update existing score
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                totalScore: updatedScore.totalScore,
                ribbonEligibility: updatedScore.ribbonEligibility,
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
                ribbonEligibility: updatedScore.ribbonEligibility,
                timestamp: updatedScore.timestamp,
                isFinalized: updatedScore.isFinalized
              } as ClassScore];
            }
          });
        }
      },
      error: (subscriptionError) => {
        console.error('Participant class score subscription error:', subscriptionError);
      }
    });

    return () => {
      console.log('Cleaning up participant class score subscription');
      classScoreSubscription.unsubscribe();
    };
  }, [catId]);

  const fetchCatAndClassScores = async () => {
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

      // Fetch class scores for this cat
      const classScoresResult = await client.graphql({
        query: getClassScoresByCat,
        variables: { catId }
      });

      setClassScores(classScoresResult.data.getClassScoresByCat.items || []);

      // Fetch all class scores for ranking calculation
      try {
        const allClassScoresResult = await client.graphql({
          query: listAllClassScores
        });
        setAllClassScores(allClassScoresResult.data.listAllClassScores.items || []);
      } catch (allScoresError) {
        console.warn('Could not fetch all class scores for ranking:', allScoresError);
        // Continue without ranking data
      }

    } catch (err) {
      console.error('Error fetching cat class scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load class scores');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (!catId) {
    return (
      <div className="participant-class-score-page error">
        <h1>Invalid Cat ID</h1>
        <p>Please provide a valid cat ID to view class scores.</p>
        <button onClick={handleBackToHome} className="back-button">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="participant-class-score-page">
      <div className="page-header class-scoring">
        <button onClick={handleBackToHome} className="back-button">
          ← Back to Home
        </button>
        <h1>Class Competition Scores</h1>
        <div className="page-type-indicator">Type Class Scoring Results</div>
      </div>

      <div className="score-content">
        <ParticipantClassScoreView
          catId={catId}
          classScores={classScores}
          cat={cat}
          allClassScores={allClassScores}
          loading={loading}
          error={error}
        />
      </div>

      <div className="page-footer">
        <p>
          Questions about your class scores? Contact the 4H organizers for more information.
        </p>
        <p className="scoring-info">
          Class scoring evaluates cats on beauty (15 pts), personality (20 pts), 
          and balance/proportion (15 pts), plus health & grooming standards.
        </p>
      </div>
    </div>
  );
};

export default ParticipantClassScorePage;
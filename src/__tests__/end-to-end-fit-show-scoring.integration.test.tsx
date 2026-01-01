import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import FitShowScoringPage from '../pages/FitShowScoringPage';
import ParticipantFitShowScoreView from '../components/ParticipantFitShowScoreView';
import FitShowScoreReports from '../components/FitShowScoreReports';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
jest.mock('aws-amplify/auth');

const mockClient = {
  graphql: jest.fn(),
  cancel: jest.fn(),
};

(generateClient as jest.Mock).mockReturnValue(mockClient);

// Mock data
const mockCat = {
  id: 'cat-123',
  name: 'Fluffy',
  ownerName: 'John Doe',
  cageNumber: 5,
  photo: null
};

const mockFitShowScore = {
  id: 'score-123',
  catId: 'cat-123',
  participantName: 'John Doe',
  judgeId: 'judge-123',
  judgeName: 'Judge Smith',
  // Appearance & Demeanor (20 points)
  attire: 8,
  attentive: 4,
  courteous: 5,
  // Handling & Control (14 points)
  controlEquipment: 7,
  pickupCarrying: 3,
  // Demonstration Skills (16 points)
  showingHeadShape: 3,
  showingBodyType: 4,
  showingTail: 3,
  showingCoatTexture: 4,
  // Health Examination (21 points)
  showingMouthTeethGums: 2,
  conditionMouthTeethGums: 2,
  showingNose: 2,
  showingEyes: 2,
  conditionNoseEyes: 2,
  showingEars: 2,
  earsClean: 2,
  showingToenailsClaws: 2,
  toenailsClipped: 5,
  // Grooming & Care (14 points)
  showingBellyCoatCleanliness: 3,
  coatCleanWellGroomed: 7,
  catHealthCare: 3,
  // Knowledge (12 points)
  generalKnowledge: 3,
  catBreedsShowing: 3,
  catAnatomy: 3,
  fourHKnowledge: 3,
  // Calculated totals
  appearanceTotal: 17,
  handlingTotal: 10,
  demonstrationTotal: 14,
  healthExaminationTotal: 19,
  groomingCareTotal: 13,
  knowledgeTotal: 12,
  totalScore: 85,
  // Comments
  appearanceComments: 'Well dressed and professional',
  handlingComments: 'Good control, needs practice with harness',
  demonstrationComments: 'Clear demonstrations of features',
  healthExaminationComments: 'Thorough examination technique',
  groomingCareComments: 'Cat well groomed and healthy',
  knowledgeComments: 'Excellent knowledge of breeds and anatomy',
  // Metadata
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  isFinalized: false
};

describe('End-to-End Fit and Show Scoring Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Amplify configuration
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql',
          region: 'us-east-1',
          defaultAuthMode: 'userPool'
        }
      }
    });
  });

  describe('Complete Fit and Show Scoring Workflow', () => {
    test('should complete full scoring workflow from form to reports', async () => {
      // Mock GraphQL responses
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { createFitShowScore: mockFitShowScore }
        })
        .mockResolvedValueOnce({
          data: { updateFitShowScore: { ...mockFitShowScore, isFinalized: true } }
        });

      // Step 1: Render scoring page
      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });

      // Step 2: Fill out scoring form
      // Appearance scores
      const attireInput = screen.getByLabelText(/neat.*clean.*appropriate attire/i);
      fireEvent.change(attireInput, { target: { value: '8' } });

      const attentiveInput = screen.getByLabelText(/attentive/i);
      fireEvent.change(attentiveInput, { target: { value: '4' } });

      const courteousInput = screen.getByLabelText(/courteous/i);
      fireEvent.change(courteousInput, { target: { value: '5' } });

      // Handling scores
      const controlInput = screen.getByLabelText(/control.*harness.*leash/i);
      fireEvent.change(controlInput, { target: { value: '7' } });

      const pickupInput = screen.getByLabelText(/picking up.*carrying/i);
      fireEvent.change(pickupInput, { target: { value: '3' } });

      // Knowledge scores
      const generalKnowledgeInput = screen.getByLabelText(/general knowledge/i);
      fireEvent.change(generalKnowledgeInput, { target: { value: '3' } });

      // Step 3: Add comments
      const appearanceComments = screen.getByLabelText(/appearance.*comments/i);
      fireEvent.change(appearanceComments, { 
        target: { value: 'Well dressed and professional' } 
      });

      // Step 4: Save score
      const saveButton = screen.getByRole('button', { name: /save score/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('createFitShowScore')
          })
        );
      });

      // Step 5: Finalize score
      const finalizeButton = screen.getByRole('button', { name: /finalize score/i });
      fireEvent.click(finalizeButton);

      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('updateFitShowScore')
          })
        );
      });

      // Verify total score calculation
      expect(screen.getByText(/total.*85/i)).toBeInTheDocument();
    });

    test('should handle participant score viewing workflow', async () => {
      mockClient.graphql.mockResolvedValue({
        data: { 
          getFitShowScoresByCat: [{ ...mockFitShowScore, isFinalized: true }]
        }
      });

      render(
        <BrowserRouter>
          <ParticipantFitShowScoreView catId="cat-123" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Your Fit and Show Score')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('Well dressed and professional')).toBeInTheDocument();
      });

      // Verify category breakdowns are displayed
      expect(screen.getByText(/appearance.*17/i)).toBeInTheDocument();
      expect(screen.getByText(/handling.*10/i)).toBeInTheDocument();
      expect(screen.getByText(/knowledge.*12/i)).toBeInTheDocument();
    });

    test('should handle administrative reporting workflow', async () => {
      const mockScores = [
        mockFitShowScore,
        { ...mockFitShowScore, id: 'score-456', totalScore: 92, participantName: 'Jane Smith' }
      ];

      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: mockScores } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Test filtering
      const filterInput = screen.getByLabelText(/filter by participant/i);
      fireEvent.change(filterInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });

      // Test export functionality
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      // Verify CSV export was triggered
      expect(screen.getByText(/export completed/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling Workflows', () => {
    test('should handle network errors gracefully', async () => {
      mockClient.graphql.mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Test retry functionality
      mockClient.graphql.mockResolvedValueOnce({
        data: { getCat: mockCat }
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });
    });

    test('should handle validation errors', async () => {
      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      // Try to save with invalid scores
      const attireInput = screen.getByLabelText(/neat.*clean.*appropriate attire/i);
      fireEvent.change(attireInput, { target: { value: '15' } }); // Invalid: max is 10

      const saveButton = screen.getByRole('button', { name: /save score/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/score must be between 1 and 10/i)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Existing Systems', () => {
    test('should integrate with cage scoring system', async () => {
      const mockCatWithCageScore = {
        ...mockCat,
        cageScore: {
          totalScore: 78,
          judgeId: 'judge-456',
          isFinalized: true
        }
      };

      mockClient.graphql.mockResolvedValue({
        data: { getCat: mockCatWithCageScore }
      });

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
        expect(screen.getByText(/cage score.*78/i)).toBeInTheDocument();
      });

      // Verify fit and show scoring is separate from cage scoring
      expect(screen.getByText(/participant evaluation/i)).toBeInTheDocument();
      expect(screen.queryByText(/cat evaluation/i)).not.toBeInTheDocument();
    });

    test('should integrate with class scoring system', async () => {
      const mockCatWithClassScore = {
        ...mockCat,
        classScore: {
          totalScore: 82,
          judgeId: 'judge-789',
          isFinalized: true
        }
      };

      mockClient.graphql.mockResolvedValue({
        data: { getCat: mockCatWithClassScore }
      });

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
        expect(screen.getByText(/class score.*82/i)).toBeInTheDocument();
      });

      // Verify visual distinction from class scoring
      expect(screen.getByText(/showmanship evaluation/i)).toBeInTheDocument();
    });
  });
});
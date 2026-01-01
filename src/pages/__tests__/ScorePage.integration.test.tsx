import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ScorePage from '../ScorePage';

// Mock AWS Amplify
jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: jest.fn()
  })
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn()
}));

// Mock the ScoringForm component
jest.mock('../../components/ScoringForm', () => {
  return function MockScoringForm() {
    return <div data-testid="scoring-form">Scoring Form</div>;
  };
});

describe('ScorePage Integration', () => {
  it('should render without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/score/5']}>
        <Routes>
          <Route path="/score/:cageNumber" element={<ScorePage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should show loading initially
    expect(screen.getByText('Loading scoring page...')).toBeInTheDocument();
  });

  it('should handle invalid cage numbers', async () => {
    render(
      <MemoryRouter initialEntries={['/score/invalid']}>
        <Routes>
          <Route path="/score/:cageNumber" element={<ScorePage />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('❌ Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid cage number provided.')).toBeInTheDocument();
    });
  });

  it('should have proper route structure', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/score/5']}>
        <Routes>
          <Route path="/score/:cageNumber" element={<ScorePage />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(container.firstChild).toBeTruthy();
  });
});
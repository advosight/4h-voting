import React from 'react';
import { render, screen } from '@testing-library/react';
import ScoreReports from '../ScoreReports';

// Mock AWS Amplify
jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    graphql: jest.fn()
  }))
}));

describe('ScoreReports Component', () => {
  const { generateClient } = require('aws-amplify/api');
  let mockGraphql: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGraphql = jest.fn();
    generateClient.mockReturnValue({ graphql: mockGraphql });
  });

  test('renders loading state initially', () => {
    render(<ScoreReports />);
    expect(screen.getByText('📊 Loading Score Reports...')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    mockGraphql.mockRejectedValue(new Error('API Error'));
    
    render(<ScoreReports />);
    
    // Wait for error state
    await screen.findByText('❌ Error Loading Reports');
    
    expect(screen.getByText('Failed to load scoring reports. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('renders filter section structure', () => {
    render(<ScoreReports />);
    
    // Check that filter elements exist (even in loading state)
    expect(screen.getByText('🔍 Filters')).toBeInTheDocument();
    expect(screen.getByText('Judge:')).toBeInTheDocument();
    expect(screen.getByText('Date From:')).toBeInTheDocument();
    expect(screen.getByText('Date To:')).toBeInTheDocument();
    expect(screen.getByText('Min Score:')).toBeInTheDocument();
    expect(screen.getByText('Max Score:')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
  });

  test('renders export button', () => {
    render(<ScoreReports />);
    
    expect(screen.getByText('📥 Export CSV')).toBeInTheDocument();
  });

  test('renders reset filters button', () => {
    render(<ScoreReports />);
    
    expect(screen.getByText('🔄 Reset Filters')).toBeInTheDocument();
  });

  test('has proper form inputs with default values', () => {
    render(<ScoreReports />);
    
    // Check default filter values
    expect(screen.getByDisplayValue('All Judges')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Min score
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // Max score
    expect(screen.getByDisplayValue('All Scores')).toBeInTheDocument();
  });

  test('component structure includes main sections', () => {
    render(<ScoreReports />);
    
    // Check main component structure
    expect(screen.getByText(/📊 Score Reports/)).toBeInTheDocument();
    expect(screen.getByText('🔍 Filters')).toBeInTheDocument();
  });
});
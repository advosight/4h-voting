import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportsPage from '../ReportsPage';

// Mock the components
jest.mock('../../components/ScoreReports', () => {
  return function MockScoreReports() {
    return <div data-testid="cage-score-reports">Cage Score Reports Component</div>;
  };
});

jest.mock('../../components/ClassScoreReports', () => {
  return {
    ClassScoreReports: function MockClassScoreReports() {
      return <div data-testid="class-score-reports">Class Score Reports Component</div>;
    }
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ReportsPage Integration', () => {
  test('should render both cage and class scoring report tabs', () => {
    renderWithRouter(<ReportsPage />);
    
    // Check main title
    expect(screen.getByText('Scoring Reports')).toBeInTheDocument();
    
    // Check tab labels (using getAllByText since text appears in both tab and content)
    expect(screen.getAllByText('Cage Scoring Reports')).toHaveLength(2);
    expect(screen.getAllByText('Type Class Scoring Reports')).toHaveLength(1);
  });

  test('should show cage scoring reports by default', () => {
    renderWithRouter(<ReportsPage />);
    
    // Cage scoring should be visible by default
    expect(screen.getByTestId('cage-score-reports')).toBeInTheDocument();
    
    // Class scoring should not be visible initially
    expect(screen.queryByTestId('class-score-reports')).not.toBeInTheDocument();
  });

  test('should switch to class scoring reports when tab is clicked', () => {
    renderWithRouter(<ReportsPage />);
    
    // Click on class scoring tab
    const classTab = screen.getByText('Type Class Scoring Reports');
    fireEvent.click(classTab);
    
    // Now class scoring should be visible
    expect(screen.getByTestId('class-score-reports')).toBeInTheDocument();
    
    // Cage scoring should not be visible
    expect(screen.queryByTestId('cage-score-reports')).not.toBeInTheDocument();
  });

  test('should have proper visual separation between scoring types', () => {
    renderWithRouter(<ReportsPage />);
    
    // Check for cage scoring section
    const cageSection = screen.getByRole('tabpanel', { name: /cage scoring reports/i });
    expect(cageSection).toBeInTheDocument();
    
    // Switch to class scoring
    const classTab = screen.getByRole('tab', { name: /class scoring reports/i });
    fireEvent.click(classTab);
    
    // Check for class scoring section
    const classSection = screen.getByRole('tabpanel', { name: /class scoring reports/i });
    expect(classSection).toBeInTheDocument();
    
    // Verify different content is shown
    expect(screen.getByTestId('class-score-reports')).toBeInTheDocument();
  });

  test('should display appropriate descriptions for each scoring type', () => {
    renderWithRouter(<ReportsPage />);
    
    // Check cage scoring description
    expect(screen.getByText(/Traditional cage-based scoring reports/)).toBeInTheDocument();
    
    // Switch to class scoring
    const classTab = screen.getByText('Type Class Scoring Reports');
    fireEvent.click(classTab);
    
    // Check class scoring description
    expect(screen.getByText(/Professional class competition scoring reports/)).toBeInTheDocument();
  });

  test('should have role-based visibility indicators', () => {
    renderWithRouter(<ReportsPage />);
    
    // The page should indicate it's for scoring reports
    expect(screen.getByText(/View detailed scoring reports and audit history/)).toBeInTheDocument();
  });
});
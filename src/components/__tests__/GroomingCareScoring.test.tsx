import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroomingCareScoring } from '../GroomingCareScoring';

describe('GroomingCareScoring', () => {
  const defaultProps = {
    showingBellyCoatCleanliness: 2,
    coatCleanWellGroomed: 6,
    catHealthCare: 2,
    comments: 'Good grooming and care knowledge',
    total: 10,
    onScoreChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the grooming care scoring section', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    expect(screen.getByText('Grooming & Care')).toBeInTheDocument();
    expect(screen.getByText('10/14 points')).toBeInTheDocument();
  });

  it('displays all scoring fields with correct labels', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    expect(screen.getByLabelText('Showing belly/coat/cleanliness (1-3 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Coat clean & well groomed (1-8 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Cat health/care (1-3 pts)')).toBeInTheDocument();
  });

  it('displays current score values', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // showingBellyCoatCleanliness
    expect(screen.getByDisplayValue('6')).toBeInTheDocument(); // coatCleanWellGroomed
    expect(screen.getAllByDisplayValue('2')).toHaveLength(2); // showingBellyCoatCleanliness and catHealthCare
  });

  it('displays score ranges for each field', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    expect(screen.getAllByText('1-3 points')).toHaveLength(2); // 2 fields with 1-3 range
    expect(screen.getByText('1-8 points')).toBeInTheDocument(); // 1 field with 1-8 range
  });

  it('calls onScoreChange when belly/coat/cleanliness score changes', async () => {
    const user = userEvent.setup();
    render(<GroomingCareScoring {...defaultProps} />);
    
    const bellyInput = screen.getByLabelText('Showing belly/coat/cleanliness (1-3 pts)');
    await user.clear(bellyInput);
    await user.type(bellyInput, '3');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingBellyCoatCleanliness', 3);
  });

  it('calls onScoreChange when coat clean & well groomed score changes', async () => {
    const user = userEvent.setup();
    render(<GroomingCareScoring {...defaultProps} />);
    
    const coatInput = screen.getByLabelText('Coat clean & well groomed (1-8 pts)');
    await user.clear(coatInput);
    await user.type(coatInput, '8');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('coatCleanWellGroomed', 8);
  });

  it('calls onScoreChange when cat health/care score changes', async () => {
    const user = userEvent.setup();
    render(<GroomingCareScoring {...defaultProps} />);
    
    const healthCareInput = screen.getByLabelText('Cat health/care (1-3 pts)');
    await user.clear(healthCareInput);
    await user.type(healthCareInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('catHealthCare', 1);
  });

  it('displays comments textarea with current value', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('Good grooming and care knowledge');
  });

  it('calls onScoreChange when comments change', async () => {
    const user = userEvent.setup();
    render(<GroomingCareScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.clear(commentsTextarea);
    await user.type(commentsTextarea, 'Excellent grooming techniques demonstrated');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('groomingCareComments', 'Excellent grooming techniques demonstrated');
  });

  it('displays character count for comments', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    expect(screen.getByText('32/500 characters')).toBeInTheDocument();
  });

  it('has correct input constraints for score fields', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    // Check 1-3 point fields
    const threePointFields = [
      screen.getByLabelText('Showing belly/coat/cleanliness (1-3 pts)'),
      screen.getByLabelText('Cat health/care (1-3 pts)')
    ];
    
    threePointFields.forEach(input => {
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '3');
    });

    // Check 1-8 point field
    const eightPointField = screen.getByLabelText('Coat clean & well groomed (1-8 pts)');
    expect(eightPointField).toHaveAttribute('min', '1');
    expect(eightPointField).toHaveAttribute('max', '8');
  });

  it('handles maximum total score', () => {
    const maxScoreProps = {
      ...defaultProps,
      showingBellyCoatCleanliness: 3,
      coatCleanWellGroomed: 8,
      catHealthCare: 3,
      total: 14
    };
    
    render(<GroomingCareScoring {...maxScoreProps} />);
    
    expect(screen.getByText('14/14 points')).toBeInTheDocument();
  });

  it('handles minimum total score', () => {
    const minScoreProps = {
      ...defaultProps,
      showingBellyCoatCleanliness: 1,
      coatCleanWellGroomed: 1,
      catHealthCare: 1,
      total: 3
    };
    
    render(<GroomingCareScoring {...minScoreProps} />);
    
    expect(screen.getByText('3/14 points')).toBeInTheDocument();
  });

  it('enforces max length on comments textarea', () => {
    render(<GroomingCareScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveAttribute('maxLength', '500');
  });

  it('handles empty comments', () => {
    const propsWithEmptyComments = {
      ...defaultProps,
      comments: ''
    };
    
    render(<GroomingCareScoring {...propsWithEmptyComments} />);
    
    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('');
  });

  it('defaults to minimum value when invalid input is entered', async () => {
    const user = userEvent.setup();
    render(<GroomingCareScoring {...defaultProps} />);
    
    const bellyInput = screen.getByLabelText('Showing belly/coat/cleanliness (1-3 pts)');
    await user.clear(bellyInput);
    await user.type(bellyInput, '0'); // Invalid value
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingBellyCoatCleanliness', 1);
  });
});
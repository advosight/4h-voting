import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemonstrationScoring } from '../DemonstrationScoring';

describe('DemonstrationScoring', () => {
  const defaultProps = {
    showingHeadShape: 3,
    showingBodyType: 2,
    showingTail: 4,
    showingCoatTexture: 3,
    comments: 'Good demonstration skills',
    total: 12,
    onScoreChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the demonstration scoring section', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    expect(screen.getByText('Demonstration Skills')).toBeInTheDocument();
    expect(screen.getByText('12/16 points')).toBeInTheDocument();
  });

  it('displays all scoring fields with correct labels', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    expect(screen.getByLabelText('Showing head shape (1-4 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing body type (1-4 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing tail (1-4 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing coat texture (1-4 pts)')).toBeInTheDocument();
  });

  it('displays current score values', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // showingHeadShape
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // showingBodyType
    expect(screen.getByDisplayValue('4')).toBeInTheDocument(); // showingTail
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // showingCoatTexture (second 3)
  });

  it('displays score ranges for each field', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    const ranges = screen.getAllByText('1-4 points');
    expect(ranges).toHaveLength(4); // All four fields have 1-4 range
  });

  it('calls onScoreChange when head shape score changes', async () => {
    const user = userEvent.setup();
    render(<DemonstrationScoring {...defaultProps} />);
    
    const headShapeInput = screen.getByLabelText('Showing head shape (1-4 pts)');
    await user.clear(headShapeInput);
    await user.type(headShapeInput, '2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingHeadShape', 2);
  });

  it('calls onScoreChange when body type score changes', async () => {
    const user = userEvent.setup();
    render(<DemonstrationScoring {...defaultProps} />);
    
    const bodyTypeInput = screen.getByLabelText('Showing body type (1-4 pts)');
    await user.clear(bodyTypeInput);
    await user.type(bodyTypeInput, '4');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingBodyType', 4);
  });

  it('calls onScoreChange when tail score changes', async () => {
    const user = userEvent.setup();
    render(<DemonstrationScoring {...defaultProps} />);
    
    const tailInput = screen.getByLabelText('Showing tail (1-4 pts)');
    await user.clear(tailInput);
    await user.type(tailInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingTail', 1);
  });

  it('calls onScoreChange when coat texture score changes', async () => {
    const user = userEvent.setup();
    render(<DemonstrationScoring {...defaultProps} />);
    
    const coatTextureInput = screen.getByLabelText('Showing coat texture (1-4 pts)');
    await user.clear(coatTextureInput);
    await user.type(coatTextureInput, '2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingCoatTexture', 2);
  });

  it('displays comments textarea with current value', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('Good demonstration skills');
  });

  it('calls onScoreChange when comments change', async () => {
    const user = userEvent.setup();
    render(<DemonstrationScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.clear(commentsTextarea);
    await user.type(commentsTextarea, 'Excellent demonstration technique');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('demonstrationComments', 'Excellent demonstration technique');
  });

  it('displays character count for comments', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    expect(screen.getByText('25/500 characters')).toBeInTheDocument();
  });

  it('has correct input constraints for all score fields', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    const inputs = [
      screen.getByLabelText('Showing head shape (1-4 pts)'),
      screen.getByLabelText('Showing body type (1-4 pts)'),
      screen.getByLabelText('Showing tail (1-4 pts)'),
      screen.getByLabelText('Showing coat texture (1-4 pts)')
    ];
    
    inputs.forEach(input => {
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '4');
    });
  });

  it('handles maximum total score', () => {
    const maxScoreProps = {
      ...defaultProps,
      showingHeadShape: 4,
      showingBodyType: 4,
      showingTail: 4,
      showingCoatTexture: 4,
      total: 16
    };
    
    render(<DemonstrationScoring {...maxScoreProps} />);
    
    expect(screen.getByText('16/16 points')).toBeInTheDocument();
  });

  it('handles minimum total score', () => {
    const minScoreProps = {
      ...defaultProps,
      showingHeadShape: 1,
      showingBodyType: 1,
      showingTail: 1,
      showingCoatTexture: 1,
      total: 4
    };
    
    render(<DemonstrationScoring {...minScoreProps} />);
    
    expect(screen.getByText('4/16 points')).toBeInTheDocument();
  });

  it('enforces max length on comments textarea', () => {
    render(<DemonstrationScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveAttribute('maxLength', '500');
  });

  it('handles empty comments', () => {
    const propsWithEmptyComments = {
      ...defaultProps,
      comments: ''
    };
    
    render(<DemonstrationScoring {...propsWithEmptyComments} />);
    
    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('');
  });

  it('defaults to minimum value when invalid input is entered', async () => {
    const user = userEvent.setup();
    render(<DemonstrationScoring {...defaultProps} />);
    
    const headShapeInput = screen.getByLabelText('Showing head shape (1-4 pts)');
    await user.clear(headShapeInput);
    await user.type(headShapeInput, '0'); // Invalid value
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingHeadShape', 1);
  });
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceScoring } from '../AppearanceScoring';

describe('AppearanceScoring', () => {
  const defaultProps = {
    attire: 5,
    attentive: 3,
    courteous: 4,
    comments: 'Good appearance overall',
    total: 12,
    onScoreChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the appearance scoring section', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    expect(screen.getByText('Appearance & Demeanor')).toBeInTheDocument();
    expect(screen.getByText('12/20 points')).toBeInTheDocument();
  });

  it('displays all scoring fields with correct labels', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    expect(screen.getByLabelText('Neat, clean, appropriate attire (1-10 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Attentive (1-5 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Courteous (1-5 pts)')).toBeInTheDocument();
  });

  it('displays current score values', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // attire
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // attentive
    expect(screen.getByDisplayValue('4')).toBeInTheDocument(); // courteous
  });

  it('displays score ranges for each field', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    expect(screen.getByText('1-10 points')).toBeInTheDocument();
    expect(screen.getAllByText('1-5 points')).toHaveLength(2);
  });

  it('calls onScoreChange when attire score changes', async () => {
    const user = userEvent.setup();
    render(<AppearanceScoring {...defaultProps} />);
    
    const attireInput = screen.getByLabelText('Neat, clean, appropriate attire (1-10 pts)');
    await user.clear(attireInput);
    await user.type(attireInput, '8');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('attire', 8);
  });

  it('calls onScoreChange when attentive score changes', async () => {
    const user = userEvent.setup();
    render(<AppearanceScoring {...defaultProps} />);
    
    const attentiveInput = screen.getByLabelText('Attentive (1-5 pts)');
    await user.clear(attentiveInput);
    await user.type(attentiveInput, '2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('attentive', 2);
  });

  it('calls onScoreChange when courteous score changes', async () => {
    const user = userEvent.setup();
    render(<AppearanceScoring {...defaultProps} />);
    
    const courteousInput = screen.getByLabelText('Courteous (1-5 pts)');
    await user.clear(courteousInput);
    await user.type(courteousInput, '5');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('courteous', 5);
  });

  it('displays comments textarea with current value', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('Good appearance overall');
  });

  it('calls onScoreChange when comments change', async () => {
    const user = userEvent.setup();
    render(<AppearanceScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.clear(commentsTextarea);
    await user.type(commentsTextarea, 'Updated comments');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('appearanceComments', 'Updated comments');
  });

  it('displays character count for comments', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    expect(screen.getByText('23/500 characters')).toBeInTheDocument();
  });

  it('updates character count when comments change', async () => {
    const user = userEvent.setup();
    render(<AppearanceScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.clear(commentsTextarea);
    await user.type(commentsTextarea, 'Short');
    
    expect(screen.getByText('5/500 characters')).toBeInTheDocument();
  });

  it('enforces max length on comments textarea', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveAttribute('maxLength', '500');
  });

  it('has correct input constraints for score fields', () => {
    render(<AppearanceScoring {...defaultProps} />);
    
    const attireInput = screen.getByLabelText('Neat, clean, appropriate attire (1-10 pts)');
    expect(attireInput).toHaveAttribute('min', '1');
    expect(attireInput).toHaveAttribute('max', '10');
    
    const attentiveInput = screen.getByLabelText('Attentive (1-5 pts)');
    expect(attentiveInput).toHaveAttribute('min', '1');
    expect(attentiveInput).toHaveAttribute('max', '5');
    
    const courteousInput = screen.getByLabelText('Courteous (1-5 pts)');
    expect(courteousInput).toHaveAttribute('min', '1');
    expect(courteousInput).toHaveAttribute('max', '5');
  });

  it('handles empty comments', () => {
    const propsWithEmptyComments = {
      ...defaultProps,
      comments: ''
    };
    
    render(<AppearanceScoring {...propsWithEmptyComments} />);
    
    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('');
  });

  it('handles maximum total score', () => {
    const maxScoreProps = {
      ...defaultProps,
      attire: 10,
      attentive: 5,
      courteous: 5,
      total: 20
    };
    
    render(<AppearanceScoring {...maxScoreProps} />);
    
    expect(screen.getByText('20/20 points')).toBeInTheDocument();
  });

  it('handles minimum total score', () => {
    const minScoreProps = {
      ...defaultProps,
      attire: 1,
      attentive: 1,
      courteous: 1,
      total: 3
    };
    
    render(<AppearanceScoring {...minScoreProps} />);
    
    expect(screen.getByText('3/20 points')).toBeInTheDocument();
  });

  it('defaults to minimum value when invalid input is entered', async () => {
    const user = userEvent.setup();
    render(<AppearanceScoring {...defaultProps} />);
    
    const attireInput = screen.getByLabelText('Neat, clean, appropriate attire (1-10 pts)');
    await user.clear(attireInput);
    await user.type(attireInput, '0'); // Invalid value
    
    // The component should default to 1 when invalid input is parsed
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('attire', 1);
  });
});
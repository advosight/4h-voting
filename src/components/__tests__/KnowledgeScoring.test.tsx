import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowledgeScoring } from '../KnowledgeScoring';

describe('KnowledgeScoring', () => {
  const defaultProps = {
    generalKnowledge: 2,
    catBreedsShowing: 3,
    catAnatomy: 2,
    fourHKnowledge: 2,
    comments: 'Good knowledge base',
    total: 9,
    onScoreChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the knowledge scoring section', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
    expect(screen.getByText('9/12 points')).toBeInTheDocument();
  });

  it('displays all scoring fields with correct labels', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    expect(screen.getByLabelText('General Knowledge (1-3 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Cat Breeds & Showing (1-3 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Cat Anatomy (1-3 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('4-H Knowledge (1-3 pts)')).toBeInTheDocument();
  });

  it('displays current score values', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    const inputs = screen.getAllByDisplayValue('2');
    expect(inputs).toHaveLength(3); // generalKnowledge, catAnatomy, fourHKnowledge
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // catBreedsShowing
  });

  it('displays score ranges for each field', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    const ranges = screen.getAllByText('1-3 points');
    expect(ranges).toHaveLength(4); // All four fields have 1-3 range
  });

  it('calls onScoreChange when general knowledge score changes', async () => {
    const user = userEvent.setup();
    render(<KnowledgeScoring {...defaultProps} />);
    
    const generalInput = screen.getByLabelText('General Knowledge (1-3 pts)');
    await user.clear(generalInput);
    await user.type(generalInput, '3');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('generalKnowledge', 3);
  });

  it('calls onScoreChange when cat breeds showing score changes', async () => {
    const user = userEvent.setup();
    render(<KnowledgeScoring {...defaultProps} />);
    
    const breedsInput = screen.getByLabelText('Cat Breeds & Showing (1-3 pts)');
    await user.clear(breedsInput);
    await user.type(breedsInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('catBreedsShowing', 1);
  });

  it('calls onScoreChange when cat anatomy score changes', async () => {
    const user = userEvent.setup();
    render(<KnowledgeScoring {...defaultProps} />);
    
    const anatomyInput = screen.getByLabelText('Cat Anatomy (1-3 pts)');
    await user.clear(anatomyInput);
    await user.type(anatomyInput, '3');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('catAnatomy', 3);
  });

  it('calls onScoreChange when 4-H knowledge score changes', async () => {
    const user = userEvent.setup();
    render(<KnowledgeScoring {...defaultProps} />);
    
    const fourHInput = screen.getByLabelText('4-H Knowledge (1-3 pts)');
    await user.clear(fourHInput);
    await user.type(fourHInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('fourHKnowledge', 1);
  });

  it('displays comments textarea with current value', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('Good knowledge base');
  });

  it('calls onScoreChange when comments change', async () => {
    const user = userEvent.setup();
    render(<KnowledgeScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.clear(commentsTextarea);
    await user.type(commentsTextarea, 'Excellent understanding of 4-H principles');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('knowledgeComments', 'Excellent understanding of 4-H principles');
  });

  it('displays character count for comments', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    expect(screen.getByText('19/500 characters')).toBeInTheDocument();
  });

  it('has correct input constraints for all score fields', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    const inputs = [
      screen.getByLabelText('General Knowledge (1-3 pts)'),
      screen.getByLabelText('Cat Breeds & Showing (1-3 pts)'),
      screen.getByLabelText('Cat Anatomy (1-3 pts)'),
      screen.getByLabelText('4-H Knowledge (1-3 pts)')
    ];
    
    inputs.forEach(input => {
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '3');
    });
  });

  it('handles maximum total score', () => {
    const maxScoreProps = {
      ...defaultProps,
      generalKnowledge: 3,
      catBreedsShowing: 3,
      catAnatomy: 3,
      fourHKnowledge: 3,
      total: 12
    };
    
    render(<KnowledgeScoring {...maxScoreProps} />);
    
    expect(screen.getByText('12/12 points')).toBeInTheDocument();
  });

  it('handles minimum total score', () => {
    const minScoreProps = {
      ...defaultProps,
      generalKnowledge: 1,
      catBreedsShowing: 1,
      catAnatomy: 1,
      fourHKnowledge: 1,
      total: 4
    };
    
    render(<KnowledgeScoring {...minScoreProps} />);
    
    expect(screen.getByText('4/12 points')).toBeInTheDocument();
  });

  it('enforces max length on comments textarea', () => {
    render(<KnowledgeScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveAttribute('maxLength', '500');
  });
});
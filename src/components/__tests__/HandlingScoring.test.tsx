import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HandlingScoring } from '../HandlingScoring';

describe('HandlingScoring', () => {
  const defaultProps = {
    controlEquipment: 7,
    pickupCarrying: 3,
    comments: 'Good handling technique',
    total: 10,
    onScoreChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the handling scoring section', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    expect(screen.getByText('Handling & Control')).toBeInTheDocument();
    expect(screen.getByText('10/14 points')).toBeInTheDocument();
  });

  it('displays all scoring fields with correct labels', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    expect(screen.getByLabelText('Control, harness fits, leash on wrist (1-10 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Picking up & carrying of cat (1-4 pts)')).toBeInTheDocument();
  });

  it('displays current score values', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    expect(screen.getByDisplayValue('7')).toBeInTheDocument(); // controlEquipment
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // pickupCarrying
  });

  it('displays score ranges for each field', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    expect(screen.getByText('1-10 points')).toBeInTheDocument();
    expect(screen.getByText('1-4 points')).toBeInTheDocument();
  });

  it('calls onScoreChange when control equipment score changes', async () => {
    const user = userEvent.setup();
    render(<HandlingScoring {...defaultProps} />);
    
    const controlInput = screen.getByLabelText('Control, harness fits, leash on wrist (1-10 pts)');
    await user.click(controlInput);
    await user.keyboard('{Control>}a{/Control}9');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('controlEquipment', 9);
  });

  it('calls onScoreChange when pickup carrying score changes', async () => {
    const user = userEvent.setup();
    render(<HandlingScoring {...defaultProps} />);
    
    const pickupInput = screen.getByLabelText('Picking up & carrying of cat (1-4 pts)');
    await user.click(pickupInput);
    await user.keyboard('{Control>}a{/Control}2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('pickupCarrying', 2);
  });

  it('displays comments textarea with current value', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('Good handling technique');
  });

  it('calls onScoreChange when comments change', async () => {
    const user = userEvent.setup();
    render(<HandlingScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.click(commentsTextarea);
    await user.keyboard('{Control>}a{/Control}Needs improvement in control');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('handlingComments', 'Needs improvement in control');
  });

  it('displays character count for comments', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    expect(screen.getByText('23/500 characters')).toBeInTheDocument();
  });

  it('has correct input constraints for score fields', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    const controlInput = screen.getByLabelText('Control, harness fits, leash on wrist (1-10 pts)');
    expect(controlInput).toHaveAttribute('min', '1');
    expect(controlInput).toHaveAttribute('max', '10');
    
    const pickupInput = screen.getByLabelText('Picking up & carrying of cat (1-4 pts)');
    expect(pickupInput).toHaveAttribute('min', '1');
    expect(pickupInput).toHaveAttribute('max', '4');
  });

  it('handles maximum total score', () => {
    const maxScoreProps = {
      ...defaultProps,
      controlEquipment: 10,
      pickupCarrying: 4,
      total: 14
    };
    
    render(<HandlingScoring {...maxScoreProps} />);
    
    expect(screen.getByText('14/14 points')).toBeInTheDocument();
  });

  it('handles minimum total score', () => {
    const minScoreProps = {
      ...defaultProps,
      controlEquipment: 1,
      pickupCarrying: 1,
      total: 2
    };
    
    render(<HandlingScoring {...minScoreProps} />);
    
    expect(screen.getByText('2/14 points')).toBeInTheDocument();
  });

  it('enforces max length on comments textarea', () => {
    render(<HandlingScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveAttribute('maxLength', '500');
  });

  it('handles empty comments', () => {
    const propsWithEmptyComments = {
      ...defaultProps,
      comments: ''
    };
    
    render(<HandlingScoring {...propsWithEmptyComments} />);
    
    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('');
  });

  it('defaults to minimum value when invalid input is entered', async () => {
    const user = userEvent.setup();
    render(<HandlingScoring {...defaultProps} />);
    
    const controlInput = screen.getByLabelText('Control, harness fits, leash on wrist (1-10 pts)');
    await user.clear(controlInput);
    await user.type(controlInput, '0'); // Invalid value
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('controlEquipment', 1);
  });
});
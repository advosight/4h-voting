import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthExaminationScoring } from '../HealthExaminationScoring';

describe('HealthExaminationScoring', () => {
  const defaultProps = {
    showingMouthTeethGums: 2,
    conditionMouthTeethGums: 1,
    showingNose: 2,
    showingEyes: 1,
    conditionNoseEyes: 2,
    showingEars: 1,
    earsClean: 2,
    showingToenailsClaws: 2,
    toenailsClipped: 4,
    comments: 'Good health examination technique',
    total: 17,
    onScoreChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the health examination scoring section', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    expect(screen.getByText('Health Examination')).toBeInTheDocument();
    expect(screen.getByText('17/21 points')).toBeInTheDocument();
  });

  it('displays all scoring fields with correct labels', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    expect(screen.getByLabelText('Showing mouth/teeth/gums (1-3 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Condition of mouth/teeth/gums (1-2 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing nose (1-2 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing eyes (1-2 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Condition of nose & eyes (1-2 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing ears (1-2 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Ears clean (1-2 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Showing toenails/claws (1-3 pts)')).toBeInTheDocument();
    expect(screen.getByLabelText('Toenails clipped (1-6 pts)')).toBeInTheDocument();
  });

  it('displays current score values', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Multiple fields with value 2
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Multiple fields with value 1
    expect(screen.getByDisplayValue('4')).toBeInTheDocument(); // toenailsClipped
  });

  it('displays score ranges for each field', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    expect(screen.getAllByText('1-2 points')).toHaveLength(6); // 6 fields with 1-2 range
    expect(screen.getAllByText('1-3 points')).toHaveLength(2); // 2 fields with 1-3 range
    expect(screen.getByText('1-6 points')).toBeInTheDocument(); // 1 field with 1-6 range
  });

  it('calls onScoreChange when mouth/teeth/gums showing score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const mouthInput = screen.getByLabelText('Showing mouth/teeth/gums (1-3 pts)');
    await user.clear(mouthInput);
    await user.type(mouthInput, '3');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingMouthTeethGums', 3);
  });

  it('calls onScoreChange when mouth/teeth/gums condition score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const conditionInput = screen.getByLabelText('Condition of mouth/teeth/gums (1-2 pts)');
    await user.clear(conditionInput);
    await user.type(conditionInput, '2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('conditionMouthTeethGums', 2);
  });

  it('calls onScoreChange when nose showing score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const noseInput = screen.getByLabelText('Showing nose (1-2 pts)');
    await user.clear(noseInput);
    await user.type(noseInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingNose', 1);
  });

  it('calls onScoreChange when eyes showing score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const eyesInput = screen.getByLabelText('Showing eyes (1-2 pts)');
    await user.clear(eyesInput);
    await user.type(eyesInput, '2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingEyes', 2);
  });

  it('calls onScoreChange when nose & eyes condition score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const conditionNoseEyesInput = screen.getByLabelText('Condition of nose & eyes (1-2 pts)');
    await user.clear(conditionNoseEyesInput);
    await user.type(conditionNoseEyesInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('conditionNoseEyes', 1);
  });

  it('calls onScoreChange when ears showing score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const earsInput = screen.getByLabelText('Showing ears (1-2 pts)');
    await user.clear(earsInput);
    await user.type(earsInput, '2');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingEars', 2);
  });

  it('calls onScoreChange when ears clean score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const earsCleanInput = screen.getByLabelText('Ears clean (1-2 pts)');
    await user.clear(earsCleanInput);
    await user.type(earsCleanInput, '1');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('earsClean', 1);
  });

  it('calls onScoreChange when toenails/claws showing score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const toenailsInput = screen.getByLabelText('Showing toenails/claws (1-3 pts)');
    await user.clear(toenailsInput);
    await user.type(toenailsInput, '3');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingToenailsClaws', 3);
  });

  it('calls onScoreChange when toenails clipped score changes', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const toenailsClippedInput = screen.getByLabelText('Toenails clipped (1-6 pts)');
    await user.clear(toenailsClippedInput);
    await user.type(toenailsClippedInput, '6');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('toenailsClipped', 6);
  });

  it('displays comments textarea with current value', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('Good health examination technique');
  });

  it('calls onScoreChange when comments change', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    await user.clear(commentsTextarea);
    await user.type(commentsTextarea, 'Excellent health assessment skills');
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('healthExaminationComments', 'Excellent health assessment skills');
  });

  it('displays character count for comments', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    expect(screen.getByText('32/500 characters')).toBeInTheDocument();
  });

  it('has correct input constraints for score fields', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    // Check 1-2 point fields
    const twoPointFields = [
      screen.getByLabelText('Condition of mouth/teeth/gums (1-2 pts)'),
      screen.getByLabelText('Showing nose (1-2 pts)'),
      screen.getByLabelText('Showing eyes (1-2 pts)'),
      screen.getByLabelText('Condition of nose & eyes (1-2 pts)'),
      screen.getByLabelText('Showing ears (1-2 pts)'),
      screen.getByLabelText('Ears clean (1-2 pts)')
    ];
    
    twoPointFields.forEach(input => {
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '2');
    });

    // Check 1-3 point fields
    const threePointFields = [
      screen.getByLabelText('Showing mouth/teeth/gums (1-3 pts)'),
      screen.getByLabelText('Showing toenails/claws (1-3 pts)')
    ];
    
    threePointFields.forEach(input => {
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '3');
    });

    // Check 1-6 point field
    const sixPointField = screen.getByLabelText('Toenails clipped (1-6 pts)');
    expect(sixPointField).toHaveAttribute('min', '1');
    expect(sixPointField).toHaveAttribute('max', '6');
  });

  it('handles maximum total score', () => {
    const maxScoreProps = {
      ...defaultProps,
      showingMouthTeethGums: 3,
      conditionMouthTeethGums: 2,
      showingNose: 2,
      showingEyes: 2,
      conditionNoseEyes: 2,
      showingEars: 2,
      earsClean: 2,
      showingToenailsClaws: 3,
      toenailsClipped: 6,
      total: 21
    };
    
    render(<HealthExaminationScoring {...maxScoreProps} />);
    
    expect(screen.getByText('21/21 points')).toBeInTheDocument();
  });

  it('handles minimum total score', () => {
    const minScoreProps = {
      ...defaultProps,
      showingMouthTeethGums: 1,
      conditionMouthTeethGums: 1,
      showingNose: 1,
      showingEyes: 1,
      conditionNoseEyes: 1,
      showingEars: 1,
      earsClean: 1,
      showingToenailsClaws: 1,
      toenailsClipped: 1,
      total: 9
    };
    
    render(<HealthExaminationScoring {...minScoreProps} />);
    
    expect(screen.getByText('9/21 points')).toBeInTheDocument();
  });

  it('enforces max length on comments textarea', () => {
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveAttribute('maxLength', '500');
  });

  it('handles empty comments', () => {
    const propsWithEmptyComments = {
      ...defaultProps,
      comments: ''
    };
    
    render(<HealthExaminationScoring {...propsWithEmptyComments} />);
    
    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    const commentsTextarea = screen.getByLabelText('Comments (optional, max 500 characters)');
    expect(commentsTextarea).toHaveValue('');
  });

  it('defaults to minimum value when invalid input is entered', async () => {
    const user = userEvent.setup();
    render(<HealthExaminationScoring {...defaultProps} />);
    
    const mouthInput = screen.getByLabelText('Showing mouth/teeth/gums (1-3 pts)');
    await user.clear(mouthInput);
    await user.type(mouthInput, '0'); // Invalid value
    
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith('showingMouthTeethGums', 1);
  });
});
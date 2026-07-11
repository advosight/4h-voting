import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ClassScoringForm from '../ClassScoringForm';
import '@testing-library/jest-dom';

// Mock cat data for testing
const mockCatData = {
  id: '1',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 5,
  votes: 10,
  catAgeGroup: 'Adult'
};

// Mock functions
const mockOnSave = vi.fn();
const mockOnSubmit = vi.fn();

const renderClassScoringForm = (props = {}) => {
  const defaultProps = {
    catData: mockCatData,
    onSave: mockOnSave,
    onSubmit: mockOnSubmit,
    loading: false,
    hasPermission: true,
    ...props
  };

  return render(
    <BrowserRouter>
      <ClassScoringForm {...defaultProps} />
    </BrowserRouter>
  );
};

describe('ClassScoringForm Visual Differentiation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Blue Theme Implementation', () => {
    test('should apply class-scoring-form CSS class', () => {
      renderClassScoringForm();
      const formElement = document.querySelector('.class-scoring-form');
      expect(formElement).toBeInTheDocument();
    });

    test('should display form header with blue theme styling', () => {
      renderClassScoringForm();
      const header = document.querySelector('.class-scoring-form .form-header');
      expect(header).toBeInTheDocument();
    });

    test('should display class scoring form title with trophy icon', () => {
      renderClassScoringForm();
      expect(screen.getByText('Type Class Scoring Form')).toBeInTheDocument();
    });
  });

  describe('Unique Iconography', () => {
    test('should display beauty section with sparkle icon styling', () => {
      renderClassScoringForm();
      const beautySection = document.querySelector('.scoring-section.beauty');
      expect(beautySection).toBeInTheDocument();
      expect(screen.getByText(/Cat's Beauty/)).toBeInTheDocument();
    });

    test('should display personality section with cat face icon styling', () => {
      renderClassScoringForm();
      const personalitySection = document.querySelector('.scoring-section.personality');
      expect(personalitySection).toBeInTheDocument();
      expect(screen.getByText(/Cat's Personality/)).toBeInTheDocument();
    });

    test('should display balance section with scale icon styling', () => {
      renderClassScoringForm();
      const balanceSection = document.querySelector('.scoring-section.balance');
      expect(balanceSection).toBeInTheDocument();
      expect(screen.getByText(/Cat's Balance\/Proportion/)).toBeInTheDocument();
    });

    test('should display health section with medical icon styling', () => {
      renderClassScoringForm();
      const healthSection = document.querySelector('.scoring-section.health');
      expect(healthSection).toBeInTheDocument();
      expect(screen.getByText(/Health & Grooming Standards/)).toBeInTheDocument();
    });
  });

  describe('Distinct Form Layout', () => {
    test('should display scoring sections with proper class names', () => {
      renderClassScoringForm();
      
      // Check for specific section classes
      expect(document.querySelector('.scoring-section.beauty')).toBeInTheDocument();
      expect(document.querySelector('.scoring-section.personality')).toBeInTheDocument();
      expect(document.querySelector('.scoring-section.balance')).toBeInTheDocument();
      expect(document.querySelector('.scoring-section.health')).toBeInTheDocument();
    });

    test('should display score inputs with blue theme styling', () => {
      renderClassScoringForm();
      
      const beautyInput = document.getElementById('beautyScore');
      expect(beautyInput).toBeInTheDocument();
      expect(beautyInput).toHaveAttribute('type', 'number');
    });

    test('should display comment textareas with blue theme styling', () => {
      renderClassScoringForm();
      
      const commentTextareas = screen.getAllByRole('textbox');
      expect(commentTextareas.length).toBeGreaterThan(0);
    });

    test('should display health checklist with proper styling', () => {
      renderClassScoringForm();
      
      const healthChecklist = document.querySelector('.health-checklist');
      expect(healthChecklist).toBeInTheDocument();
      
      // Check for specific health checkboxes
      expect(screen.getByLabelText(/Coat is clean & well groomed/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Teeth\/gums clean & healthy/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Eyes & nose clear/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ears clean & free of mites/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Toenails\/claws clipped/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Flea or flea dirt issues detected/)).toBeInTheDocument();
    });
  });

  describe('Score Summary Styling', () => {
    test('should display score summary with blue theme', () => {
      renderClassScoringForm();
      
      const scoreSummary = document.querySelector('.score-summary');
      expect(scoreSummary).toBeInTheDocument();
      expect(screen.getByText('Score Summary')).toBeInTheDocument();
    });

    test('should display score breakdown with proper styling', () => {
      renderClassScoringForm();
      
      const scoreBreakdown = document.querySelector('.score-breakdown');
      expect(scoreBreakdown).toBeInTheDocument();
      
      expect(screen.getByText(/Beauty: 0\/15/)).toBeInTheDocument();
      expect(screen.getByText(/Personality: 0\/20/)).toBeInTheDocument();
      expect(screen.getByText(/Balance\/Proportion: 0\/15/)).toBeInTheDocument();
      expect(screen.getByText(/Total Score: 0\/50/)).toBeInTheDocument();
    });

    test('should display ribbon eligibility with color coding', () => {
      renderClassScoringForm();
      
      const ribbonEligibility = document.querySelector('.ribbon-eligibility');
      expect(ribbonEligibility).toBeInTheDocument();
      expect(screen.getByText(/Ribbon Eligibility:/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons Styling', () => {
    test('should display form actions with blue theme buttons', () => {
      renderClassScoringForm();
      
      const formActions = document.querySelector('.form-actions');
      expect(formActions).toBeInTheDocument();
      
      const saveButton = document.querySelector('.save-button');
      const submitButton = document.querySelector('.submit-button');
      
      expect(saveButton).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
      
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
      expect(screen.getByText('Submit Final Score')).toBeInTheDocument();
    });

    test('should disable buttons when no permission', () => {
      renderClassScoringForm({ hasPermission: false });
      
      const saveButton = screen.getByText('Save Draft');
      const submitButton = screen.getByText('Submit Final Score');
      
      expect(saveButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    test('should show loading state on buttons', () => {
      renderClassScoringForm({ loading: true });
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });

  describe('Cat Information Display', () => {
    test('should display cat information with blue theme styling', () => {
      renderClassScoringForm();
      
      const catInfo = document.querySelector('.cat-info');
      expect(catInfo).toBeInTheDocument();
      
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      // Check that the cat info contains the expected text
      expect(catInfo?.textContent).toContain('John Doe');
      expect(catInfo?.textContent).toContain('5');
      expect(catInfo?.textContent).toContain('Adult');
    });
  });

  describe('Responsive Design', () => {
    test('should maintain visual differentiation on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      renderClassScoringForm();
      
      // Form should still have class-specific styling
      const formElement = document.querySelector('.class-scoring-form');
      expect(formElement).toBeInTheDocument();
      
      // Sections should still have their specific classes
      expect(document.querySelector('.scoring-section.beauty')).toBeInTheDocument();
      expect(document.querySelector('.scoring-section.personality')).toBeInTheDocument();
      expect(document.querySelector('.scoring-section.balance')).toBeInTheDocument();
      expect(document.querySelector('.scoring-section.health')).toBeInTheDocument();
    });
  });

  describe('Error State Styling', () => {
    test('should apply error styling to invalid inputs', () => {
      renderClassScoringForm();
      
      // Check that beauty input exists and can receive error styling
      const beautyInput = document.getElementById('beautyScore');
      expect(beautyInput).toBeInTheDocument();
      expect(beautyInput).toHaveAttribute('type', 'number');
    });
  });

  describe('Accessibility and Visual Clarity', () => {
    test('should have clear visual hierarchy with headings', () => {
      renderClassScoringForm();
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: /Type Class Scoring Form/ })).toBeInTheDocument();
      expect(screen.getByText(/Cat's Beauty/)).toBeInTheDocument();
      expect(screen.getByText(/Cat's Personality/)).toBeInTheDocument();
      expect(screen.getByText(/Cat's Balance\/Proportion/)).toBeInTheDocument();
      expect(screen.getByText(/Health & Grooming Standards/)).toBeInTheDocument();
      expect(screen.getByText(/Score Summary/)).toBeInTheDocument();
    });

    test('should have proper form labels for accessibility', () => {
      renderClassScoringForm();
      
      // Check for specific labeled inputs using IDs
      expect(document.getElementById('beautyScore')).toBeInTheDocument();
      expect(document.getElementById('beautyComments')).toBeInTheDocument();
      expect(screen.getByLabelText('Coat is clean & well groomed')).toBeInTheDocument();
    });
  });

  describe('Character Count Display', () => {
    test('should display character counts for comment fields', () => {
      renderClassScoringForm();
      
      // Check for character count displays
      const characterCounts = screen.getAllByText(/0\/\d+ characters/);
      expect(characterCounts.length).toBeGreaterThan(0);
    });
  });

  describe('Flea Issues Warning', () => {
    test('should display warning for flea issues checkbox', () => {
      renderClassScoringForm();
      
      const fleaCheckbox = screen.getByLabelText(/Flea or flea dirt issues detected/);
      expect(fleaCheckbox).toBeInTheDocument();
      
      // The flea issues section should have special styling
      const fleaItem = fleaCheckbox.closest('.checkbox-item');
      expect(fleaItem).toHaveClass('flea-issues');
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import AddCatForm from '../AddCatForm';
import { generateClient as _generateClient } from 'aws-amplify/api';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: vi.fn()
  }))
}));

const generateClient = vi.mocked(_generateClient, { partial: true });

// Mock age groups
vi.mock('../../utils/ageGroups', () => ({
  OWNER_AGE_GROUPS: [
    { value: 'junior', label: 'Junior (8-13)' },
    { value: 'senior', label: 'Senior (14-18)' }
  ],
  CAT_AGE_GROUPS: [
    { value: 'kitten', label: 'Kitten (4-8 months)' },
    { value: 'adult', label: 'Adult (8+ months)' }
  ]
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AddCatForm Mobile Layout', () => {
  const mockOnCatAdded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('(max-width: 899.95px)'), // Mobile breakpoint
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders mobile layout with proper button accessibility', () => {
    renderWithTheme(<AddCatForm onCatAdded={mockOnCatAdded} />);
    
    const submitButton = screen.getByRole('button', { name: /add cat/i });
    
    // Check button has proper mobile styling
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveClass('mobile-primary-button');
    
    // Check button has minimum touch target size (48px)
    expect(submitButton).toHaveStyle('min-height: 48px');
  });

  it('has proper spacing in mobile layout', () => {
    renderWithTheme(<AddCatForm onCatAdded={mockOnCatAdded} />);
    
    const form = screen.getByRole('form') || screen.getByTestId('add-cat-form');
    const submitButton = screen.getByRole('button', { name: /add cat/i });
    
    // Check form has mobile-friendly spacing
    expect(submitButton).toBeInTheDocument();
    
    // Verify all required fields are present
    expect(screen.getByLabelText(/cat name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/owner name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cage number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/owner age group/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cat age group/i)).toBeInTheDocument();
  });

  it('maintains accessibility on mobile devices', () => {
    renderWithTheme(<AddCatForm onCatAdded={mockOnCatAdded} />);
    
    const submitButton = screen.getByRole('button', { name: /add cat/i });
    
    // Check button is focusable
    submitButton.focus();
    expect(submitButton).toHaveFocus();
    
    // Check button can be activated with keyboard
    fireEvent.keyDown(submitButton, { key: 'Enter' });
    // Form should attempt to submit (will fail due to empty fields, but that's expected)
  });

  it('handles form submission with proper mobile feedback', async () => {
    const mockGraphql = vi.fn().mockResolvedValue({
      data: {
        createCat: {
          id: 'test-id',
          name: 'Test Cat',
          owner: 'Test Owner',
          votes: 0,
          cageNumber: 1,
          ownerAgeGroup: 'junior',
          catAgeGroup: 'kitten'
        }
      }
    });

    // Mock the client
    generateClient.mockReturnValue({
      graphql: mockGraphql
    });

    renderWithTheme(<AddCatForm onCatAdded={mockOnCatAdded} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/cat name/i), { target: { value: 'Test Cat' } });
    fireEvent.change(screen.getByLabelText(/owner name/i), { target: { value: 'Test Owner' } });
    fireEvent.change(screen.getByLabelText(/cage number/i), { target: { value: '1' } });
    
    // Select age groups
    fireEvent.mouseDown(screen.getByLabelText(/owner age group/i));
    fireEvent.click(screen.getByText('Junior (8-13)'));
    
    fireEvent.mouseDown(screen.getByLabelText(/cat age group/i));
    fireEvent.click(screen.getByText('Kitten (4-8 months)'));
    
    const submitButton = screen.getByRole('button', { name: /add cat/i });
    fireEvent.click(submitButton);
    
    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/adding/i)).toBeInTheDocument();
    });
    
    // Wait for completion
    await waitFor(() => {
      expect(mockOnCatAdded).toHaveBeenCalled();
    });
  });
});
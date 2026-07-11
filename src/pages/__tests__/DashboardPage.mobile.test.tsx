import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import DashboardPage from '../DashboardPage';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn().mockResolvedValue({
      data: {
        listCats: { items: [] },
        listEmails: { items: [] },
        getVotingStatus: { isActive: true }
      }
    })
  })
}));

// Mock components
vi.mock('../../components/AddCatForm', () => {
  return {
    default: function MockAddCatForm({ onCatAdded }: { onCatAdded: () => void }) {
    return (
      <div data-testid="add-cat-form">
        <button onClick={onCatAdded}>Mock Add Cat</button>
      </div>
    );
    }
  };
});

vi.mock('../../components/CatCard', () => {
  return {
    default: function MockCatCard() {
    return <div data-testid="cat-card">Mock Cat Card</div>;
    }
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('DashboardPage Mobile Layout', () => {
  beforeEach(() => {
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

  it('renders FAB with correct positioning class on mobile', () => {
    renderWithProviders(<DashboardPage />);
    
    const fab = screen.getByRole('button', { name: /add cat/i });
    
    // Check FAB is present
    expect(fab).toBeInTheDocument();
    
    // Check FAB has the correct positioning class
    expect(fab).toHaveClass('mobile-fab-above-nav');
    
    // Check FAB has proper accessibility attributes
    expect(fab).toHaveAttribute('aria-label', 'add cat');
  });

  it('opens drawer when FAB is clicked', () => {
    renderWithProviders(<DashboardPage />);
    
    const fab = screen.getByRole('button', { name: /add cat/i });
    
    // Click the FAB
    fireEvent.click(fab);
    
    // Check drawer opens with form
    expect(screen.getByText('Add New Cat')).toBeInTheDocument();
    expect(screen.getByTestId('add-cat-form')).toBeInTheDocument();
  });

  it('positions FAB above bottom navigation', () => {
    renderWithProviders(<DashboardPage />);
    
    const fab = screen.getByRole('button', { name: /add cat/i });
    
    // Check FAB has fixed positioning
    expect(fab).toHaveStyle('position: fixed');
    
    // Check FAB has proper z-index to appear above other elements
    expect(fab).toHaveStyle('z-index: 1000');
  });

  it('closes drawer when close button is clicked', () => {
    renderWithProviders(<DashboardPage />);
    
    const fab = screen.getByRole('button', { name: /add cat/i });
    fireEvent.click(fab);
    
    // Find and click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Check drawer is closed
    expect(screen.queryByText('Add New Cat')).not.toBeInTheDocument();
  });

  it('has proper mobile widget layout', () => {
    renderWithProviders(<DashboardPage />);
    
    // Check mobile widgets are present
    expect(screen.getByText('Voting Control')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText(/Email Signups/)).toBeInTheDocument();
  });
});
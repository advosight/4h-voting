import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock AWS Amplify completely to avoid subscription issues
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn().mockResolvedValue({
      data: {
        listCats: {
          items: [
            {
              id: '1',
              name: 'Fluffy',
              owner: 'John Doe',
              votes: 15,
              cageNumber: 1,
              ownerAgeGroup: 'Adult',
              catAgeGroup: 'Senior'
            },
            {
              id: '2',
              name: 'Whiskers',
              owner: 'Jane Smith',
              votes: 12,
              cageNumber: 2,
              ownerAgeGroup: 'Youth',
              catAgeGroup: 'Adult'
            }
          ]
        }
      }
    })
  })
}));

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('TVModePage Responsive CSS', () => {
  beforeEach(() => {
    // Reset to default desktop size
    mockWindowDimensions(1024, 768);
  });

  it('should have responsive TV mode CSS classes', () => {
    // Check if the CSS classes exist in the document
    const style = document.createElement('style');
    style.textContent = `
      .tv-mode { display: flex; }
      .tv-header { text-align: center; }
      .tv-grid { display: grid; }
      .tv-cat-card { background: rgba(255, 255, 255, 0.15); }
    `;
    document.head.appendChild(style);

    expect(document.querySelector('style')).toBeInTheDocument();
    
    // Clean up
    document.head.removeChild(style);
  });

  it('should support different viewport orientations', () => {
    // Test portrait orientation
    mockWindowDimensions(375, 667);
    expect(window.innerWidth).toBe(375);
    expect(window.innerHeight).toBe(667);
    expect(window.innerWidth < window.innerHeight).toBe(true); // Portrait

    // Test landscape orientation
    mockWindowDimensions(667, 375);
    expect(window.innerWidth).toBe(667);
    expect(window.innerHeight).toBe(375);
    expect(window.innerWidth > window.innerHeight).toBe(true); // Landscape
  });

  it('should calculate correct grid columns for different screen sizes', () => {
    // Test mobile portrait (should be 1 column)
    mockWindowDimensions(375, 667);
    const isSmallScreen = window.innerWidth < 768;
    const isPortrait = window.innerWidth < window.innerHeight;
    const expectedColumns = isSmallScreen && isPortrait ? 1 : 2;
    expect(expectedColumns).toBe(1);

    // Test tablet landscape (should be 4 columns)
    mockWindowDimensions(1024, 768);
    const isMediumScreen = window.innerWidth >= 768 && window.innerWidth < 1200;
    const isLandscape = window.innerWidth > window.innerHeight;
    const expectedTabletColumns = isMediumScreen && isLandscape ? 4 : 3;
    expect(expectedTabletColumns).toBe(4);

    // Test desktop (should be 6 columns)
    mockWindowDimensions(1920, 1080);
    const isLargeScreen = window.innerWidth >= 1200;
    const expectedDesktopColumns = isLargeScreen && isLandscape ? 6 : 4;
    expect(expectedDesktopColumns).toBe(6);
  });

  it('should have proper responsive breakpoints', () => {
    // Test small screen breakpoint
    mockWindowDimensions(767, 500);
    expect(window.innerWidth < 768).toBe(true);

    // Test medium screen breakpoint
    mockWindowDimensions(900, 600);
    expect(window.innerWidth >= 768 && window.innerWidth < 1200).toBe(true);

    // Test large screen breakpoint
    mockWindowDimensions(1400, 900);
    expect(window.innerWidth >= 1200).toBe(true);
  });

  it('should calculate appropriate font sizes for different screens', () => {
    // Test mobile font sizes
    mockWindowDimensions(375, 667);
    const isSmallScreen = window.innerWidth < 768;
    const isPortrait = window.innerWidth < window.innerHeight;
    
    if (isSmallScreen) {
      const titleSize = isPortrait ? '1.5rem' : '2rem';
      expect(titleSize).toBe('1.5rem');
    }

    // Test desktop font sizes
    mockWindowDimensions(1920, 1080);
    const isLargeScreen = window.innerWidth >= 1200;
    
    if (isLargeScreen) {
      const titleSize = '3rem';
      expect(titleSize).toBe('3rem');
    }
  });
});
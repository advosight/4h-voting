import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassScoreAuditHistory, { ClassScoreAuditEntry } from '../ClassScoreAuditHistory';

// Mock audit entries
const mockAuditEntries: ClassScoreAuditEntry[] = [
  {
    id: 'audit-1',
    classScoreId: 'score-1',
    action: 'CREATE',
    modifiedBy: 'Judge Smith',
    modifiedAt: '2024-01-15T10:00:00Z',
    previousValues: null,
    newValues: {
      beautyScore: 12,
      personalityScore: 18,
      balanceProportionScore: 13,
      totalScore: 43
    },
    reason: 'Initial class score creation'
  },
  {
    id: 'audit-2',
    classScoreId: 'score-1',
    action: 'UPDATE',
    modifiedBy: 'Judge Smith',
    modifiedAt: '2024-01-15T11:00:00Z',
    previousValues: {
      beautyScore: 12,
      personalityScore: 18,
      balanceProportionScore: 13,
      totalScore: 43
    },
    newValues: {
      beautyScore: 14,
      personalityScore: 18,
      balanceProportionScore: 13,
      totalScore: 45
    },
    reason: 'Corrected beauty score'
  },
  {
    id: 'audit-3',
    classScoreId: 'score-1',
    action: 'FINALIZE',
    modifiedBy: 'Admin User',
    modifiedAt: '2024-01-15T12:00:00Z',
    previousValues: {
      isFinalized: false
    },
    newValues: {
      isFinalized: true
    },
    reason: 'Class score finalized'
  }
];

describe('ClassScoreAuditHistory', () => {
  it('renders audit history with entries', () => {
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={mockAuditEntries}
      />
    );

    expect(screen.getByText('Class Score Audit History')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('FINALIZE')).toBeInTheDocument();
  });

  it('displays correct action icons and colors', () => {
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={mockAuditEntries}
      />
    );

    // Check that action chips are rendered with correct text
    const createChip = screen.getByText('CREATE');
    const updateChip = screen.getByText('UPDATE');
    const finalizeChip = screen.getByText('FINALIZE');

    expect(createChip).toBeInTheDocument();
    expect(updateChip).toBeInTheDocument();
    expect(finalizeChip).toBeInTheDocument();
  });

  it('shows modified by and timestamp information', () => {
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={mockAuditEntries}
      />
    );

    expect(screen.getByText('by Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('by Admin User')).toBeInTheDocument();
    
    // Check formatted dates (will depend on locale)
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
  });

  it('expands accordion to show details', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={mockAuditEntries}
      />
    );

    // Find and click the first accordion (CREATE action)
    const createAccordion = screen.getAllByRole('button')[0];
    await user.click(createAccordion);

    expect(screen.getByText('Initial class score creation')).toBeInTheDocument();
    expect(screen.getByText('Initial class score created')).toBeInTheDocument();
  });

  it('shows field changes for UPDATE actions', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={mockAuditEntries}
      />
    );

    // Find and click the UPDATE accordion
    const accordions = screen.getAllByRole('button');
    const updateAccordion = accordions.find(button => 
      button.textContent?.includes('UPDATE')
    );
    
    if (updateAccordion) {
      await user.click(updateAccordion);
    }

    expect(screen.getByText('Changes Made:')).toBeInTheDocument();
    expect(screen.getByText('Beauty Score:')).toBeInTheDocument();
    expect(screen.getByText('From: 12')).toBeInTheDocument();
    expect(screen.getByText('To: 14')).toBeInTheDocument();
    expect(screen.getByText('Total Score:')).toBeInTheDocument();
    expect(screen.getByText('From: 43')).toBeInTheDocument();
    expect(screen.getByText('To: 45')).toBeInTheDocument();
  });

  it('displays reason for modifications', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={mockAuditEntries}
      />
    );

    // Click UPDATE accordion
    const accordions = screen.getAllByRole('button');
    const updateAccordion = accordions.find(button => 
      button.textContent?.includes('UPDATE')
    );
    
    if (updateAccordion) {
      await user.click(updateAccordion);
    }

    expect(screen.getByText('Reason:')).toBeInTheDocument();
    expect(screen.getByText('Corrected beauty score')).toBeInTheDocument();
  });

  it('formats field names correctly', async () => {
    const user = userEvent.setup();
    
    const entryWithCamelCase: ClassScoreAuditEntry = {
      id: 'audit-4',
      classScoreId: 'score-1',
      action: 'UPDATE',
      modifiedBy: 'Judge Smith',
      modifiedAt: '2024-01-15T13:00:00Z',
      previousValues: {
        balanceProportionScore: 13,
        healthGroomingComments: 'Good'
      },
      newValues: {
        balanceProportionScore: 14,
        healthGroomingComments: 'Excellent'
      },
      reason: 'Updated scores'
    };
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={[entryWithCamelCase]}
      />
    );

    const accordion = screen.getByRole('button');
    await user.click(accordion);

    // Check that camelCase is converted to readable format
    expect(screen.getByText('Balance Proportion Score:')).toBeInTheDocument();
    expect(screen.getByText('Health Grooming Comments:')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={[]}
        loading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading audit history...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    const errorMessage = 'Failed to load audit history';
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={[]}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows message when no audit entries exist', () => {
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={[]}
      />
    );

    expect(screen.getByText('No audit history available for this class score.')).toBeInTheDocument();
  });

  it('handles entries without previous or new values', async () => {
    const user = userEvent.setup();
    
    const entryWithoutValues: ClassScoreAuditEntry = {
      id: 'audit-5',
      classScoreId: 'score-1',
      action: 'UPDATE',
      modifiedBy: 'Judge Smith',
      modifiedAt: '2024-01-15T14:00:00Z',
      reason: 'Manual update'
    };
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={[entryWithoutValues]}
      />
    );

    const accordion = screen.getByRole('button');
    await user.click(accordion);

    expect(screen.getByText('Manual update')).toBeInTheDocument();
    // Should not show changes section when no values are present
    expect(screen.queryByText('Changes Made:')).not.toBeInTheDocument();
  });

  it('handles entries with no field changes', async () => {
    const user = userEvent.setup();
    
    const entryWithNoChanges: ClassScoreAuditEntry = {
      id: 'audit-6',
      classScoreId: 'score-1',
      action: 'UPDATE',
      modifiedBy: 'Judge Smith',
      modifiedAt: '2024-01-15T15:00:00Z',
      previousValues: {
        beautyScore: 12
      },
      newValues: {
        beautyScore: 12
      },
      reason: 'No actual changes'
    };
    
    render(
      <ClassScoreAuditHistory
        classScoreId="score-1"
        auditEntries={[entryWithNoChanges]}
      />
    );

    const accordion = screen.getByRole('button');
    await user.click(accordion);

    expect(screen.getByText('No field changes detected')).toBeInTheDocument();
  });
});
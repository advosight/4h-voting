import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { signUp, signIn } from 'aws-amplify/auth';
import AcceptInvitePage from '../AcceptInvitePage';
import type { MockedFunction } from 'vitest';

// generateClient() is called once at AcceptInvitePage's module scope, before any
// per-test mockReturnValue could be configured -- so the factory must return the
// client directly rather than via a vi.fn() configured later. vi.hoisted ensures
// mockGraphql exists before the (also hoisted) vi.mock factory below runs.
const { mockGraphql } = vi.hoisted(() => ({ mockGraphql: vi.fn() }));

vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({ graphql: mockGraphql }),
}));

vi.mock('aws-amplify/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
}));

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

const mockSignUp = signUp as MockedFunction<typeof signUp>;
const mockSignIn = signIn as MockedFunction<typeof signIn>;

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams({ email: 'judge@example.com', token: 'good-token' });
  });

  it('shows an error when the link is missing email/token', async () => {
    mockSearchParams = new URLSearchParams();

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText('Invitation not valid')).toBeInTheDocument();
    });
  });

  it('shows the invalid reason returned by validateInvitation', async () => {
    mockGraphql.mockResolvedValue({
      data: { validateInvitation: { valid: false, reason: 'This invitation has expired.' } },
    });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText('Invitation not valid')).toBeInTheDocument();
      expect(screen.getByText('This invitation has expired.')).toBeInTheDocument();
    });

    expect(mockGraphql).toHaveBeenCalledWith(expect.objectContaining({
      variables: { email: 'judge@example.com', token: 'good-token' },
      authMode: 'apiKey',
    }));
  });

  it('shows the signup form for a valid invitation and completes signup', async () => {
    mockGraphql.mockResolvedValue({
      data: { validateInvitation: { valid: true, email: 'judge@example.com', name: 'Jamie', role: 'judge' } },
    });
    mockSignUp.mockResolvedValue({ isSignUpComplete: true } as any);
    mockSignIn.mockResolvedValue({} as any);

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText("You're invited!")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'SuperSecret1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password/), { target: { value: 'SuperSecret1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({
        username: 'judge@example.com',
        password: 'SuperSecret1!',
        options: expect.objectContaining({
          clientMetadata: { inviteToken: 'good-token' },
        }),
      }));
      expect(mockSignIn).toHaveBeenCalledWith({ username: 'judge@example.com', password: 'SuperSecret1!' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows an error when passwords do not match', async () => {
    mockGraphql.mockResolvedValue({
      data: { validateInvitation: { valid: true, email: 'judge@example.com', name: 'Jamie', role: 'judge' } },
    });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText("You're invited!")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'SuperSecret1!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password/), { target: { value: 'Different1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

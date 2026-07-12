import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { generateClient } from 'aws-amplify/api';
import { signUp, signIn } from 'aws-amplify/auth';

const client = generateClient();

const VALIDATE_INVITATION = `
  query ValidateInvitation($email: String!, $token: String!) {
    validateInvitation(email: $email, token: $token) {
      valid
      email
      name
      role
      reason
    }
  }
`;

interface InvitationInfo {
  email: string;
  name?: string;
  role: string;
}

function AcceptInvitePage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkInvitation = useCallback(async () => {
    if (!email || !token) {
      setInvalidReason('This invitation link is missing information. Please use the link from your invite email.');
      setChecking(false);
      return;
    }

    try {
      const response = await client.graphql({
        query: VALIDATE_INVITATION,
        variables: { email, token },
        authMode: 'apiKey',
      });

      const result = response.data.validateInvitation;

      if (!result.valid) {
        setInvalidReason(result.reason || 'This invitation is no longer valid.');
      } else {
        setInvitation({ email: result.email, name: result.name, role: result.role });
        setName(result.name || '');
      }
    } catch (err) {
      console.error('Error validating invitation:', err);
      setInvalidReason('We could not verify this invitation. Please try again or ask an admin to resend it.');
    } finally {
      setChecking(false);
    }
  }, [email, token]);

  useEffect(() => {
    checkInvitation();
  }, [checkInvitation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);

      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, name: name.trim() },
          clientMetadata: { inviteToken: token },
        },
      });

      await signIn({ username: email, password });

      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (invalidReason) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 480, width: '100%' }}>
          <Typography variant="h5" gutterBottom>Invitation not valid</Typography>
          <Alert severity="error" sx={{ mt: 2 }}>{invalidReason}</Alert>
        </Paper>
      </Box>
    );
  }

  const roleLabel = invitation?.role === 'admin' ? 'Admin' : 'Judge';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 480, width: '100%' }}>
        <Typography variant="h5" gutterBottom>You're invited!</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          You've been invited to join the 4H Cat Show as a <strong>{roleLabel}</strong>. Set up your account below to get started.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            value={email}
            disabled
            fullWidth
          />
          <TextField
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText="At least 8 characters, including uppercase, lowercase, a number, and a symbol."
          />
          <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />

          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Button type="submit" variant="contained" disabled={submitting} size="large">
            {submitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default AcceptInvitePage;

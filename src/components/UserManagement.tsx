import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { getUserRole } from '../utils/roleUtils';

const client = generateClient();

interface UserAccount {
  userId: string;
  email: string;
  name: string;
  judgeId: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
}

interface Invitation {
  email: string;
  name?: string;
  role: string;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
  status: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

interface InviteUserInput {
  email: string;
  name?: string;
  role: string;
  cageScoring?: boolean;
  classScoring?: boolean;
  fitShowScoring?: boolean;
}

const LIST_ACCOUNTS = `
  query ListAccounts {
    listAccounts {
      items {
        userId
        email
        name
        judgeId
        role
        createdAt
        isActive
        cageScoring
        classScoring
        fitShowScoring
      }
    }
  }
`;

const LIST_INVITATIONS = `
  query ListInvitations {
    listInvitations {
      items {
        email
        name
        role
        cageScoring
        classScoring
        fitShowScoring
        status
        invitedBy
        createdAt
        expiresAt
      }
    }
  }
`;

const INVITE_USER = `
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      email
      name
      role
      status
      createdAt
      expiresAt
    }
  }
`;

const RESEND_INVITATION = `
  mutation ResendInvitation($email: String!) {
    resendInvitation(email: $email) {
      email
      status
      expiresAt
    }
  }
`;

const REVOKE_INVITATION = `
  mutation RevokeInvitation($email: String!) {
    revokeInvitation(email: $email)
  }
`;

const UPDATE_USER_ROLE = `
  mutation UpdateUserRole($userId: ID!, $role: String!) {
    updateUserRole(userId: $userId, role: $role) {
      userId
      email
      role
      updatedAt
    }
  }
`;

const UPDATE_USER_PERMISSIONS = `
  mutation UpdateUserPermissions($userId: ID!, $cageScoring: Boolean!, $classScoring: Boolean!, $fitShowScoring: Boolean!) {
    updateUserPermissions(userId: $userId, cageScoring: $cageScoring, classScoring: $classScoring, fitShowScoring: $fitShowScoring) {
      userId
      cageScoring
      classScoring
      fitShowScoring
    }
  }
`;

const REVOKE_USER = `
  mutation RevokeUser($userId: ID!) {
    revokeUser(userId: $userId)
  }
`;

const REACTIVATE_USER = `
  mutation ReactivateUser($userId: ID!) {
    reactivateUser(userId: $userId)
  }
`;

const roleColor = (role: string): 'primary' | 'default' => (role === 'admin' ? 'primary' : 'default');

function UserManagement(): JSX.Element {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const [formData, setFormData] = useState<InviteUserInput>({
    email: '',
    name: '',
    role: 'judge',
    cageScoring: true,
    classScoring: true,
    fitShowScoring: true,
  });

  // Check user role on component mount
  useEffect(() => {
    const checkRole = async () => {
      const roleInfo = await getUserRole();
      setUserRole(roleInfo?.role || null);
    };
    checkRole();
  }, []);

  // Load users and pending invitations on component mount
  useEffect(() => {
    if (userRole === 'admin') {
      loadUsers();
      loadInvitations();
    }
  }, [userRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await client.graphql({
        query: LIST_ACCOUNTS,
      });

      setUsers(response.data.listAccounts.items);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await client.graphql({
        query: LIST_INVITATIONS,
      });

      setInvitations(response.data.listInvitations.items);
    } catch (err) {
      console.error('Error loading invitations:', err);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      setError('Please enter an email address');
      return;
    }

    try {
      setInviteLoading(true);
      setError(null);

      const input: InviteUserInput = {
        email: formData.email,
        name: formData.name || undefined,
        role: formData.role,
        ...(formData.role === 'judge' && {
          cageScoring: formData.cageScoring,
          classScoring: formData.classScoring,
          fitShowScoring: formData.fitShowScoring,
        }),
      };

      await client.graphql({
        query: INVITE_USER,
        variables: { input },
      });

      setFormData({
        email: '',
        name: '',
        role: 'judge',
        cageScoring: true,
        classScoring: true,
        fitShowScoring: true,
      });
      setShowInviteForm(false);
      await loadInvitations();

    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvitation = async (email: string) => {
    try {
      setError(null);
      await client.graphql({
        query: RESEND_INVITATION,
        variables: { email },
      });
      await loadInvitations();
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleRevokeInvitation = async (email: string) => {
    try {
      setError(null);
      await client.graphql({
        query: REVOKE_INVITATION,
        variables: { email },
      });
      await loadInvitations();
    } catch (err) {
      console.error('Error revoking invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setError(null);

      await client.graphql({
        query: UPDATE_USER_ROLE,
        variables: { userId, role: newRole },
      });

      setSelectedUser((prev) => (prev && prev.userId === userId ? { ...prev, role: newRole } : prev));
      await loadUsers();
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const handlePermissionChange = async (
    userId: string,
    permission: 'cageScoring' | 'classScoring' | 'fitShowScoring',
    checked: boolean
  ) => {
    if (!selectedUser) return;

    const updated = {
      cageScoring: selectedUser.cageScoring,
      classScoring: selectedUser.classScoring,
      fitShowScoring: selectedUser.fitShowScoring,
      [permission]: checked,
    };

    try {
      setError(null);

      await client.graphql({
        query: UPDATE_USER_PERMISSIONS,
        variables: { userId, ...updated },
      });

      setSelectedUser((prev) => (prev && prev.userId === userId ? { ...prev, ...updated } : prev));
      await loadUsers();
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    }
  };

  const handleRevokeUser = async (userId: string) => {
    if (!window.confirm('Revoke this user? They will no longer be able to sign in until reactivated.')) {
      return;
    }

    try {
      setError(null);

      await client.graphql({
        query: REVOKE_USER,
        variables: { userId },
      });

      setSelectedUser((prev) => (prev && prev.userId === userId ? { ...prev, isActive: false } : prev));
      await loadUsers();
    } catch (err) {
      console.error('Error revoking user:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke user');
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      setError(null);

      await client.graphql({
        query: REACTIVATE_USER,
        variables: { userId },
      });

      setSelectedUser((prev) => (prev && prev.userId === userId ? { ...prev, isActive: true } : prev));
      await loadUsers();
    } catch (err) {
      console.error('Error reactivating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to reactivate user');
    }
  };

  // Only show to admin users
  if (userRole !== 'admin') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">Access Denied</Typography>
        <Typography variant="body2" color="text.secondary">
          Administrator access required for user management.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ mb: 1 }} />
        <Typography variant="body2" color="text.secondary">Loading accounts...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">Judge & Admin Management</Typography>
        <Button
          variant="contained"
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          {showInviteForm ? 'Cancel' : 'Invite Judge/Admin'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {showInviteForm && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Invite a Judge or Admin</Typography>
          <Box component="form" onSubmit={handleInviteUser}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                fullWidth
                size="small"
              />
              <TextField
                label="Name (optional)"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                size="small"
              />
            </Box>
            <TextField
              select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              size="small"
              sx={{ mb: 2, minWidth: 200 }}
            >
              <MenuItem value="judge">Judge</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            {formData.role === 'judge' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Scoring Permissions
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.cageScoring}
                      onChange={(e) => setFormData({ ...formData, cageScoring: e.target.checked })}
                    />
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Cage Scoring</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.classScoring}
                      onChange={(e) => setFormData({ ...formData, classScoring: e.target.checked })}
                    />
                    <span style={{ color: '#1976d2', fontWeight: 'bold' }}>Class Scoring</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fitShowScoring}
                      onChange={(e) => setFormData({ ...formData, fitShowScoring: e.target.checked })}
                    />
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Fit & Show Scoring</span>
                  </label>
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained" color="success" disabled={inviteLoading}>
                {inviteLoading ? 'Sending Invite...' : 'Send Invite'}
              </Button>
              <Button type="button" variant="outlined" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {invitations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Pending Invitations</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Invited By</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.email}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{invite.role}</TableCell>
                    <TableCell>{invite.invitedBy}</TableCell>
                    <TableCell>{new Date(invite.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained" onClick={() => handleResendInvitation(invite.email)}>
                          Resend
                        </Button>
                        <Button size="small" variant="contained" color="error" onClick={() => handleRevokeInvitation(invite.email)}>
                          Revoke
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Typography variant="subtitle1" gutterBottom>Active Accounts</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.userId}
                hover
                onClick={() => setSelectedUser(user)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography variant="body2">{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                </TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>
                  <Chip label={user.role} size="small" color={roleColor(user.role)} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label={`Manage ${user.name}`}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            No active accounts yet. Invite a judge or admin to get started.
          </Box>
        )}
      </TableContainer>

      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedUser.name}
              <IconButton onClick={() => setSelectedUser(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{selectedUser.email}</Typography>
                </Box>

                <TextField
                  select
                  label="Role"
                  value={selectedUser.role}
                  onChange={(e) => handleRoleChange(selectedUser.userId, e.target.value)}
                  size="small"
                  sx={{ maxWidth: 240 }}
                >
                  <MenuItem value="judge">Judge</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="participant">Participant</MenuItem>
                </TextField>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Permissions
                  </Typography>
                  {selectedUser.role === 'admin' ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      All Permissions
                    </Typography>
                  ) : selectedUser.role === 'participant' ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Not applicable (participants don't score)
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedUser.cageScoring}
                            onChange={(e) => handlePermissionChange(selectedUser.userId, 'cageScoring', e.target.checked)}
                          />
                        }
                        label="Cage Scoring"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedUser.classScoring}
                            onChange={(e) => handlePermissionChange(selectedUser.userId, 'classScoring', e.target.checked)}
                          />
                        }
                        label="Class Scoring"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedUser.fitShowScoring}
                            onChange={(e) => handlePermissionChange(selectedUser.userId, 'fitShowScoring', e.target.checked)}
                          />
                        }
                        label="Fit & Show Scoring"
                      />
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box>
                      <Chip
                        label={selectedUser.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={selectedUser.isActive ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleDateString()}</Typography>
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
              {selectedUser.isActive ? (
                <Button color="error" onClick={() => handleRevokeUser(selectedUser.userId)}>
                  Revoke Access
                </Button>
              ) : (
                <Button color="success" onClick={() => handleReactivateUser(selectedUser.userId)}>
                  Reactivate
                </Button>
              )}
              <Button onClick={() => setSelectedUser(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default UserManagement;

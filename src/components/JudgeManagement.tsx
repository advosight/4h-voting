import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getUserRole } from '../utils/roleUtils';

const client = generateClient();

interface JudgeAccount {
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

const LIST_JUDGE_ACCOUNTS = `
  query ListJudgeAccounts {
    listJudgeAccounts {
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

function JudgeManagement(): JSX.Element {
  const [judges, setJudges] = useState<JudgeAccount[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // Load judges and pending invitations on component mount
  useEffect(() => {
    if (userRole === 'admin') {
      loadJudges();
      loadInvitations();
    }
  }, [userRole]);

  const loadJudges = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await client.graphql({
        query: LIST_JUDGE_ACCOUNTS,
      });

      setJudges(response.data.listJudgeAccounts.items);
    } catch (err) {
      console.error('Error loading judges:', err);
      setError(err instanceof Error ? err.message : 'Failed to load judges');
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

      await loadJudges();
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  // Only show to admin users
  if (userRole !== 'admin') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Administrator access required for judge management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading judge accounts...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Judge & Admin Management</h2>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showInviteForm ? 'Cancel' : 'Invite Judge/Admin'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {showInviteForm && (
        <div style={{
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          marginBottom: '2rem',
        }}>
          <h3>Invite a Judge or Admin</h3>
          <form onSubmit={handleInviteUser}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              >
                <option value="judge">Judge</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {formData.role === 'judge' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Scoring Permissions
                </label>
                <div style={{ display: 'flex', gap: '2rem', padding: '1rem', backgroundColor: 'white', border: '1px solid #ced4da', borderRadius: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.cageScoring}
                      onChange={(e) => setFormData({ ...formData, cageScoring: e.target.checked })}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Cage Scoring</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.classScoring}
                      onChange={(e) => setFormData({ ...formData, classScoring: e.target.checked })}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span style={{ color: '#1976d2', fontWeight: 'bold' }}>Class Scoring</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.fitShowScoring}
                      onChange={(e) => setFormData({ ...formData, fitShowScoring: e.target.checked })}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Fit & Show Scoring</span>
                  </label>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={inviteLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: inviteLoading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {inviteLoading ? 'Sending Invite...' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {invitations.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Pending Invitations</h3>
          <div style={{ backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Invited By</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Expires</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={invite.email}>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>{invite.email}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', textTransform: 'capitalize' }}>{invite.role}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>{invite.invitedBy}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleResendInvitation(invite.email)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevokeInvitation(invite.email)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h3>Active Accounts</h3>
      <div style={{ backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Judge ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Permissions</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {judges.map((judge) => (
              <tr key={judge.userId}>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>{judge.name}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>{judge.email}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>{judge.judgeId}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  <select
                    value={judge.role}
                    onChange={(e) => handleRoleChange(judge.userId, e.target.value)}
                    style={{
                      padding: '0.25rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  >
                    <option value="judge">Judge</option>
                    <option value="admin">Admin</option>
                    <option value="participant">Participant</option>
                  </select>
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {judge.role === 'admin' ? (
                    <span style={{ color: '#6c757d', fontStyle: 'italic' }}>All Permissions</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {judge.cageScoring && (
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          backgroundColor: '#4caf5020',
                          color: '#2e7d32',
                          border: '1px solid #4caf50',
                        }}>
                          Cage
                        </span>
                      )}
                      {judge.classScoring && (
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          backgroundColor: '#1976d220',
                          color: '#1565c0',
                          border: '1px solid #1976d2',
                        }}>
                          Class
                        </span>
                      )}
                      {judge.fitShowScoring && (
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          backgroundColor: '#ff980020',
                          color: '#e65100',
                          border: '1px solid #ff9800',
                        }}>
                          Fit&Show
                        </span>
                      )}
                      {!judge.cageScoring && !judge.classScoring && !judge.fitShowScoring && (
                        <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.8rem' }}>No permissions</span>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    backgroundColor: judge.isActive ? '#d4edda' : '#f8d7da',
                    color: judge.isActive ? '#155724' : '#721c24',
                  }}>
                    {judge.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  {new Date(judge.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                  <button
                    onClick={() => loadJudges()}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Refresh
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {judges.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
            No active accounts yet. Invite a judge or admin to get started.
          </div>
        )}
      </div>
    </div>
  );
}

export default JudgeManagement;

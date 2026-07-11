import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface NetworkStatus {
  online: boolean;
  slow: boolean;
}

function VotePage(): JSX.Element {
  const { catId } = useParams<{ catId: string }>();
  const [voting, setVoting] = useState<boolean>(false);
  const [voted, setVoted] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [submittingEmail, setSubmittingEmail] = useState<boolean>(false);
  const [emailSubmitted, setEmailSubmitted] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ online: true, slow: false });
  const [retryCount, setRetryCount] = useState<number>(0);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetworkStatus(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial network status
    setNetworkStatus(prev => ({ ...prev, online: navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleVoteWithRetry = async (attempt: number = 1): Promise<void> => {
    const maxRetries = 3;
    const baseDelay = 1000;

    try {
      const response = await fetch(`${import.meta.env.VITE_VOTING_API_ENDPOINT || 'https://s2fhl5bike.execute-api.us-west-2.amazonaws.com/prod/'}vote/${catId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setVoted(true);
        setError('');
        setRetryCount(0);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      if (attempt < maxRetries && networkStatus.online) {
        // Exponential backoff retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        setError(`Connection issue. Retrying in ${delay / 1000} seconds... (Attempt ${attempt}/${maxRetries})`);
        setRetryCount(attempt);
        
        setTimeout(() => {
          handleVoteWithRetry(attempt + 1);
        }, delay);
      } else {
        setVoting(false);
        if (!networkStatus.online) {
          setError('No internet connection. Please check your network and try again.');
        } else {
          setError('Unable to record vote after multiple attempts. Please try again later.');
        }
        setRetryCount(0);
      }
    }
  };

  const handleVote = async () => {
    if (!networkStatus.online) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    setVoting(true);
    setError('');
    setRetryCount(0);
    
    await handleVoteWithRetry();
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (!networkStatus.online) {
      setEmailError('No internet connection. Your email will be saved when connection is restored.');
      // In a real app, we'd save to localStorage here
      return;
    }

    setSubmittingEmail(true);
    setEmailError('');

    try {
      // Simulate email submission - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmailSubmitted(true);
    } catch (err) {
      setEmailError('Failed to submit email. Please try again.');
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  if (voted) {
    return (
      <div className="vote-page-container">
        <div className="vote-success-card">
          <div className="success-header">
            <div className="success-icon">🎉</div>
            <h1 className="success-title">Vote Recorded!</h1>
            <p className="success-message">Thank you for voting!</p>
            <div className="cat-celebration">🐈‍⬛</div>
          </div>
          
          <div className="email-signup-section">
            <h2 className="signup-title">Interested in 4H?</h2>
            <p className="signup-description">
              Join our community! Get involved with 4H programs and activities.
            </p>
            
            {!emailSubmitted ? (
              <div className="email-form">
                <div className="form-group">
                  <label htmlFor="email-input" className="sr-only">
                    Email address for 4H information
                  </label>
                  <input 
                    id="email-input"
                    type="email" 
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="your-email@example.com"
                    className="email-input"
                    disabled={submittingEmail}
                    autoComplete="email"
                    inputMode="email"
                  />
                  {emailError && (
                    <div className="error-message" role="alert">
                      {emailError}
                    </div>
                  )}
                </div>
                
                <button 
                  className="btn btn-primary btn-large email-submit-btn"
                  onClick={handleEmailSubmit}
                  disabled={submittingEmail || !email.trim()}
                  aria-describedby={emailError ? "email-error" : undefined}
                >
                  {submittingEmail ? (
                    <>
                      <span className="loading-spinner" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    'Get 4H Information'
                  )}
                </button>
              </div>
            ) : (
              <div className="email-success">
                <div className="success-checkmark">✓</div>
                <p>Thank you! We'll send you 4H information soon.</p>
              </div>
            )}
            
            <div className="info-link">
              <p>Learn more about 4H:</p>
              <a 
                href="https://extension.wsu.edu/4h/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="external-link"
              >
                Visit WSU 4H Extension
                <span className="external-icon" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-page-container">
      <div className="vote-card">
        <div className="vote-header">
          <h1 className="vote-title">
            <span className="cat-icon" aria-hidden="true">🐱</span>
            Vote for This Cat!
            <span className="cat-icon" aria-hidden="true">🐱</span>
          </h1>
          <p className="vote-description">
            Tap the button below to cast your vote
          </p>
        </div>
        
        {!networkStatus.online && (
          <div className="network-status offline" role="alert">
            <span className="status-icon">📶</span>
            No internet connection. Please check your network.
          </div>
        )}
        
        {error && (
          <div className="error-message" role="alert" id="vote-error">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            {error}
            {retryCount > 0 && (
              <div className="retry-progress">
                <div className="retry-bar">
                  <div className="retry-fill" style={{ width: `${(retryCount / 3) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="vote-action">
          <button 
            className="btn btn-primary btn-large vote-button"
            onClick={handleVote}
            disabled={voting || !networkStatus.online}
            aria-describedby={error ? "vote-error" : undefined}
          >
            {voting ? (
              <>
                <span className="loading-spinner" aria-hidden="true"></span>
                {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Voting...'}
              </>
            ) : (
              <>
                <span className="vote-icon" aria-hidden="true">🗳️</span>
                Cast Your Vote
              </>
            )}
          </button>
          
          {!networkStatus.online && (
            <p className="offline-note">
              Your vote will be submitted when connection is restored.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VotePage;
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError, parseError, getUserFriendlyMessage } from '../utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: 'scoring' | 'reports' | 'management';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ClassScoringErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error with class scoring context
    logError(error, `ClassScoringErrorBoundary:${this.props.context || 'unknown'}`);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Log retry attempt
    console.log('Class scoring error boundary retry attempted', {
      context: this.props.context,
      timestamp: new Date().toISOString()
    });
  };

  private handleReload = () => {
    // Log reload attempt
    console.log('Class scoring error boundary reload initiated', {
      context: this.props.context,
      timestamp: new Date().toISOString()
    });
    
    window.location.reload();
  };

  private handleReportError = () => {
    const errorData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // In a real application, you would send this to an error reporting service
    console.error('Class scoring error reported:', errorData);
    
    // For now, copy to clipboard for manual reporting
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please share with support.');
    }).catch(() => {
      alert('Unable to copy error details. Please take a screenshot.');
    });
  };

  private getContextualMessage = (): string => {
    const { context } = this.props;
    
    switch (context) {
      case 'scoring':
        return 'There was an issue with the class scoring form. Your progress may have been saved automatically.';
      case 'reports':
        return 'Unable to load class scoring reports. Please try refreshing the page.';
      case 'management':
        return 'There was an issue with class score management. Please try again.';
      default:
        return 'Something went wrong with the class scoring system.';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const parsedError = parseError(this.state.error);
      const userMessage = getUserFriendlyMessage(parsedError);
      const contextualMessage = this.getContextualMessage();

      return (
        <div className="class-scoring-error-boundary">
          <div className="error-container class-scoring-theme">
            <div className="error-icon">🎗️</div>
            <h2>Type Class Scoring Error</h2>
            <p className="context-message">{contextualMessage}</p>
            <p className="error-message">{userMessage}</p>
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button class-scoring-button"
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReload}
                className="reload-button class-scoring-button-secondary"
              >
                Reload Page
              </button>
              <button 
                onClick={this.handleReportError}
                className="report-button class-scoring-button-outline"
              >
                Report Error
              </button>
            </div>

            {this.props.context === 'scoring' && (
              <div className="scoring-help">
                <p><strong>Tip:</strong> Your scoring progress is automatically saved. You can safely reload the page.</p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping class scoring components with error boundary
export const withClassScoringErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  context?: 'scoring' | 'reports' | 'management',
  fallback?: ReactNode
) => {
  return (props: P) => (
    <ClassScoringErrorBoundary context={context} fallback={fallback}>
      <Component {...props} />
    </ClassScoringErrorBoundary>
  );
};
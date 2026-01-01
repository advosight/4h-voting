import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { register as registerSW } from './utils/serviceWorker';

// Suppress ResizeObserver loop completed with undelivered notifications error
// This patches the ResizeObserver to prevent the error from being thrown
const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends originalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    const wrappedCallback: ResizeObserverCallback = (entries, observer) => {
      window.requestAnimationFrame(() => {
        callback(entries, observer);
      });
    };
    super(wrappedCallback);
  }
};

// Also handle any remaining error events
const resizeObserverErrorHandler = (e: ErrorEvent) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
    return false;
  }
  return true;
};

window.addEventListener('error', resizeObserverErrorHandler);

// Suppress console errors for ResizeObserver
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Debug environment variables
console.log('Environment variables:', {
  userPoolId: process.env.REACT_APP_USER_POOL_ID,
  userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  region: process.env.REACT_APP_REGION,
  graphqlEndpoint: process.env.REACT_APP_GRAPHQL_ENDPOINT
});

// Configure Amplify
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-west-2_DzMg0jeNu',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '22jf76754spju4t791ekj3t89c',
      region: process.env.REACT_APP_REGION || 'us-west-2'
    }
  },
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_GRAPHQL_ENDPOINT || 'https://rk6mmqdxprfkrf4rub6rptmmsu.appsync-api.us-west-2.amazonaws.com/graphql',
      region: process.env.REACT_APP_REGION || 'us-west-2',
      defaultAuthMode: 'userPool' as const
    }
  }
};

Amplify.configure(amplifyConfig);
console.log('Amplify configured with:', amplifyConfig);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <App />
  </BrowserRouter>
);

// Service Worker disabled to prevent caching issues during development
// Uncomment the following lines to re-enable offline functionality in production:
/*
registerSW({
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully:', registration);
  },
  onUpdate: (registration) => {
    console.log('Service Worker updated:', registration);
    // Show update notification to user
    if (window.confirm('A new version is available. Reload to update?')) {
      window.location.reload();
    }
  },
  onOffline: () => {
    console.log('App is running in offline mode');
  },
  onOnline: () => {
    console.log('App is back online');
  }
});
*/

// Unregister any existing service workers to clear cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Service Worker unregistered:', registration);
    }
  });
}
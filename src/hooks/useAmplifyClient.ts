import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';

/**
 * Hook to safely get an Amplify GraphQL client
 * This ensures Amplify is configured before creating the client
 */
export function useAmplifyClient() {
  const [client, setClient] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const graphqlClient = generateClient();
      setClient(graphqlClient);
      setIsReady(true);
    } catch (error) {
      console.error('Error creating Amplify client:', error);
      setIsReady(false);
    }
  }, []);

  return { client, isReady };
}

/**
 * Synchronous function to get Amplify client
 * Use this in event handlers and async functions where hooks can't be used
 */
export function getAmplifyClient() {
  try {
    return generateClient();
  } catch (error) {
    console.error('Error creating Amplify client:', error);
    return null;
  }
}
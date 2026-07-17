import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const lambdaClient = new LambdaClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Vote handler invoked:', JSON.stringify(event, null, 2));

  // Handle email submission
  if (event.resource === '/email' && event.httpMethod === 'POST') {
    return await handleEmailSubmission(event);
  }

  // Handle thanks page
  if (event.resource === '/thanks' && event.httpMethod === 'GET') {
    return await handleThanksPage(event);
  }

  // Handle paused page
  if (event.resource === '/paused' && event.httpMethod === 'GET') {
    return await handlePausedPage(event);
  }

  // Handle voting
  const catId = event.pathParameters?.catId;

  if (!catId) {
    console.error('Missing catId in path parameters');
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST',
      },
      body: JSON.stringify({ error: 'Cat ID is required' }),
    };
  }

  try {
    // Check if voting is active
    const votingStatusResponse = await fetch(process.env.GRAPHQL_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.GRAPHQL_API_KEY || '',
      },
      body: JSON.stringify({
        query: `query GetVotingStatus { getVotingStatus { isActive } }`,
      }),
    });

    const votingStatusData = await votingStatusResponse.json() as any;
    console.log('Voting status response:', JSON.stringify(votingStatusData, null, 2));
    // Explicitly check if isActive is false (not just falsy)
    const isVotingActive = votingStatusData?.data?.getVotingStatus?.isActive === true;
    console.log('Is voting active:', isVotingActive);

    if (!isVotingActive) {
      console.log('Voting is paused, redirecting to paused page');
      return {
        statusCode: 302,
        headers: {
          // Root-relative to the current request's own stage/host -- never a
          // hardcoded cross-environment URL, so this can't ever redirect a
          // visitor on one account's API into another account's stack.
          'Location': `/${event.requestContext.stage}/paused`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST',
        },
        body: '',
      };
    }

    // Track device information
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown';
    const sourceIp = event.requestContext?.identity?.sourceIp || 'Unknown';
    const deviceInfo = { userAgent, sourceIp };

    console.log(`Processing vote for cat: ${catId}`, { deviceInfo });

    // Validate environment variables
    if (!process.env.TABLE_NAME) {
      throw new Error('TABLE_NAME environment variable not set');
    }
    if (!process.env.GRAPHQL_ENDPOINT) {
      throw new Error('GRAPHQL_ENDPOINT environment variable not set');
    }
    if (!process.env.GRAPHQL_API_KEY) {
      throw new Error('GRAPHQL_API_KEY environment variable not set');
    }

    // Get current cat data first
    console.log(`Fetching current data for cat: ${catId}`);
    const result = await docClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `CAT#${catId}`, SK: 'METADATA' },
    }));

    if (!result.Item) {
      console.error(`Cat not found: ${catId}`);
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST',
        },
        body: JSON.stringify({ error: 'Cat not found' }),
      };
    }

    console.log(`Recording a vote for cat: ${catId} (current votes: ${result.Item?.votes || 0})`);

    // Store vote with device info in DynamoDB
    const voteId = randomUUID();
    await docClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `VOTE#${voteId}`,
        SK: `CAT#${catId}`,
        catId: catId,
        timestamp: new Date().toISOString(),
        userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown',
        sourceIp: event.requestContext?.identity?.sourceIp || 'Unknown'
      },
    }));

    // Always use GraphQL mutation for vote updates. `votes: 1` here means "add one
    // vote" — the resolver performs an atomic increment rather than a set, so this
    // stays correct even when two votes for the same cat race each other.
    const mutation = `
      mutation UpdateVotes($id: ID!, $votes: Int!) {
        updateVotes(id: $id, votes: $votes) {
          id
          votes
        }
      }
    `;

    console.log('Sending GraphQL mutation:', {
      endpoint: process.env.GRAPHQL_ENDPOINT,
      variables: { id: catId, votes: 1 }
    });

    const response = await fetch(process.env.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.GRAPHQL_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: catId,
          votes: 1,
        },
      }),
    });

    const responseData = await response.json() as any;
    console.log('GraphQL response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error(`GraphQL request failed with status: ${response.status}`);
      throw new Error(`GraphQL request failed with status: ${response.status}`);
    }

    if (responseData.errors) {
      console.error('GraphQL mutation errors:', responseData.errors);
      throw new Error(`GraphQL mutation failed: ${JSON.stringify(responseData.errors)}`);
    }

    // Redirect to the thanks page to prevent duplicate votes on refresh
    return {
      statusCode: 302,
      headers: {
        'Location': `/${event.requestContext.stage}/thanks`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST',
      },
      body: '',
    };
  } catch (error) {
    console.error('Error recording vote:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST',
      },
      body: JSON.stringify({
        error: 'Failed to record vote',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function handlePausedPage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Paused page handler invoked', {
    userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown',
    sourceIp: event.requestContext?.identity?.sourceIp || 'Unknown'
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET',
    },
    body: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Voting Paused - Cat 4H</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #228B22 0%, #32CD32 50%, #90EE90 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            border: 3px solid #228B22;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          h1 { color: #006400; }
          .cat-emoji { font-size: 3rem; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⏸️ Voting is Currently Paused</h1>
          <div class="cat-emoji">🐈‍⬛</div>
          <p>Thank you for your interest in voting for the 4H Cat decorations.</p>
          <p>Voting has been temporarily paused by the organizers.</p>
          <p>Please check back later!</p>
          <p>To find out more about 4H, visit: 
            <a href="https://extension.wsu.edu/4h/" target="_blank" style="color: #228B22; font-weight: bold;">https://extension.wsu.edu/4h/</a>
          </p>
        </div>
      </body>
      </html>
    `,
  };
}

async function handleThanksPage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Thanks page handler invoked', {
    userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown',
    sourceIp: event.requestContext?.identity?.sourceIp || 'Unknown'
  });

  // Root-relative to this request's own stage -- the previous hardcoded
  // absolute URL here pointed at the dev account's API regardless of which
  // account actually served this page, silently sending every visitor's
  // email submission to the wrong AWS account.
  const emailEndpoint = `/${event.requestContext.stage}/email`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET',
    },
    body: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Vote Recorded - Cat 4H</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #228B22 0%, #32CD32 50%, #90EE90 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            border: 3px solid #228B22;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          h1 { color: #006400; }
          .cat-emoji { font-size: 3rem; margin: 20px 0; }
          .info-section {
            margin-top: 30px;
            text-align: left;
          }
          input {
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 2px solid #228B22;
            border-radius: 8px;
            font-size: 1rem;
          }
          .btn {
            background: #228B22;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            margin-bottom: 20px;
          }
          a { color: #228B22; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 Vote Recorded! 🎉</h1>
          <p>Thank you for voting!</p>
          <div class="cat-emoji">🐈‍⬛</div>
          
          <div class="info-section">
            <h3>Interested in 4H?</h3>
            <p>If you're interested in getting involved or signing up for 4H, please provide your email address:</p>
            <form onsubmit="submitEmail(event)">
              <input type="email" id="emailInput" placeholder="your-email@example.com" required />
              <button type="submit" class="btn">Submit Interest</button>
            </form>
            <div id="emailMessage" style="margin-top: 10px; display: none;"></div>
            <script>
              function submitEmail(event) {
                event.preventDefault();
                const email = document.getElementById('emailInput').value;
                const messageDiv = document.getElementById('emailMessage');
                
                fetch('${emailEndpoint}', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: email })
                })
                .then(response => response.json())
                .then(data => {
                  document.querySelector('form').style.display = 'none';
                  messageDiv.style.display = 'block';
                  messageDiv.style.color = 'green';
                  messageDiv.innerHTML = '<h4>Thank you!</h4><p>We\\'ll be in touch about 4H opportunities.</p>';
                })
                .catch(error => {
                  messageDiv.style.display = 'block';
                  messageDiv.style.color = 'red';
                  messageDiv.textContent = 'Error submitting email. Please try again.';
                });
              }
            </script>
            
            <p>To find out more about 4H, visit: 
              <a href="https://extension.wsu.edu/4h/" target="_blank">https://extension.wsu.edu/4h/</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

async function handleEmailSubmission(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Email submission handler invoked:', {
    userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown',
    sourceIp: event.requestContext?.identity?.sourceIp || 'Unknown',
    body: event.body
  });

  try {
    // Validate environment variables
    if (!process.env.GRAPHQL_ENDPOINT) {
      throw new Error('GRAPHQL_ENDPOINT environment variable not set');
    }
    if (!process.env.GRAPHQL_API_KEY) {
      throw new Error('GRAPHQL_API_KEY environment variable not set');
    }

    const body = JSON.parse(event.body || '{}');
    const email = body.email;

    if (!email) {
      console.error('Missing email in request body');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST',
        },
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    console.log(`Processing email submission: ${email}`);

    // Always use GraphQL mutation for email updates
    const mutation = `
      mutation AddEmail($email: String!, $context: AWSJSON) {
        addEmail(email: $email, context: $context) {
          id
          email
          timestamp
        }
      }
    `;

    console.log('Sending email GraphQL mutation');
    const response = await fetch(process.env.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.GRAPHQL_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          email: email,
          context: JSON.stringify({
            userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown',
            sourceIp: event.requestContext?.identity?.sourceIp || 'Unknown'
          })
        },
      }),
    });

    const responseData = await response.json() as any;
    console.log('Email GraphQL response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error(`Email GraphQL request failed with status: ${response.status}`);
      throw new Error(`Email GraphQL request failed with status: ${response.status}`);
    }

    if (responseData.errors) {
      console.error('Email GraphQL mutation errors:', responseData.errors);
      throw new Error(`Email GraphQL mutation failed: ${JSON.stringify(responseData.errors)}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ message: 'Email submitted successfully' }),
    };
  } catch (error) {
    console.error('Error submitting email:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({
        error: 'Failed to submit email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}
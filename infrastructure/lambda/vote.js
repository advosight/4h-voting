"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const crypto_1 = require("crypto");
const node_fetch_1 = __importDefault(require("node-fetch"));
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const lambdaClient = new client_lambda_1.LambdaClient({});
const handler = async (event) => {
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
        const votingStatusResponse = await (0, node_fetch_1.default)(process.env.GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.GRAPHQL_API_KEY || '',
            },
            body: JSON.stringify({
                query: `query GetVotingStatus { getVotingStatus { isActive } }`,
            }),
        });
        const votingStatusData = await votingStatusResponse.json();
        console.log('Voting status response:', JSON.stringify(votingStatusData, null, 2));
        // Explicitly check if isActive is false (not just falsy)
        const isVotingActive = votingStatusData?.data?.getVotingStatus?.isActive === true;
        console.log('Is voting active:', isVotingActive);
        if (!isVotingActive) {
            console.log('Voting is paused, redirecting to paused page');
            return {
                statusCode: 302,
                headers: {
                    'Location': `${process.env.API_URL || 'https://6ecl3xpx84.execute-api.us-west-2.amazonaws.com/prod/'}paused`,
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
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
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
        const newVotes = (result.Item?.votes || 0) + 1;
        console.log(`Updating votes from ${result.Item?.votes || 0} to ${newVotes}`);
        // Store vote with device info in DynamoDB
        const voteId = (0, crypto_1.randomUUID)();
        await docClient.send(new lib_dynamodb_1.PutCommand({
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
        // Always use GraphQL mutation for vote updates
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
            variables: { id: catId, votes: newVotes }
        });
        const response = await (0, node_fetch_1.default)(process.env.GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.GRAPHQL_API_KEY,
            },
            body: JSON.stringify({
                query: mutation,
                variables: {
                    id: catId,
                    votes: newVotes,
                },
            }),
        });
        const responseData = await response.json();
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
                'Location': `${process.env.API_URL || 'https://6ecl3xpx84.execute-api.us-west-2.amazonaws.com/prod/'}thanks`,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST',
            },
            body: '',
        };
    }
    catch (error) {
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
exports.handler = handler;
async function handlePausedPage(event) {
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
async function handleThanksPage(event) {
    console.log('Thanks page handler invoked', {
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
                
                fetch('https://6ecl3xpx84.execute-api.us-west-2.amazonaws.com/prod/email', {
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
async function handleEmailSubmission(event) {
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
        const response = await (0, node_fetch_1.default)(process.env.GRAPHQL_ENDPOINT, {
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
        const responseData = await response.json();
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
    }
    catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm90ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsOERBQTBEO0FBQzFELHdEQUFzRztBQUN0RywwREFBcUU7QUFDckUsbUNBQW9DO0FBQ3BDLDREQUErQjtBQUUvQixNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3RELE1BQU0sWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVuQyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXJFLDBCQUEwQjtJQUMxQixJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDL0QsT0FBTyxNQUFNLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxxQkFBcUI7SUFDckIsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssRUFBRSxDQUFDO1FBQy9ELE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQscUJBQXFCO0lBQ3JCLElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQUUsQ0FBQztRQUMvRCxPQUFPLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVE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UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCw2QkFBNkIsRUFBRSxHQUFHO2dCQUNsQyw4QkFBOEIsRUFBRSxjQUFjO2dCQUM5Qyw4QkFBOEIsRUFBRSxNQUFNO2FBQ3ZDO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRSx3QkFBd0I7Z0JBQy9CLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2xFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBVcGRhdGVDb21tYW5kLCBHZXRDb21tYW5kLCBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IExhbWJkYUNsaWVudCwgSW52b2tlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1sYW1iZGEnO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgZmV0Y2ggZnJvbSAnbm9kZS1mZXRjaCc7XG5cbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcbmNvbnN0IGxhbWJkYUNsaWVudCA9IG5ldyBMYW1iZGFDbGllbnQoe30pO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICBjb25zb2xlLmxvZygnVm90ZSBoYW5kbGVyIGludm9rZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcblxuICAvLyBIYW5kbGUgZW1haWwgc3VibWlzc2lvblxuICBpZiAoZXZlbnQucmVzb3VyY2UgPT09ICcvZW1haWwnICYmIGV2ZW50Lmh0dHBNZXRob2QgPT09ICdQT1NUJykge1xuICAgIHJldHVybiBhd2FpdCBoYW5kbGVFbWFpbFN1Ym1pc3Npb24oZXZlbnQpO1xuICB9XG5cbiAgLy8gSGFuZGxlIHRoYW5rcyBwYWdlXG4gIGlmIChldmVudC5yZXNvdXJjZSA9PT0gJy90aGFua3MnICYmIGV2ZW50Lmh0dHBNZXRob2QgPT09ICdHRVQnKSB7XG4gICAgcmV0dXJuIGF3YWl0IGhhbmRsZVRoYW5rc1BhZ2UoZXZlbnQpO1xuICB9XG5cbiAgLy8gSGFuZGxlIHBhdXNlZCBwYWdlXG4gIGlmIChldmVudC5yZXNvdXJjZSA9PT0gJy9wYXVzZWQnICYmIGV2ZW50Lmh0dHBNZXRob2QgPT09ICdHRVQnKSB7XG4gICAgcmV0dXJuIGF3YWl0IGhhbmRsZVBhdXNlZFBhZ2UoZXZlbnQpO1xuICB9XG5cbiAgLy8gSGFuZGxlIHZvdGluZ1xuICBjb25zdCBjYXRJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5jYXRJZDtcblxuICBpZiAoIWNhdElkKSB7XG4gICAgY29uc29sZS5lcnJvcignTWlzc2luZyBjYXRJZCBpbiBwYXRoIHBhcmFtZXRlcnMnKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUnLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIFBPU1QnLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdDYXQgSUQgaXMgcmVxdWlyZWQnIH0pLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIC8vIENoZWNrIGlmIHZvdGluZyBpcyBhY3RpdmVcbiAgICBjb25zdCB2b3RpbmdTdGF0dXNSZXNwb25zZSA9IGF3YWl0IGZldGNoKHByb2Nlc3MuZW52LkdSQVBIUUxfRU5EUE9JTlQhLCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ3gtYXBpLWtleSc6IHByb2Nlc3MuZW52LkdSQVBIUUxfQVBJX0tFWSB8fCAnJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHF1ZXJ5OiBgcXVlcnkgR2V0Vm90aW5nU3RhdHVzIHsgZ2V0Vm90aW5nU3RhdHVzIHsgaXNBY3RpdmUgfSB9YCxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgdm90aW5nU3RhdHVzRGF0YSA9IGF3YWl0IHZvdGluZ1N0YXR1c1Jlc3BvbnNlLmpzb24oKTtcbiAgICBjb25zb2xlLmxvZygnVm90aW5nIHN0YXR1cyByZXNwb25zZTonLCBKU09OLnN0cmluZ2lmeSh2b3RpbmdTdGF0dXNEYXRhLCBudWxsLCAyKSk7XG4gICAgLy8gRXhwbGljaXRseSBjaGVjayBpZiBpc0FjdGl2ZSBpcyBmYWxzZSAobm90IGp1c3QgZmFsc3kpXG4gICAgY29uc3QgaXNWb3RpbmdBY3RpdmUgPSB2b3RpbmdTdGF0dXNEYXRhPy5kYXRhPy5nZXRWb3RpbmdTdGF0dXM/LmlzQWN0aXZlID09PSB0cnVlO1xuICAgIGNvbnNvbGUubG9nKCdJcyB2b3RpbmcgYWN0aXZlOicsIGlzVm90aW5nQWN0aXZlKTtcblxuICAgIGlmICghaXNWb3RpbmdBY3RpdmUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdWb3RpbmcgaXMgcGF1c2VkLCByZWRpcmVjdGluZyB0byBwYXVzZWQgcGFnZScpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogMzAyLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0xvY2F0aW9uJzogYCR7cHJvY2Vzcy5lbnYuQVBJX1VSTCB8fCAnaHR0cHM6Ly82ZWNsM3hweDg0LmV4ZWN1dGUtYXBpLnVzLXdlc3QtMi5hbWF6b25hd3MuY29tL3Byb2QvJ31wYXVzZWRgLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIFBPU1QnLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiAnJyxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgZGV2aWNlIGluZm9ybWF0aW9uXG4gICAgY29uc3QgdXNlckFnZW50ID0gZXZlbnQuaGVhZGVyc1snVXNlci1BZ2VudCddIHx8IGV2ZW50LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSB8fCAnVW5rbm93bic7XG4gICAgY29uc3Qgc291cmNlSXAgPSBldmVudC5yZXF1ZXN0Q29udGV4dD8uaWRlbnRpdHk/LnNvdXJjZUlwIHx8ICdVbmtub3duJztcbiAgICBjb25zdCBkZXZpY2VJbmZvID0geyB1c2VyQWdlbnQsIHNvdXJjZUlwIH07XG5cbiAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyB2b3RlIGZvciBjYXQ6ICR7Y2F0SWR9YCwgeyBkZXZpY2VJbmZvIH0pO1xuXG4gICAgLy8gVmFsaWRhdGUgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgaWYgKCFwcm9jZXNzLmVudi5UQUJMRV9OQU1FKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RBQkxFX05BTUUgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xuICAgIH1cbiAgICBpZiAoIXByb2Nlc3MuZW52LkdSQVBIUUxfRU5EUE9JTlQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignR1JBUEhRTF9FTkRQT0lOVCBlbnZpcm9ubWVudCB2YXJpYWJsZSBub3Qgc2V0Jyk7XG4gICAgfVxuICAgIGlmICghcHJvY2Vzcy5lbnYuR1JBUEhRTF9BUElfS0VZKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dSQVBIUUxfQVBJX0tFWSBlbnZpcm9ubWVudCB2YXJpYWJsZSBub3Qgc2V0Jyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IGN1cnJlbnQgY2F0IGRhdGEgZmlyc3RcbiAgICBjb25zb2xlLmxvZyhgRmV0Y2hpbmcgY3VycmVudCBkYXRhIGZvciBjYXQ6ICR7Y2F0SWR9YCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5UQUJMRV9OQU1FLFxuICAgICAgS2V5OiB7IFBLOiBgQ0FUIyR7Y2F0SWR9YCwgU0s6ICdNRVRBREFUQScgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBDYXQgbm90IGZvdW5kOiAke2NhdElkfWApO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCcsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdDYXQgbm90IGZvdW5kJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgbmV3Vm90ZXMgPSAocmVzdWx0Lkl0ZW0/LnZvdGVzIHx8IDApICsgMTtcbiAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgdm90ZXMgZnJvbSAke3Jlc3VsdC5JdGVtPy52b3RlcyB8fCAwfSB0byAke25ld1ZvdGVzfWApO1xuXG4gICAgLy8gU3RvcmUgdm90ZSB3aXRoIGRldmljZSBpbmZvIGluIER5bmFtb0RCXG4gICAgY29uc3Qgdm90ZUlkID0gcmFuZG9tVVVJRCgpO1xuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBWT1RFIyR7dm90ZUlkfWAsXG4gICAgICAgIFNLOiBgQ0FUIyR7Y2F0SWR9YCxcbiAgICAgICAgY2F0SWQ6IGNhdElkLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgdXNlckFnZW50OiBldmVudC5oZWFkZXJzWydVc2VyLUFnZW50J10gfHwgZXZlbnQuaGVhZGVyc1sndXNlci1hZ2VudCddIHx8ICdVbmtub3duJyxcbiAgICAgICAgc291cmNlSXA6IGV2ZW50LnJlcXVlc3RDb250ZXh0Py5pZGVudGl0eT8uc291cmNlSXAgfHwgJ1Vua25vd24nXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIEFsd2F5cyB1c2UgR3JhcGhRTCBtdXRhdGlvbiBmb3Igdm90ZSB1cGRhdGVzXG4gICAgY29uc3QgbXV0YXRpb24gPSBgXG4gICAgICBtdXRhdGlvbiBVcGRhdGVWb3RlcygkaWQ6IElEISwgJHZvdGVzOiBJbnQhKSB7XG4gICAgICAgIHVwZGF0ZVZvdGVzKGlkOiAkaWQsIHZvdGVzOiAkdm90ZXMpIHtcbiAgICAgICAgICBpZFxuICAgICAgICAgIHZvdGVzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgO1xuXG4gICAgY29uc29sZS5sb2coJ1NlbmRpbmcgR3JhcGhRTCBtdXRhdGlvbjonLCB7XG4gICAgICBlbmRwb2ludDogcHJvY2Vzcy5lbnYuR1JBUEhRTF9FTkRQT0lOVCxcbiAgICAgIHZhcmlhYmxlczogeyBpZDogY2F0SWQsIHZvdGVzOiBuZXdWb3RlcyB9XG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHByb2Nlc3MuZW52LkdSQVBIUUxfRU5EUE9JTlQsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAneC1hcGkta2V5JzogcHJvY2Vzcy5lbnYuR1JBUEhRTF9BUElfS0VZLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgcXVlcnk6IG11dGF0aW9uLFxuICAgICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgICBpZDogY2F0SWQsXG4gICAgICAgICAgdm90ZXM6IG5ld1ZvdGVzLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZURhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc29sZS5sb2coJ0dyYXBoUUwgcmVzcG9uc2U6JywgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VEYXRhLCBudWxsLCAyKSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBHcmFwaFFMIHJlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzOiAke3Jlc3BvbnNlLnN0YXR1c31gKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgR3JhcGhRTCByZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1czogJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgaWYgKHJlc3BvbnNlRGF0YS5lcnJvcnMpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dyYXBoUUwgbXV0YXRpb24gZXJyb3JzOicsIHJlc3BvbnNlRGF0YS5lcnJvcnMpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBHcmFwaFFMIG11dGF0aW9uIGZhaWxlZDogJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZURhdGEuZXJyb3JzKX1gKTtcbiAgICB9XG5cbiAgICAvLyBSZWRpcmVjdCB0byB0aGUgdGhhbmtzIHBhZ2UgdG8gcHJldmVudCBkdXBsaWNhdGUgdm90ZXMgb24gcmVmcmVzaFxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAzMDIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdMb2NhdGlvbic6IGAke3Byb2Nlc3MuZW52LkFQSV9VUkwgfHwgJ2h0dHBzOi8vNmVjbDN4cHg4NC5leGVjdXRlLWFwaS51cy13ZXN0LTIuYW1hem9uYXdzLmNvbS9wcm9kLyd9dGhhbmtzYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULCBQT1NUJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiAnJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlY29yZGluZyB2b3RlOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUnLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIFBPU1QnLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gcmVjb3JkIHZvdGUnLFxuICAgICAgICBkZXRhaWxzOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xuICAgICAgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUGF1c2VkUGFnZShldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICBjb25zb2xlLmxvZygnUGF1c2VkIHBhZ2UgaGFuZGxlciBpbnZva2VkJywge1xuICAgIHVzZXJBZ2VudDogZXZlbnQuaGVhZGVyc1snVXNlci1BZ2VudCddIHx8IGV2ZW50LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSB8fCAnVW5rbm93bicsXG4gICAgc291cmNlSXA6IGV2ZW50LnJlcXVlc3RDb250ZXh0Py5pZGVudGl0eT8uc291cmNlSXAgfHwgJ1Vua25vd24nXG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc3RhdHVzQ29kZTogMjAwLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sJyxcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUnLFxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VUJyxcbiAgICB9LFxuICAgIGJvZHk6IGBcbiAgICAgIDwhRE9DVFlQRSBodG1sPlxuICAgICAgPGh0bWwgbGFuZz1cImVuXCI+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+XG4gICAgICAgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MVwiPlxuICAgICAgICA8dGl0bGU+Vm90aW5nIFBhdXNlZCAtIENhdCA0SDwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICMyMjhCMjIgMCUsICMzMkNEMzIgNTAlLCAjOTBFRTkwIDEwMCUpO1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgcGFkZGluZzogMjBweDtcbiAgICAgICAgICAgIG1pbi1oZWlnaHQ6IDEwMHZoO1xuICAgICAgICAgIH1cbiAgICAgICAgICAuY29udGFpbmVyIHtcbiAgICAgICAgICAgIG1heC13aWR0aDogNjAwcHg7XG4gICAgICAgICAgICBtYXJnaW46IDUwcHggYXV0bztcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IHdoaXRlO1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogMTVweDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDMwcHg7XG4gICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICAgICAgICBib3JkZXI6IDNweCBzb2xpZCAjMjI4QjIyO1xuICAgICAgICAgICAgYm94LXNoYWRvdzogMCA0cHggNnB4IHJnYmEoMCwwLDAsMC4xKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaDEgeyBjb2xvcjogIzAwNjQwMDsgfVxuICAgICAgICAgIC5jYXQtZW1vamkgeyBmb250LXNpemU6IDNyZW07IG1hcmdpbjogMjBweCAwOyB9XG4gICAgICAgIDwvc3R5bGU+XG4gICAgICA8L2hlYWQ+XG4gICAgICA8Ym9keT5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxuICAgICAgICAgIDxoMT7ij7jvuI8gVm90aW5nIGlzIEN1cnJlbnRseSBQYXVzZWQ8L2gxPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYXQtZW1vamlcIj7wn5CI4oCN4qybPC9kaXY+XG4gICAgICAgICAgPHA+VGhhbmsgeW91IGZvciB5b3VyIGludGVyZXN0IGluIHZvdGluZyBmb3IgdGhlIDRIIENhdCBkZWNvcmF0aW9ucy48L3A+XG4gICAgICAgICAgPHA+Vm90aW5nIGhhcyBiZWVuIHRlbXBvcmFyaWx5IHBhdXNlZCBieSB0aGUgb3JnYW5pemVycy48L3A+XG4gICAgICAgICAgPHA+UGxlYXNlIGNoZWNrIGJhY2sgbGF0ZXIhPC9wPlxuICAgICAgICAgIDxwPlRvIGZpbmQgb3V0IG1vcmUgYWJvdXQgNEgsIHZpc2l0OiBcbiAgICAgICAgICAgIDxhIGhyZWY9XCJodHRwczovL2V4dGVuc2lvbi53c3UuZWR1LzRoL1wiIHRhcmdldD1cIl9ibGFua1wiIHN0eWxlPVwiY29sb3I6ICMyMjhCMjI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPmh0dHBzOi8vZXh0ZW5zaW9uLndzdS5lZHUvNGgvPC9hPlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2JvZHk+XG4gICAgICA8L2h0bWw+XG4gICAgYCxcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlVGhhbmtzUGFnZShldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICBjb25zb2xlLmxvZygnVGhhbmtzIHBhZ2UgaGFuZGxlciBpbnZva2VkJywge1xuICAgIHVzZXJBZ2VudDogZXZlbnQuaGVhZGVyc1snVXNlci1BZ2VudCddIHx8IGV2ZW50LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSB8fCAnVW5rbm93bicsXG4gICAgc291cmNlSXA6IGV2ZW50LnJlcXVlc3RDb250ZXh0Py5pZGVudGl0eT8uc291cmNlSXAgfHwgJ1Vua25vd24nXG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc3RhdHVzQ29kZTogMjAwLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sJyxcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUnLFxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VUJyxcbiAgICB9LFxuICAgIGJvZHk6IGBcbiAgICAgIDwhRE9DVFlQRSBodG1sPlxuICAgICAgPGh0bWwgbGFuZz1cImVuXCI+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+XG4gICAgICAgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MVwiPlxuICAgICAgICA8dGl0bGU+Vm90ZSBSZWNvcmRlZCAtIENhdCA0SDwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICMyMjhCMjIgMCUsICMzMkNEMzIgNTAlLCAjOTBFRTkwIDEwMCUpO1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgcGFkZGluZzogMjBweDtcbiAgICAgICAgICAgIG1pbi1oZWlnaHQ6IDEwMHZoO1xuICAgICAgICAgIH1cbiAgICAgICAgICAuY29udGFpbmVyIHtcbiAgICAgICAgICAgIG1heC13aWR0aDogNjAwcHg7XG4gICAgICAgICAgICBtYXJnaW46IDUwcHggYXV0bztcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IHdoaXRlO1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogMTVweDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDMwcHg7XG4gICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICAgICAgICBib3JkZXI6IDNweCBzb2xpZCAjMjI4QjIyO1xuICAgICAgICAgICAgYm94LXNoYWRvdzogMCA0cHggNnB4IHJnYmEoMCwwLDAsMC4xKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaDEgeyBjb2xvcjogIzAwNjQwMDsgfVxuICAgICAgICAgIC5jYXQtZW1vamkgeyBmb250LXNpemU6IDNyZW07IG1hcmdpbjogMjBweCAwOyB9XG4gICAgICAgICAgLmluZm8tc2VjdGlvbiB7XG4gICAgICAgICAgICBtYXJnaW4tdG9wOiAzMHB4O1xuICAgICAgICAgICAgdGV4dC1hbGlnbjogbGVmdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW5wdXQge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCU7XG4gICAgICAgICAgICBwYWRkaW5nOiAxMHB4O1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMTVweDtcbiAgICAgICAgICAgIGJvcmRlcjogMnB4IHNvbGlkICMyMjhCMjI7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiA4cHg7XG4gICAgICAgICAgICBmb250LXNpemU6IDFyZW07XG4gICAgICAgICAgfVxuICAgICAgICAgIC5idG4ge1xuICAgICAgICAgICAgYmFja2dyb3VuZDogIzIyOEIyMjtcbiAgICAgICAgICAgIGNvbG9yOiB3aGl0ZTtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEwcHggMjBweDtcbiAgICAgICAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMXJlbTtcbiAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDIwcHg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGEgeyBjb2xvcjogIzIyOEIyMjsgZm9udC13ZWlnaHQ6IGJvbGQ7IH1cbiAgICAgICAgPC9zdHlsZT5cbiAgICAgIDwvaGVhZD5cbiAgICAgIDxib2R5PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XG4gICAgICAgICAgPGgxPvCfjokgVm90ZSBSZWNvcmRlZCEg8J+OiTwvaDE+XG4gICAgICAgICAgPHA+VGhhbmsgeW91IGZvciB2b3RpbmchPC9wPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYXQtZW1vamlcIj7wn5CI4oCN4qybPC9kaXY+XG4gICAgICAgICAgXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImluZm8tc2VjdGlvblwiPlxuICAgICAgICAgICAgPGgzPkludGVyZXN0ZWQgaW4gNEg/PC9oMz5cbiAgICAgICAgICAgIDxwPklmIHlvdSdyZSBpbnRlcmVzdGVkIGluIGdldHRpbmcgaW52b2x2ZWQgb3Igc2lnbmluZyB1cCBmb3IgNEgsIHBsZWFzZSBwcm92aWRlIHlvdXIgZW1haWwgYWRkcmVzczo8L3A+XG4gICAgICAgICAgICA8Zm9ybSBvbnN1Ym1pdD1cInN1Ym1pdEVtYWlsKGV2ZW50KVwiPlxuICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImVtYWlsXCIgaWQ9XCJlbWFpbElucHV0XCIgcGxhY2Vob2xkZXI9XCJ5b3VyLWVtYWlsQGV4YW1wbGUuY29tXCIgcmVxdWlyZWQgLz5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwic3VibWl0XCIgY2xhc3M9XCJidG5cIj5TdWJtaXQgSW50ZXJlc3Q8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgIDxkaXYgaWQ9XCJlbWFpbE1lc3NhZ2VcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7IGRpc3BsYXk6IG5vbmU7XCI+PC9kaXY+XG4gICAgICAgICAgICA8c2NyaXB0PlxuICAgICAgICAgICAgICBmdW5jdGlvbiBzdWJtaXRFbWFpbChldmVudCkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW1haWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZW1haWxJbnB1dCcpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZW1haWxNZXNzYWdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZmV0Y2goJ2h0dHBzOi8vNmVjbDN4cHg4NC5leGVjdXRlLWFwaS51cy13ZXN0LTIuYW1hem9uYXdzLmNvbS9wcm9kL2VtYWlsJywge1xuICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZW1haWw6IGVtYWlsIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG4gICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdmb3JtJykuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VEaXYuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgICAgICAgICBtZXNzYWdlRGl2LnN0eWxlLmNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VEaXYuaW5uZXJIVE1MID0gJzxoND5UaGFuayB5b3UhPC9oND48cD5XZVxcXFwnbGwgYmUgaW4gdG91Y2ggYWJvdXQgNEggb3Bwb3J0dW5pdGllcy48L3A+JztcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICBtZXNzYWdlRGl2LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgICAgICAgICAgICAgbWVzc2FnZURpdi5zdHlsZS5jb2xvciA9ICdyZWQnO1xuICAgICAgICAgICAgICAgICAgbWVzc2FnZURpdi50ZXh0Q29udGVudCA9ICdFcnJvciBzdWJtaXR0aW5nIGVtYWlsLiBQbGVhc2UgdHJ5IGFnYWluLic7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwvc2NyaXB0PlxuICAgICAgICAgICAgXG4gICAgICAgICAgICA8cD5UbyBmaW5kIG91dCBtb3JlIGFib3V0IDRILCB2aXNpdDogXG4gICAgICAgICAgICAgIDxhIGhyZWY9XCJodHRwczovL2V4dGVuc2lvbi53c3UuZWR1LzRoL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vZXh0ZW5zaW9uLndzdS5lZHUvNGgvPC9hPlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvYm9keT5cbiAgICAgIDwvaHRtbD5cbiAgICBgLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVFbWFpbFN1Ym1pc3Npb24oZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgY29uc29sZS5sb2coJ0VtYWlsIHN1Ym1pc3Npb24gaGFuZGxlciBpbnZva2VkOicsIHtcbiAgICB1c2VyQWdlbnQ6IGV2ZW50LmhlYWRlcnNbJ1VzZXItQWdlbnQnXSB8fCBldmVudC5oZWFkZXJzWyd1c2VyLWFnZW50J10gfHwgJ1Vua25vd24nLFxuICAgIHNvdXJjZUlwOiBldmVudC5yZXF1ZXN0Q29udGV4dD8uaWRlbnRpdHk/LnNvdXJjZUlwIHx8ICdVbmtub3duJyxcbiAgICBib2R5OiBldmVudC5ib2R5XG4gIH0pO1xuXG4gIHRyeSB7XG4gICAgLy8gVmFsaWRhdGUgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgaWYgKCFwcm9jZXNzLmVudi5HUkFQSFFMX0VORFBPSU5UKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dSQVBIUUxfRU5EUE9JTlQgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xuICAgIH1cbiAgICBpZiAoIXByb2Nlc3MuZW52LkdSQVBIUUxfQVBJX0tFWSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdHUkFQSFFMX0FQSV9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgZW1haWwgPSBib2R5LmVtYWlsO1xuXG4gICAgaWYgKCFlbWFpbCkge1xuICAgICAgY29uc29sZS5lcnJvcignTWlzc2luZyBlbWFpbCBpbiByZXF1ZXN0IGJvZHknKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NUJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0VtYWlsIGlzIHJlcXVpcmVkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFByb2Nlc3NpbmcgZW1haWwgc3VibWlzc2lvbjogJHtlbWFpbH1gKTtcblxuICAgIC8vIEFsd2F5cyB1c2UgR3JhcGhRTCBtdXRhdGlvbiBmb3IgZW1haWwgdXBkYXRlc1xuICAgIGNvbnN0IG11dGF0aW9uID0gYFxuICAgICAgbXV0YXRpb24gQWRkRW1haWwoJGVtYWlsOiBTdHJpbmchLCAkY29udGV4dDogQVdTSlNPTikge1xuICAgICAgICBhZGRFbWFpbChlbWFpbDogJGVtYWlsLCBjb250ZXh0OiAkY29udGV4dCkge1xuICAgICAgICAgIGlkXG4gICAgICAgICAgZW1haWxcbiAgICAgICAgICB0aW1lc3RhbXBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIGA7XG5cbiAgICBjb25zb2xlLmxvZygnU2VuZGluZyBlbWFpbCBHcmFwaFFMIG11dGF0aW9uJyk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChwcm9jZXNzLmVudi5HUkFQSFFMX0VORFBPSU5ULCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ3gtYXBpLWtleSc6IHByb2Nlc3MuZW52LkdSQVBIUUxfQVBJX0tFWSxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHF1ZXJ5OiBtdXRhdGlvbixcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgZW1haWw6IGVtYWlsLFxuICAgICAgICAgIGNvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHVzZXJBZ2VudDogZXZlbnQuaGVhZGVyc1snVXNlci1BZ2VudCddIHx8IGV2ZW50LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICBzb3VyY2VJcDogZXZlbnQucmVxdWVzdENvbnRleHQ/LmlkZW50aXR5Py5zb3VyY2VJcCB8fCAnVW5rbm93bidcbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZURhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc29sZS5sb2coJ0VtYWlsIEdyYXBoUUwgcmVzcG9uc2U6JywgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VEYXRhLCBudWxsLCAyKSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBFbWFpbCBHcmFwaFFMIHJlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzOiAke3Jlc3BvbnNlLnN0YXR1c31gKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRW1haWwgR3JhcGhRTCByZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1czogJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgaWYgKHJlc3BvbnNlRGF0YS5lcnJvcnMpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0VtYWlsIEdyYXBoUUwgbXV0YXRpb24gZXJyb3JzOicsIHJlc3BvbnNlRGF0YS5lcnJvcnMpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFbWFpbCBHcmFwaFFMIG11dGF0aW9uIGZhaWxlZDogJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZURhdGEuZXJyb3JzKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUnLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NUJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdFbWFpbCBzdWJtaXR0ZWQgc3VjY2Vzc2Z1bGx5JyB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN1Ym1pdHRpbmcgZW1haWw6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ1BPU1QnLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gc3VibWl0IGVtYWlsJyxcbiAgICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn0iXX0=
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Test the scoring data access with type conversion
async function testScoring() {
  const client = new DynamoDBClient({ region: 'us-west-2' });
  const docClient = DynamoDBDocumentClient.from(client);
  
  // Import the ScoreDataAccess class
  const { ScoreDataAccess } = require('./infrastructure/lambda/scoreDataAccess');
  
  const scoreAccess = new ScoreDataAccess(docClient, 'cat-voting-table');
  
  try {
    console.log('Testing score retrieval with type conversion...');
    
    // Get the existing score
    const score = await scoreAccess.getScore('a10781ef-762e-459a-91c7-be387f34d654');
    console.log('Retrieved score:', JSON.stringify(score, null, 2));
    
    if (score) {
      console.log('Type checks:');
      console.log('firstImpressionScore type:', typeof score.firstImpressionScore);
      console.log('totalScore type:', typeof score.totalScore);
      console.log('modificationCount type:', typeof score.modificationCount);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScoring();
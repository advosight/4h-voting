#!/usr/bin/env node

/**
 * Database Migration Script for Fit and Show Scoring
 * 
 * This script ensures the DynamoDB table is ready for fit and show scoring.
 * Since fit and show scoring is a new feature, this script primarily serves
 * as a template for future migrations and validates table structure.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'cat-voting-table';
const REGION = process.env.AWS_REGION || 'us-west-2';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function validateTableStructure() {
  console.log('🔍 Validating table structure for fit and show scoring...');
  
  try {
    // Test a simple scan to ensure table exists and is accessible
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 1,
    }));
    
    console.log('✅ Table is accessible and ready for fit and show scoring');
    return true;
  } catch (error) {
    console.error('❌ Table validation failed:', error.message);
    return false;
  }
}

async function checkExistingFitShowScores() {
  console.log('🔍 Checking for existing fit and show scores...');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'FIT_SHOW_SCORE#',
      },
      Limit: 10,
    }));
    
    const count = result.Items?.length || 0;
    console.log(`📊 Found ${count} existing fit and show score records`);
    
    return count;
  } catch (error) {
    console.error('❌ Error checking existing scores:', error.message);
    return 0;
  }
}

async function createSampleData() {
  const shouldCreateSample = process.argv.includes('--create-sample');
  
  if (!shouldCreateSample) {
    console.log('ℹ️  Skipping sample data creation (use --create-sample to enable)');
    return;
  }
  
  console.log('🏗️  Creating sample fit and show scoring data...');
  
  // This is just a template - in production, sample data would not be created
  const sampleScore = {
    PK: 'FIT_SHOW_SCORE#sample-001',
    SK: 'METADATA',
    id: 'sample-001',
    catId: 'sample-cat-001',
    participantName: 'Sample Participant',
    judgeId: 'sample-judge-001',
    judgeName: 'Sample Judge',
    
    // Appearance & Demeanor (20 points)
    attire: 8,
    attentive: 4,
    courteous: 4,
    
    // Handling & Control (14 points)
    controlEquipment: 8,
    pickupCarrying: 3,
    
    // Demonstration Skills (16 points)
    showingHeadShape: 3,
    showingBodyType: 3,
    showingTail: 3,
    showingCoatTexture: 3,
    
    // Health Examination (21 points)
    showingMouthTeethGums: 2,
    conditionMouthTeethGums: 2,
    showingNose: 2,
    showingEyes: 2,
    conditionNoseEyes: 2,
    showingEars: 2,
    earsClean: 2,
    showingToenailsClaws: 2,
    toenailsClipped: 5,
    
    // Grooming & Care (14 points)
    showingBellyCoatCleanliness: 2,
    coatCleanWellGroomed: 6,
    catHealthCare: 2,
    
    // Knowledge (12 points)
    generalKnowledge: 2,
    catBreedsShowing: 2,
    catAnatomy: 2,
    fourHKnowledge: 2,
    
    // Calculated totals
    appearanceTotal: 16,
    handlingTotal: 11,
    demonstrationTotal: 12,
    healthExaminationTotal: 17,
    groomingCareTotal: 10,
    knowledgeTotal: 8,
    totalScore: 74,
    
    // Comments
    appearanceComments: 'Sample appearance feedback',
    handlingComments: 'Sample handling feedback',
    demonstrationComments: 'Sample demonstration feedback',
    healthExaminationComments: 'Sample health examination feedback',
    groomingCareComments: 'Sample grooming feedback',
    knowledgeComments: 'Sample knowledge feedback',
    
    // Metadata
    timestamp: new Date().toISOString(),
    isFinalized: false,
    modificationCount: 0,
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: sampleScore,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    
    console.log('✅ Sample fit and show score created successfully');
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('ℹ️  Sample data already exists, skipping creation');
    } else {
      console.error('❌ Error creating sample data:', error.message);
    }
  }
}

async function runMigration() {
  console.log('🚀 Starting fit and show scoring migration...');
  console.log(`📋 Table: ${TABLE_NAME}`);
  console.log(`🌍 Region: ${REGION}`);
  console.log('');
  
  // Validate table structure
  const isValid = await validateTableStructure();
  if (!isValid) {
    process.exit(1);
  }
  
  // Check existing data
  await checkExistingFitShowScores();
  
  // Create sample data if requested
  await createSampleData();
  
  console.log('');
  console.log('✅ Fit and show scoring migration completed successfully!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Deploy the updated CDK stack: npm run deploy');
  console.log('   2. Test fit and show scoring functionality');
  console.log('   3. Monitor CloudWatch metrics and alarms');
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  validateTableStructure,
  checkExistingFitShowScores,
  runMigration,
};
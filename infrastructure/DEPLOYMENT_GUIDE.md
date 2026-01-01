# Deployment Guide - Fit and Show Scoring

This guide covers the deployment of the fit and show scoring infrastructure components.

## Overview

The fit and show scoring system adds the following infrastructure components:

- **Lambda Function**: `FitShowScoreResolverFunction` - Handles all fit and show scoring operations
- **GraphQL Resolvers**: Complete set of resolvers for fit and show scoring CRUD operations
- **CloudWatch Monitoring**: Metrics, alarms, and dashboard for fit and show scoring
- **SNS Topic**: Alert notifications for fit and show scoring issues

## New Infrastructure Components

### Lambda Functions

#### FitShowScoreResolverFunction
- **Entry Point**: `lambda/fitShowScoreResolver.ts`
- **Runtime**: Node.js Latest
- **Timeout**: 30 seconds
- **Environment Variables**:
  - `TABLE_NAME`: DynamoDB table name

### CloudWatch Monitoring

#### Alarms
- **FitShowScoring-HighErrorRate**: Triggers when error rate exceeds 5 errors in 10 minutes
- **FitShowScoring-HighDuration**: Triggers when average duration exceeds 10 seconds
- **FitShowScoring-Throttles**: Triggers on any throttling events

#### Dashboard
- **FitShowScoringMetrics**: Comprehensive dashboard showing:
  - Lambda invocations
  - Error rates
  - Duration metrics
  - DynamoDB read/write capacity

#### SNS Topic
- **fit-show-scoring-alerts**: Receives all fit and show scoring alarm notifications

### GraphQL Resolvers

The following resolvers are automatically configured:

#### Queries
- `getFitShowScore` - Get a single fit and show score by ID
- `getFitShowScoresByCat` - Get all fit and show scores for a cat
- `getFitShowScoresByCage` - Get fit and show scores by cage number
- `listAllFitShowScores` - List all fit and show scores
- `getFitShowScoresByJudge` - Get scores by judge ID
- `getFitShowScoreAuditHistory` - Get audit history for a score

#### Mutations
- `createFitShowScore` - Create a new fit and show score
- `updateFitShowScore` - Update an existing fit and show score
- `finalizeFitShowScore` - Finalize a fit and show score

#### Subscriptions
- `onFitShowScoreUpdate` - Real-time updates for fit and show scores

## Deployment Steps

### 1. Pre-deployment Validation

Ensure all fit and show scoring Lambda functions and tests are in place:

```bash
# Check that all required files exist
ls infrastructure/lambda/fitShowScoreResolver.ts
ls infrastructure/lambda/fitShowScoreDataAccess.ts
ls infrastructure/lambda/fitShowErrorHandler.ts
ls infrastructure/lambda/fitShowScoreValidation.ts

# Run tests to ensure everything works
cd infrastructure
npm test -- --testPathPattern="fitShow"
```

### 2. Deploy Infrastructure

```bash
# From project root
npm run deploy

# Or from infrastructure directory
cd infrastructure
npm run deploy
```

### 3. Post-deployment Validation

#### Verify Lambda Functions
```bash
# Check that the function was deployed
aws lambda get-function --function-name <stack-name>-FitShowScoreResolverFunction

# Check function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/<stack-name>-FitShowScoreResolverFunction"
```

#### Verify GraphQL Schema
```bash
# Test a simple query (requires authentication)
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"query": "query { listAllFitShowScores { items { id totalScore } } }"}' \
  <your-graphql-endpoint>
```

#### Verify CloudWatch Resources
```bash
# Check alarms
aws cloudwatch describe-alarms --alarm-name-prefix "FitShowScoring"

# Check dashboard
aws cloudwatch list-dashboards --dashboard-name-prefix "FitShowScoring"

# Check SNS topic
aws sns list-topics --query 'Topics[?contains(TopicArn, `fit-show-scoring-alerts`)]'
```

### 4. Run Migration Script (Optional)

```bash
cd infrastructure
npm run migrate:fitshow

# To create sample data for testing
npm run migrate:fitshow:sample
```

## Environment Variables

The following environment variables are automatically configured:

### Lambda Functions
- `TABLE_NAME`: DynamoDB table name (automatically set by CDK)

### Frontend (if needed)
All existing environment variables continue to work. No new variables are required for fit and show scoring.

## Monitoring and Alerts

### CloudWatch Dashboard

Access the fit and show scoring dashboard at:
```
https://<region>.console.aws.amazon.com/cloudwatch/home?region=<region>#dashboards:name=FitShowScoringMetrics
```

### SNS Notifications

To receive alarm notifications:

1. Subscribe to the SNS topic:
```bash
aws sns subscribe \
  --topic-arn <fit-show-scoring-topic-arn> \
  --protocol email \
  --notification-endpoint your-email@example.com
```

2. Confirm the subscription via email

### Key Metrics to Monitor

- **Lambda Invocations**: Should increase with fit and show scoring usage
- **Error Rate**: Should remain below 1%
- **Duration**: Should average under 5 seconds
- **DynamoDB Throttles**: Should be zero

## Troubleshooting

### Common Issues

#### Lambda Function Not Found
- Verify the CDK deployment completed successfully
- Check CloudFormation stack events for errors
- Ensure the function name matches the expected pattern

#### GraphQL Resolver Errors
- Check Lambda function logs in CloudWatch
- Verify DynamoDB permissions are correctly configured
- Test individual resolver functions

#### High Error Rates
- Check CloudWatch Logs for the Lambda function
- Verify input validation is working correctly
- Check for DynamoDB capacity issues

#### Performance Issues
- Monitor Lambda duration metrics
- Check DynamoDB read/write capacity utilization
- Consider optimizing query patterns if needed

### Useful Commands

```bash
# View Lambda function logs
aws logs tail /aws/lambda/<function-name> --follow

# Check DynamoDB table metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=<table-name> \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum

# Test GraphQL endpoint
aws appsync list-graphql-apis
```

## Rollback Procedures

If issues occur after deployment:

### 1. Quick Rollback
```bash
# Revert to previous CDK deployment
cdk deploy --previous-parameters
```

### 2. Disable Fit and Show Scoring
If needed, you can temporarily disable fit and show scoring by:

1. Removing the resolvers from the GraphQL schema
2. Updating the Lambda function to return errors
3. Disabling the frontend routes

### 3. Full Rollback
```bash
# Destroy the entire stack (use with caution)
npm run destroy
```

## Security Considerations

- All fit and show scoring operations require Cognito authentication
- Judge role validation is enforced at the resolver level
- Audit trails are maintained for all score modifications
- Input validation prevents malicious data injection

## Performance Optimization

- Lambda functions use connection pooling for DynamoDB
- Queries are optimized using single-table design patterns
- Real-time subscriptions use efficient filtering
- CloudWatch metrics help identify bottlenecks

## Support

For issues with fit and show scoring infrastructure:

1. Check CloudWatch Logs and metrics
2. Review the troubleshooting section above
3. Consult the fit and show scoring design document
4. Check the integration test results
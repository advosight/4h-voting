# 4H Cat Voting Infrastructure

AWS CDK infrastructure for the 4H Cat voting system using TypeScript.

## Architecture

- **DynamoDB**: Single table design for cat data, votes, and scoring
- **API Gateway**: REST API for voting endpoints
- **AppSync**: GraphQL API for website data operations
- **Lambda**: TypeScript functions for business logic and scoring
- **Cognito**: User authentication for 4H leaders and judges
- **S3 + CloudFront**: Website hosting and distribution
- **CloudWatch**: Monitoring, metrics, and alarms for scoring systems

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Deploy the infrastructure:
```bash
npm run deploy
```

## Data Model

Single table design with partition key (PK) and sort key (SK):
- Cat entries: `PK: CAT#{id}`, `SK: METADATA`
- Cage scores: `PK: SCORE#{id}`, `SK: METADATA`
- Class scores: `PK: CLASS_SCORE#{id}`, `SK: METADATA`
- Fit & show scores: `PK: FIT_SHOW_SCORE#{id}`, `SK: METADATA`
- Index records: `PK: CAT#{catId}`, `SK: SCORE#{scoreId}` (and similar for other scoring types)
- Judge records: `PK: JUDGE#{judgeId}`, `SK: SCORE#{scoreId}` (and similar for other scoring types)
- Audit trails: `PK: SCORE_AUDIT#{scoreId}`, `SK: ENTRY#{timestamp}#{auditId}`

## Endpoints

- **Voting API**: `POST /vote/{catId}` - Records votes via QR code scans
- **GraphQL API**: AppSync endpoint for website operations and scoring systems

### Scoring Systems

The infrastructure supports three types of scoring:

1. **Cage Scoring**: Evaluates cat decorations and displays
2. **Class Scoring**: Judges cats based on beauty, personality, and health
3. **Fit & Show Scoring**: Evaluates participant showmanship and knowledge

Each scoring system has dedicated Lambda functions, GraphQL resolvers, and monitoring.

## Outputs

After deployment, the stack outputs:
- User Pool ID and Client ID for Cognito
- GraphQL endpoint for AppSync
- Voting API endpoint
- Website CloudFront URL
- Fit & Show Scoring SNS Topic ARN
- Fit & Show Scoring CloudWatch Dashboard URL

## Monitoring

The infrastructure includes comprehensive monitoring for fit and show scoring:

- **CloudWatch Alarms**: Error rates, duration, and throttling
- **CloudWatch Dashboard**: Real-time metrics and performance data
- **SNS Notifications**: Alert notifications for scoring system issues

## Deployment

For detailed deployment instructions including fit and show scoring, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Migration

To prepare the database for fit and show scoring:

```bash
npm run migrate:fitshow
```

To create sample data for testing:

```bash
npm run migrate:fitshow:sample
```
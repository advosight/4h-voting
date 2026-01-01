# 4H Cat Voting System

A QR code-based voting system for 4H cat decorations with real-time results dashboard.

## Login Credentials

**Email:** 4h-leader@example.com
**Password:** CatVoting123!

## Architecture

- **Website**: React with TypeScript, hosted on CloudFront
- **Authentication**: AWS Cognito User Pool
- **API**: AWS AppSync (GraphQL) + API Gateway (REST)
- **Database**: DynamoDB (single table design)
- **Functions**: AWS Lambda (TypeScript)

## Features

- Add cats with names, owners, and cage numbers
- Generate printable QR code signs for voting
- Public voting via QR codes (no authentication required)
- Real-time vote count updates
- Email collection for 4H interest signups
- Admin dashboard with voting results and email list

## Deployment

1. Deploy infrastructure: `cd infrastructure && npx cdk deploy`
2. Build and deploy website: `cd website && npm run build`

## Usage

1. Login to admin dashboard with credentials above
2. Add cats using the form
3. Generate QR code signs for each cat
4. Print signs and place with cat decorations
5. Visitors scan QR codes to vote
6. Monitor results and email signups in real-time
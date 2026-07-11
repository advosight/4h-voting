#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CatVotingStack } from '../lib/cat-voting-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Pass -c stage=production (e.g. `cdk deploy -c stage=production`) to provision
// the 4hcats.advosight.com domain, certificate, and DNS records. Any other value
// (or omitting the flag) skips those production-only resources.
const stage = app.node.tryGetContext('stage') ?? 'development';

new CatVotingStack(app, 'CatVotingStack', {
  env,
  stage,
});

// One-time CI/CD IAM setup for GitHub Actions OIDC deploys. Not gated by
// `stage` -- deploy it once manually, independent of app deployments.
new GitHubOidcStack(app, 'GitHubOidcStack', { env });
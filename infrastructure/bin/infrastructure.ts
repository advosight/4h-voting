#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CatVotingStack } from '../lib/cat-voting-stack';

const app = new cdk.App();
new CatVotingStack(app, 'CatVotingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

const GITHUB_OIDC_AUDIENCE = 'sts.amazonaws.com';
const GITHUB_REPO = 'advosight/4h-voting';
// Default CDK bootstrap qualifier (from `cdk bootstrap`, BootstrapVersion output).
const CDK_BOOTSTRAP_QUALIFIER = 'hnb659fds';

/**
 * One-time infrastructure for GitHub Actions to deploy this app via OIDC federation
 * instead of long-lived access keys. Deploy this stack manually (`cdk deploy
 * GitHubOidcStack`) before the workflow's first run, then set the
 * GitHubActionsDeployRoleArn output as the `role-to-assume` in the workflow.
 *
 * The role only gets permission to assume the existing CDK bootstrap roles
 * (deploy/file-publishing/lookup) rather than direct service permissions --
 * CDK's CLI handles switching to those roles during `cdk deploy`.
 */
export class GitHubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: [GITHUB_OIDC_AUDIENCE],
    });

    const deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'github-actions-4h-voting-deploy',
      description: 'Assumed by GitHub Actions (main branch only) to deploy the 4H Cat Voting app via CDK',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.OpenIdConnectPrincipal(provider, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': GITHUB_OIDC_AUDIENCE,
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${GITHUB_REPO}:ref:refs/heads/main`,
        },
      }),
    });

    const bootstrapRoleArns = ['deploy-role', 'file-publishing-role', 'lookup-role'].map(
      (role) => `arn:aws:iam::${this.account}:role/cdk-${CDK_BOOTSTRAP_QUALIFIER}-${role}-${this.account}-${this.region}`
    );

    deployRole.addToPolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: bootstrapRoleArns,
    }));

    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleArn', {
      value: deployRole.roleArn,
      description: 'Set as the role-to-assume ARN in the GitHub Actions deploy workflow',
    });
  }
}

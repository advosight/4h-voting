import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CatVotingStack } from '../../lib/cat-voting-stack';

describe('Infrastructure Deployment', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new CatVotingStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('Fit and Show Scoring Lambda Function is created', () => {
    // Check that we have the expected number of Lambda functions (including fit show
    // scoring, and the PreSignUp/PostConfirmation triggers backing invite-by-email signup)
    template.resourceCountIs('AWS::Lambda::Function', 10);
    
    // Check that fit show scoring function exists by checking for a function with TABLE_NAME env var
    const lambdaFunctions = template.findResources('AWS::Lambda::Function');
    const fitShowFunction = Object.values(lambdaFunctions).find((func: any) => 
      func.Properties?.Environment?.Variables?.TABLE_NAME
    );
    expect(fitShowFunction).toBeDefined();
  });

  test('CloudWatch alarms are created for Fit and Show Scoring', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'FitShowScoring-HighErrorRate',
      AlarmDescription: 'High error rate in fit and show scoring Lambda function',
      Threshold: 5,
      EvaluationPeriods: 2
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'FitShowScoring-HighDuration',
      AlarmDescription: 'High duration in fit and show scoring Lambda function',
      Threshold: 10000,
      EvaluationPeriods: 3
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'FitShowScoring-Throttles',
      AlarmDescription: 'Throttles detected in fit and show scoring Lambda function',
      Threshold: 1,
      EvaluationPeriods: 1
    });
  });

  test('SNS topic is created for Fit and Show Scoring alerts', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'fit-show-scoring-alerts',
      DisplayName: 'Fit and Show Scoring Alerts'
    });
  });

  test('CloudWatch dashboard is created for Fit and Show Scoring', () => {
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'FitShowScoringMetrics'
    });
  });

  test('Stack outputs include Fit and Show Scoring resources', () => {
    template.hasOutput('FitShowScoringTopicArn', {});
    template.hasOutput('FitShowScoringDashboardUrl', {});
  });
});
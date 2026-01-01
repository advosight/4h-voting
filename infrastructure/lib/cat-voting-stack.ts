import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export class CatVotingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table - Single table design
    const table = new dynamodb.Table(this, 'CatVotingTable', {
      tableName: 'cat-voting-table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'CatVotingUserPool', {
      userPoolName: 'cat-voting-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      customAttributes: {
        role: new cognito.StringAttribute({
          mutable: true,
        }),
        judgeId: new cognito.StringAttribute({
          mutable: true,
        }),
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'CatVotingUserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
    });

    // AppSync API
    const graphqlApi = new appsync.GraphqlApi(this, 'CatVotingApi', {
      name: 'cat-voting-api',
      schema: appsync.SchemaFile.fromAsset('lib/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365)),
            },
          },
        ],
      },
    });

    // Lambda Functions
    const voteFunction = new nodejs.NodejsFunction(this, 'VoteFunction', {
      entry: 'lambda/vote.ts',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
        GRAPHQL_ENDPOINT: graphqlApi.graphqlUrl,
        GRAPHQL_API_KEY: graphqlApi.apiKey!,
      },
    });

    const resolverFunction = new nodejs.NodejsFunction(this, 'ResolverFunction', {
      entry: 'lambda/resolver.ts',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const scoreResolverFunction = new nodejs.NodejsFunction(this, 'ScoreResolverFunction', {
      entry: 'lambda/scoreResolver.ts',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const userManagementResolverFunction = new nodejs.NodejsFunction(this, 'UserManagementResolverFunction', {
      entry: 'lambda/userManagementResolver.ts',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    const classScoreResolverFunction = new nodejs.NodejsFunction(this, 'ClassScoreResolverFunction', {
      entry: 'lambda/classScoreResolver.ts',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const fitShowScoreResolverFunction = new nodejs.NodejsFunction(this, 'FitShowScoreResolverFunction', {
      entry: 'lambda/fitShowScoreResolver.ts',
      runtime: lambda.Runtime.NODEJS_LATEST,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(voteFunction);
    table.grantReadWriteData(resolverFunction);
    table.grantReadWriteData(scoreResolverFunction);
    table.grantReadWriteData(classScoreResolverFunction);
    table.grantReadWriteData(fitShowScoreResolverFunction);

    // Grant Cognito permissions to user management function
    userPool.grant(userManagementResolverFunction, 
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminSetUserAttributes', 
      'cognito-idp:ListUsers',
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminUpdateUserAttributes'
    );

    // API Gateway for voting
    const api = new apigateway.RestApi(this, 'VotingApi', {
      restApiName: 'cat-voting-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const voteResource = api.root.addResource('vote').addResource('{catId}');
    voteResource.addMethod('GET', new apigateway.LambdaIntegration(voteFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    voteResource.addMethod('POST', new apigateway.LambdaIntegration(voteFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    const thanksResource = api.root.addResource('thanks');
    thanksResource.addMethod('GET', new apigateway.LambdaIntegration(voteFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    
    const pausedResource = api.root.addResource('paused');
    pausedResource.addMethod('GET', new apigateway.LambdaIntegration(voteFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    const emailResource = api.root.addResource('email');
    emailResource.addMethod('POST', new apigateway.LambdaIntegration(voteFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // CloudWatch Metrics and Alarms for Fit and Show Scoring
    const fitShowScoringTopic = new sns.Topic(this, 'FitShowScoringAlerts', {
      topicName: 'fit-show-scoring-alerts',
      displayName: 'Fit and Show Scoring Alerts',
    });

    // Lambda Error Rate Alarm for Fit Show Scoring
    const fitShowErrorAlarm = new cloudwatch.Alarm(this, 'FitShowScoringErrorAlarm', {
      alarmName: 'FitShowScoring-HighErrorRate',
      alarmDescription: 'High error rate in fit and show scoring Lambda function',
      metric: fitShowScoreResolverFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    fitShowErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(fitShowScoringTopic));

    // Lambda Duration Alarm for Fit Show Scoring
    const fitShowDurationAlarm = new cloudwatch.Alarm(this, 'FitShowScoringDurationAlarm', {
      alarmName: 'FitShowScoring-HighDuration',
      alarmDescription: 'High duration in fit and show scoring Lambda function',
      metric: fitShowScoreResolverFunction.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    fitShowDurationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(fitShowScoringTopic));

    // Lambda Throttle Alarm for Fit Show Scoring
    const fitShowThrottleAlarm = new cloudwatch.Alarm(this, 'FitShowScoringThrottleAlarm', {
      alarmName: 'FitShowScoring-Throttles',
      alarmDescription: 'Throttles detected in fit and show scoring Lambda function',
      metric: fitShowScoreResolverFunction.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    fitShowThrottleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(fitShowScoringTopic));

    // Custom CloudWatch Dashboard for Fit and Show Scoring
    const fitShowDashboard = new cloudwatch.Dashboard(this, 'FitShowScoringDashboard', {
      dashboardName: 'FitShowScoringMetrics',
    });

    fitShowDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Fit Show Scoring Lambda Invocations',
        left: [fitShowScoreResolverFunction.metricInvocations()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Fit Show Scoring Lambda Errors',
        left: [fitShowScoreResolverFunction.metricErrors()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Fit Show Scoring Lambda Duration',
        left: [fitShowScoreResolverFunction.metricDuration()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Read/Write Capacity (Fit Show Scoring)',
        left: [
          table.metricConsumedReadCapacityUnits(),
          table.metricConsumedWriteCapacityUnits(),
        ],
        width: 12,
      })
    );



    const dataSource = graphqlApi.addLambdaDataSource('ResolverDataSource', resolverFunction);
    const scoreDataSource = graphqlApi.addLambdaDataSource('ScoreResolverDataSource', scoreResolverFunction);
    const userManagementDataSource = graphqlApi.addLambdaDataSource('UserManagementDataSource', userManagementResolverFunction);
    const classScoreDataSource = graphqlApi.addLambdaDataSource('ClassScoreResolverDataSource', classScoreResolverFunction);
    const fitShowScoreDataSource = graphqlApi.addLambdaDataSource('FitShowScoreResolverDataSource', fitShowScoreResolverFunction);

    // Resolvers
    dataSource.createResolver('listCatsResolver', {
      typeName: 'Query',
      fieldName: 'listCats',
    });

    dataSource.createResolver('getCatResolver', {
      typeName: 'Query',
      fieldName: 'getCat',
    });

    dataSource.createResolver('getCatByCageResolver', {
      typeName: 'Query',
      fieldName: 'getCatByCage',
    });

    dataSource.createResolver('createCatResolver', {
      typeName: 'Mutation',
      fieldName: 'createCat',
    });

    dataSource.createResolver('updateVotesResolver', {
      typeName: 'Mutation',
      fieldName: 'updateVotes',
    });

    dataSource.createResolver('updateCatResolver', {
      typeName: 'Mutation',
      fieldName: 'updateCat',
    });

    dataSource.createResolver('listEmailsResolver', {
      typeName: 'Query',
      fieldName: 'listEmails',
    });

    dataSource.createResolver('addEmailResolver', {
      typeName: 'Mutation',
      fieldName: 'addEmail',
    });

    dataSource.createResolver('deleteCatResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteCat',
    });
    
    dataSource.createResolver('getVotingStatusResolver', {
      typeName: 'Query',
      fieldName: 'getVotingStatus',
    });
    
    dataSource.createResolver('setVotingStatusResolver', {
      typeName: 'Mutation',
      fieldName: 'setVotingStatus',
    });

    // Score Resolvers
    scoreDataSource.createResolver('getScoreResolver', {
      typeName: 'Query',
      fieldName: 'getScore',
    });

    scoreDataSource.createResolver('getScoresByCatResolver', {
      typeName: 'Query',
      fieldName: 'getScoresByCat',
    });

    scoreDataSource.createResolver('getScoresByCageResolver', {
      typeName: 'Query',
      fieldName: 'getScoresByCage',
    });

    scoreDataSource.createResolver('listAllScoresResolver', {
      typeName: 'Query',
      fieldName: 'listAllScores',
    });

    scoreDataSource.createResolver('getScoresByJudgeResolver', {
      typeName: 'Query',
      fieldName: 'getScoresByJudge',
    });

    scoreDataSource.createResolver('createScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'createScore',
    });

    scoreDataSource.createResolver('updateScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'updateScore',
    });

    scoreDataSource.createResolver('finalizeScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'finalizeScore',
    });

    scoreDataSource.createResolver('getScoreAuditHistoryResolver', {
      typeName: 'Query',
      fieldName: 'getScoreAuditHistory',
    });

    // User Management Resolvers
    userManagementDataSource.createResolver('createJudgeAccountResolver', {
      typeName: 'Mutation',
      fieldName: 'createJudgeAccount',
    });

    userManagementDataSource.createResolver('updateUserRoleResolver', {
      typeName: 'Mutation',
      fieldName: 'updateUserRole',
    });

    userManagementDataSource.createResolver('listJudgeAccountsResolver', {
      typeName: 'Query',
      fieldName: 'listJudgeAccounts',
    });

    userManagementDataSource.createResolver('getJudgeAccountResolver', {
      typeName: 'Query',
      fieldName: 'getJudgeAccount',
    });

    // Class Score Resolvers
    classScoreDataSource.createResolver('getClassScoreResolver', {
      typeName: 'Query',
      fieldName: 'getClassScore',
    });

    classScoreDataSource.createResolver('getClassScoresByCatResolver', {
      typeName: 'Query',
      fieldName: 'getClassScoresByCat',
    });

    classScoreDataSource.createResolver('getClassScoresByCageResolver', {
      typeName: 'Query',
      fieldName: 'getClassScoresByCage',
    });

    classScoreDataSource.createResolver('listAllClassScoresResolver', {
      typeName: 'Query',
      fieldName: 'listAllClassScores',
    });

    classScoreDataSource.createResolver('getClassScoresByJudgeResolver', {
      typeName: 'Query',
      fieldName: 'getClassScoresByJudge',
    });

    classScoreDataSource.createResolver('createClassScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'createClassScore',
    });

    classScoreDataSource.createResolver('updateClassScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'updateClassScore',
    });

    classScoreDataSource.createResolver('finalizeClassScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'finalizeClassScore',
    });

    classScoreDataSource.createResolver('getClassScoreAuditHistoryResolver', {
      typeName: 'Query',
      fieldName: 'getClassScoreAuditHistory',
    });

    // Fit and Show Score Resolvers
    fitShowScoreDataSource.createResolver('getFitShowScoreResolver', {
      typeName: 'Query',
      fieldName: 'getFitShowScore',
    });

    fitShowScoreDataSource.createResolver('getFitShowScoresByCatResolver', {
      typeName: 'Query',
      fieldName: 'getFitShowScoresByCat',
    });

    fitShowScoreDataSource.createResolver('getFitShowScoresByCageResolver', {
      typeName: 'Query',
      fieldName: 'getFitShowScoresByCage',
    });

    fitShowScoreDataSource.createResolver('listAllFitShowScoresResolver', {
      typeName: 'Query',
      fieldName: 'listAllFitShowScores',
    });

    fitShowScoreDataSource.createResolver('listFitShowScoresResolver', {
      typeName: 'Query',
      fieldName: 'listFitShowScores',
    });

    fitShowScoreDataSource.createResolver('getFitShowScoresByJudgeResolver', {
      typeName: 'Query',
      fieldName: 'getFitShowScoresByJudge',
    });

    fitShowScoreDataSource.createResolver('createFitShowScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'createFitShowScore',
    });

    fitShowScoreDataSource.createResolver('updateFitShowScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'updateFitShowScore',
    });

    fitShowScoreDataSource.createResolver('finalizeFitShowScoreResolver', {
      typeName: 'Mutation',
      fieldName: 'finalizeFitShowScore',
    });

    fitShowScoreDataSource.createResolver('getFitShowScoreAuditHistoryResolver', {
      typeName: 'Query',
      fieldName: 'getFitShowScoreAuditHistory',
    });

    // S3 Bucket for website
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `cat-voting-website-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Deploy website
    new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
      sources: [s3deploy.Source.asset('../build')],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      exportName: 'CatVotingUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      exportName: 'CatVotingUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'GraphQLEndpoint', {
      value: graphqlApi.graphqlUrl,
      exportName: 'CatVotingGraphQLEndpoint',
    });

    new cdk.CfnOutput(this, 'VotingApiEndpoint', {
      value: api.url,
      exportName: 'CatVotingApiEndpoint',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: distribution.distributionDomainName,
      exportName: 'CatVotingWebsiteUrl',
    });

    new cdk.CfnOutput(this, 'FitShowScoringTopicArn', {
      value: fitShowScoringTopic.topicArn,
      exportName: 'FitShowScoringTopicArn',
    });

    new cdk.CfnOutput(this, 'FitShowScoringDashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${fitShowDashboard.dashboardName}`,
      exportName: 'FitShowScoringDashboardUrl',
    });
  }
}
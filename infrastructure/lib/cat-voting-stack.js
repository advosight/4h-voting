"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatVotingStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const nodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const appsync = __importStar(require("aws-cdk-lib/aws-appsync"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const cloudwatchActions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
class CatVotingStack extends cdk.Stack {
    constructor(scope, id, props) {
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
                GRAPHQL_API_KEY: graphqlApi.apiKey,
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
        userPool.grant(userManagementResolverFunction, 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserAttributes', 'cognito-idp:ListUsers', 'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes');
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
        fitShowDashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Fit Show Scoring Lambda Invocations',
            left: [fitShowScoreResolverFunction.metricInvocations()],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Fit Show Scoring Lambda Errors',
            left: [fitShowScoreResolverFunction.metricErrors()],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Fit Show Scoring Lambda Duration',
            left: [fitShowScoreResolverFunction.metricDuration()],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'DynamoDB Read/Write Capacity (Fit Show Scoring)',
            left: [
                table.metricConsumedReadCapacityUnits(),
                table.metricConsumedWriteCapacityUnits(),
            ],
            width: 12,
        }));
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
exports.CatVotingStack = CatVotingStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F0LXZvdGluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhdC12b3Rpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBQ3JELCtEQUFpRDtBQUNqRCxzRUFBd0Q7QUFDeEQsdUVBQXlEO0FBQ3pELGlFQUFtRDtBQUNuRCxpRUFBbUQ7QUFDbkQsdURBQXlDO0FBQ3pDLHVFQUF5RDtBQUN6RCw0RUFBOEQ7QUFDOUQsd0VBQTBEO0FBQzFELHVFQUF5RDtBQUN6RCx5REFBMkM7QUFDM0Msc0ZBQXdFO0FBR3hFLE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsdUNBQXVDO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdkQsU0FBUyxFQUFFLGtCQUFrQjtZQUM3QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNqRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUM1RCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELE1BQU0sRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLGtCQUFrQjtZQUNsRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FB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QUFDLFdBQVc7YUFDMUM7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDNUUsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUk7U0FDckQsQ0FBQyxDQUFDO1FBQ0gsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDN0UsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUk7U0FDckQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDOUUsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUk7U0FDckQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDOUUsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUk7U0FDckQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEQsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFN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QUE0QixFQUFFO1lBQ3BELEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxNQUFNLGtEQUFrRCxJQUFJLENBQUMsTUFBTSxvQkFBb0IsZ0JBQWdCLENBQUMsYUFBYSxFQUFFO1lBQzlJLFVBQVUsRUFBRSw0QkFBNEI7U0FDekMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdmhCRCx3Q0F1aEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBub2RlanMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBzeW5jJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaEFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIENhdFZvdGluZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gRHluYW1vREIgVGFibGUgLSBTaW5nbGUgdGFibGUgZGVzaWduXG4gICAgY29uc3QgdGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0NhdFZvdGluZ1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnY2F0LXZvdGluZy10YWJsZScsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbFxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ0NhdFZvdGluZ1VzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiAnY2F0LXZvdGluZy11c2VyLXBvb2wnLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXG4gICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XG4gICAgICAgIHJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICAgIGp1ZGdlSWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ0NhdFZvdGluZ1VzZXJQb29sQ2xpZW50Jywge1xuICAgICAgdXNlclBvb2wsXG4gICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFwcFN5bmMgQVBJXG4gICAgY29uc3QgZ3JhcGhxbEFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgJ0NhdFZvdGluZ0FwaScsIHtcbiAgICAgIG5hbWU6ICdjYXQtdm90aW5nLWFwaScsXG4gICAgICBzY2hlbWE6IGFwcHN5bmMuU2NoZW1hRmlsZS5mcm9tQXNzZXQoJ2xpYi9zY2hlbWEuZ3JhcGhxbCcpLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAgICAgICB1c2VyUG9vbENvbmZpZzogeyB1c2VyUG9vbCB9LFxuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsQXV0aG9yaXphdGlvbk1vZGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuQVBJX0tFWSxcbiAgICAgICAgICAgIGFwaUtleUNvbmZpZzoge1xuICAgICAgICAgICAgICBleHBpcmVzOiBjZGsuRXhwaXJhdGlvbi5hZnRlcihjZGsuRHVyYXRpb24uZGF5cygzNjUpKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3Qgdm90ZUZ1bmN0aW9uID0gbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnVm90ZUZ1bmN0aW9uJywge1xuICAgICAgZW50cnk6ICdsYW1iZGEvdm90ZS50cycsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfTEFURVNULFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogdGFibGUudGFibGVOYW1lLFxuICAgICAgICBHUkFQSFFMX0VORFBPSU5UOiBncmFwaHFsQXBpLmdyYXBocWxVcmwsXG4gICAgICAgIEdSQVBIUUxfQVBJX0tFWTogZ3JhcGhxbEFwaS5hcGlLZXkhLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc29sdmVyRnVuY3Rpb24gPSBuZXcgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdSZXNvbHZlckZ1bmN0aW9uJywge1xuICAgICAgZW50cnk6ICdsYW1iZGEvcmVzb2x2ZXIudHMnLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTX0xBVEVTVCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBzY29yZVJlc29sdmVyRnVuY3Rpb24gPSBuZXcgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdTY29yZVJlc29sdmVyRnVuY3Rpb24nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9zY29yZVJlc29sdmVyLnRzJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU19MQVRFU1QsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlck1hbmFnZW1lbnRSZXNvbHZlckZ1bmN0aW9uID0gbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnVXNlck1hbmFnZW1lbnRSZXNvbHZlckZ1bmN0aW9uJywge1xuICAgICAgZW50cnk6ICdsYW1iZGEvdXNlck1hbmFnZW1lbnRSZXNvbHZlci50cycsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfTEFURVNULFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsYXNzU2NvcmVSZXNvbHZlckZ1bmN0aW9uID0gbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnQ2xhc3NTY29yZVJlc29sdmVyRnVuY3Rpb24nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9jbGFzc1Njb3JlUmVzb2x2ZXIudHMnLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTX0xBVEVTVCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBmaXRTaG93U2NvcmVSZXNvbHZlckZ1bmN0aW9uID0gbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnRml0U2hvd1Njb3JlUmVzb2x2ZXJGdW5jdGlvbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2ZpdFNob3dTY29yZVJlc29sdmVyLnRzJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU19MQVRFU1QsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHZvdGVGdW5jdGlvbik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJlc29sdmVyRnVuY3Rpb24pO1xuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShzY29yZVJlc29sdmVyRnVuY3Rpb24pO1xuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjbGFzc1Njb3JlUmVzb2x2ZXJGdW5jdGlvbik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZpdFNob3dTY29yZVJlc29sdmVyRnVuY3Rpb24pO1xuXG4gICAgLy8gR3JhbnQgQ29nbml0byBwZXJtaXNzaW9ucyB0byB1c2VyIG1hbmFnZW1lbnQgZnVuY3Rpb25cbiAgICB1c2VyUG9vbC5ncmFudCh1c2VyTWFuYWdlbWVudFJlc29sdmVyRnVuY3Rpb24sIFxuICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXG4gICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyQXR0cmlidXRlcycsIFxuICAgICAgJ2NvZ25pdG8taWRwOkxpc3RVc2VycycsXG4gICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJ1xuICAgICk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIE1ldHJpY3MgYW5kIEFsYXJtcyBmb3IgRml0IGFuZCBTaG93IFNjb3JpbmdcbiAgICBjb25zdCBmaXRTaG93U2NvcmluZ1RvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnRml0U2hvd1Njb3JpbmdBbGVydHMnLCB7XG4gICAgICB0b3BpY05hbWU6ICdmaXQtc2hvdy1zY29yaW5nLWFsZXJ0cycsXG4gICAgICBkaXNwbGF5TmFtZTogJ0ZpdCBhbmQgU2hvdyBTY29yaW5nIEFsZXJ0cycsXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgRXJyb3IgUmF0ZSBBbGFybSBmb3IgRml0IFNob3cgU2NvcmluZ1xuICAgIGNvbnN0IGZpdFNob3dFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0ZpdFNob3dTY29yaW5nRXJyb3JBbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogJ0ZpdFNob3dTY29yaW5nLUhpZ2hFcnJvclJhdGUnLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggZXJyb3IgcmF0ZSBpbiBmaXQgYW5kIHNob3cgc2NvcmluZyBMYW1iZGEgZnVuY3Rpb24nLFxuICAgICAgbWV0cmljOiBmaXRTaG93U2NvcmVSZXNvbHZlckZ1bmN0aW9uLm1ldHJpY0Vycm9ycyh7XG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogNSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXG4gICAgfSk7XG4gICAgZml0U2hvd0Vycm9yQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbihmaXRTaG93U2NvcmluZ1RvcGljKSk7XG5cbiAgICAvLyBMYW1iZGEgRHVyYXRpb24gQWxhcm0gZm9yIEZpdCBTaG93IFNjb3JpbmdcbiAgICBjb25zdCBmaXRTaG93RHVyYXRpb25BbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdGaXRTaG93U2NvcmluZ0R1cmF0aW9uQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6ICdGaXRTaG93U2NvcmluZy1IaWdoRHVyYXRpb24nLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggZHVyYXRpb24gaW4gZml0IGFuZCBzaG93IHNjb3JpbmcgTGFtYmRhIGZ1bmN0aW9uJyxcbiAgICAgIG1ldHJpYzogZml0U2hvd1Njb3JlUmVzb2x2ZXJGdW5jdGlvbi5tZXRyaWNEdXJhdGlvbih7XG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxuICAgICAgfSksXG4gICAgICB0aHJlc2hvbGQ6IDEwMDAwLCAvLyAxMCBzZWNvbmRzXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxuICAgIH0pO1xuICAgIGZpdFNob3dEdXJhdGlvbkFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24oZml0U2hvd1Njb3JpbmdUb3BpYykpO1xuXG4gICAgLy8gTGFtYmRhIFRocm90dGxlIEFsYXJtIGZvciBGaXQgU2hvdyBTY29yaW5nXG4gICAgY29uc3QgZml0U2hvd1Rocm90dGxlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRml0U2hvd1Njb3JpbmdUaHJvdHRsZUFsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiAnRml0U2hvd1Njb3JpbmctVGhyb3R0bGVzJyxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdUaHJvdHRsZXMgZGV0ZWN0ZWQgaW4gZml0IGFuZCBzaG93IHNjb3JpbmcgTGFtYmRhIGZ1bmN0aW9uJyxcbiAgICAgIG1ldHJpYzogZml0U2hvd1Njb3JlUmVzb2x2ZXJGdW5jdGlvbi5tZXRyaWNUaHJvdHRsZXMoe1xuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgfSksXG4gICAgICB0aHJlc2hvbGQ6IDEsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxuICAgIH0pO1xuICAgIGZpdFNob3dUaHJvdHRsZUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24oZml0U2hvd1Njb3JpbmdUb3BpYykpO1xuXG4gICAgLy8gQ3VzdG9tIENsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBGaXQgYW5kIFNob3cgU2NvcmluZ1xuICAgIGNvbnN0IGZpdFNob3dEYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ0ZpdFNob3dTY29yaW5nRGFzaGJvYXJkJywge1xuICAgICAgZGFzaGJvYXJkTmFtZTogJ0ZpdFNob3dTY29yaW5nTWV0cmljcycsXG4gICAgfSk7XG5cbiAgICBmaXRTaG93RGFzaGJvYXJkLmFkZFdpZGdldHMoXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgIHRpdGxlOiAnRml0IFNob3cgU2NvcmluZyBMYW1iZGEgSW52b2NhdGlvbnMnLFxuICAgICAgICBsZWZ0OiBbZml0U2hvd1Njb3JlUmVzb2x2ZXJGdW5jdGlvbi5tZXRyaWNJbnZvY2F0aW9ucygpXSxcbiAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgfSksXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgIHRpdGxlOiAnRml0IFNob3cgU2NvcmluZyBMYW1iZGEgRXJyb3JzJyxcbiAgICAgICAgbGVmdDogW2ZpdFNob3dTY29yZVJlc29sdmVyRnVuY3Rpb24ubWV0cmljRXJyb3JzKCldLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KSxcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdGaXQgU2hvdyBTY29yaW5nIExhbWJkYSBEdXJhdGlvbicsXG4gICAgICAgIGxlZnQ6IFtmaXRTaG93U2NvcmVSZXNvbHZlckZ1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKCldLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KSxcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdEeW5hbW9EQiBSZWFkL1dyaXRlIENhcGFjaXR5IChGaXQgU2hvdyBTY29yaW5nKScsXG4gICAgICAgIGxlZnQ6IFtcbiAgICAgICAgICB0YWJsZS5tZXRyaWNDb25zdW1lZFJlYWRDYXBhY2l0eVVuaXRzKCksXG4gICAgICAgICAgdGFibGUubWV0cmljQ29uc3VtZWRXcml0ZUNhcGFjaXR5VW5pdHMoKSxcbiAgICAgICAgXSxcbiAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgZm9yIHZvdGluZ1xuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1ZvdGluZ0FwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnY2F0LXZvdGluZy1hcGknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB2b3RlUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgndm90ZScpLmFkZFJlc291cmNlKCd7Y2F0SWR9Jyk7XG4gICAgdm90ZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odm90ZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORSxcbiAgICB9KTtcbiAgICB2b3RlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odm90ZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORSxcbiAgICB9KTtcbiAgICBcbiAgICBjb25zdCB0aGFua3NSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCd0aGFua3MnKTtcbiAgICB0aGFua3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHZvdGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkUsXG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgcGF1c2VkUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncGF1c2VkJyk7XG4gICAgcGF1c2VkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih2b3RlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZW1haWxSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdlbWFpbCcpO1xuICAgIGVtYWlsUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odm90ZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBncmFwaHFsQXBpLmFkZExhbWJkYURhdGFTb3VyY2UoJ1Jlc29sdmVyRGF0YVNvdXJjZScsIHJlc29sdmVyRnVuY3Rpb24pO1xuICAgIGNvbnN0IHNjb3JlRGF0YVNvdXJjZSA9IGdyYXBocWxBcGkuYWRkTGFtYmRhRGF0YVNvdXJjZSgnU2NvcmVSZXNvbHZlckRhdGFTb3VyY2UnLCBzY29yZVJlc29sdmVyRnVuY3Rpb24pO1xuICAgIGNvbnN0IHVzZXJNYW5hZ2VtZW50RGF0YVNvdXJjZSA9IGdyYXBocWxBcGkuYWRkTGFtYmRhRGF0YVNvdXJjZSgnVXNlck1hbmFnZW1lbnREYXRhU291cmNlJywgdXNlck1hbmFnZW1lbnRSZXNvbHZlckZ1bmN0aW9uKTtcbiAgICBjb25zdCBjbGFzc1Njb3JlRGF0YVNvdXJjZSA9IGdyYXBocWxBcGkuYWRkTGFtYmRhRGF0YVNvdXJjZSgnQ2xhc3NTY29yZVJlc29sdmVyRGF0YVNvdXJjZScsIGNsYXNzU2NvcmVSZXNvbHZlckZ1bmN0aW9uKTtcbiAgICBjb25zdCBmaXRTaG93U2NvcmVEYXRhU291cmNlID0gZ3JhcGhxbEFwaS5hZGRMYW1iZGFEYXRhU291cmNlKCdGaXRTaG93U2NvcmVSZXNvbHZlckRhdGFTb3VyY2UnLCBmaXRTaG93U2NvcmVSZXNvbHZlckZ1bmN0aW9uKTtcblxuICAgIC8vIFJlc29sdmVyc1xuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2xpc3RDYXRzUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2xpc3RDYXRzJyxcbiAgICB9KTtcblxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldENhdFJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRDYXQnLFxuICAgIH0pO1xuXG4gICAgZGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZ2V0Q2F0QnlDYWdlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldENhdEJ5Q2FnZScsXG4gICAgfSk7XG5cbiAgICBkYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdjcmVhdGVDYXRSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnY3JlYXRlQ2F0JyxcbiAgICB9KTtcblxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ3VwZGF0ZVZvdGVzUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ3VwZGF0ZVZvdGVzJyxcbiAgICB9KTtcblxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ3VwZGF0ZUNhdFJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICd1cGRhdGVDYXQnLFxuICAgIH0pO1xuXG4gICAgZGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignbGlzdEVtYWlsc1Jlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdsaXN0RW1haWxzJyxcbiAgICB9KTtcblxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2FkZEVtYWlsUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2FkZEVtYWlsJyxcbiAgICB9KTtcblxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2RlbGV0ZUNhdFJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdkZWxldGVDYXQnLFxuICAgIH0pO1xuICAgIFxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldFZvdGluZ1N0YXR1c1Jlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRWb3RpbmdTdGF0dXMnLFxuICAgIH0pO1xuICAgIFxuICAgIGRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ3NldFZvdGluZ1N0YXR1c1Jlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdzZXRWb3RpbmdTdGF0dXMnLFxuICAgIH0pO1xuXG4gICAgLy8gU2NvcmUgUmVzb2x2ZXJzXG4gICAgc2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdnZXRTY29yZVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRTY29yZScsXG4gICAgfSk7XG5cbiAgICBzY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldFNjb3Jlc0J5Q2F0UmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldFNjb3Jlc0J5Q2F0JyxcbiAgICB9KTtcblxuICAgIHNjb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZ2V0U2NvcmVzQnlDYWdlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldFNjb3Jlc0J5Q2FnZScsXG4gICAgfSk7XG5cbiAgICBzY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2xpc3RBbGxTY29yZXNSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnbGlzdEFsbFNjb3JlcycsXG4gICAgfSk7XG5cbiAgICBzY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldFNjb3Jlc0J5SnVkZ2VSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0U2NvcmVzQnlKdWRnZScsXG4gICAgfSk7XG5cbiAgICBzY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2NyZWF0ZVNjb3JlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2NyZWF0ZVNjb3JlJyxcbiAgICB9KTtcblxuICAgIHNjb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcigndXBkYXRlU2NvcmVSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAndXBkYXRlU2NvcmUnLFxuICAgIH0pO1xuXG4gICAgc2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdmaW5hbGl6ZVNjb3JlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2ZpbmFsaXplU2NvcmUnLFxuICAgIH0pO1xuXG4gICAgc2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdnZXRTY29yZUF1ZGl0SGlzdG9yeVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRTY29yZUF1ZGl0SGlzdG9yeScsXG4gICAgfSk7XG5cbiAgICAvLyBVc2VyIE1hbmFnZW1lbnQgUmVzb2x2ZXJzXG4gICAgdXNlck1hbmFnZW1lbnREYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdjcmVhdGVKdWRnZUFjY291bnRSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnY3JlYXRlSnVkZ2VBY2NvdW50JyxcbiAgICB9KTtcblxuICAgIHVzZXJNYW5hZ2VtZW50RGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcigndXBkYXRlVXNlclJvbGVSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAndXBkYXRlVXNlclJvbGUnLFxuICAgIH0pO1xuXG4gICAgdXNlck1hbmFnZW1lbnREYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdsaXN0SnVkZ2VBY2NvdW50c1Jlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdsaXN0SnVkZ2VBY2NvdW50cycsXG4gICAgfSk7XG5cbiAgICB1c2VyTWFuYWdlbWVudERhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldEp1ZGdlQWNjb3VudFJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRKdWRnZUFjY291bnQnLFxuICAgIH0pO1xuXG4gICAgLy8gQ2xhc3MgU2NvcmUgUmVzb2x2ZXJzXG4gICAgY2xhc3NTY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldENsYXNzU2NvcmVSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0Q2xhc3NTY29yZScsXG4gICAgfSk7XG5cbiAgICBjbGFzc1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZ2V0Q2xhc3NTY29yZXNCeUNhdFJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRDbGFzc1Njb3Jlc0J5Q2F0JyxcbiAgICB9KTtcblxuICAgIGNsYXNzU2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdnZXRDbGFzc1Njb3Jlc0J5Q2FnZVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRDbGFzc1Njb3Jlc0J5Q2FnZScsXG4gICAgfSk7XG5cbiAgICBjbGFzc1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignbGlzdEFsbENsYXNzU2NvcmVzUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2xpc3RBbGxDbGFzc1Njb3JlcycsXG4gICAgfSk7XG5cbiAgICBjbGFzc1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZ2V0Q2xhc3NTY29yZXNCeUp1ZGdlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldENsYXNzU2NvcmVzQnlKdWRnZScsXG4gICAgfSk7XG5cbiAgICBjbGFzc1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignY3JlYXRlQ2xhc3NTY29yZVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdjcmVhdGVDbGFzc1Njb3JlJyxcbiAgICB9KTtcblxuICAgIGNsYXNzU2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCd1cGRhdGVDbGFzc1Njb3JlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ3VwZGF0ZUNsYXNzU2NvcmUnLFxuICAgIH0pO1xuXG4gICAgY2xhc3NTY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2ZpbmFsaXplQ2xhc3NTY29yZVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdmaW5hbGl6ZUNsYXNzU2NvcmUnLFxuICAgIH0pO1xuXG4gICAgY2xhc3NTY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldENsYXNzU2NvcmVBdWRpdEhpc3RvcnlSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0Q2xhc3NTY29yZUF1ZGl0SGlzdG9yeScsXG4gICAgfSk7XG5cbiAgICAvLyBGaXQgYW5kIFNob3cgU2NvcmUgUmVzb2x2ZXJzXG4gICAgZml0U2hvd1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZ2V0Rml0U2hvd1Njb3JlUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldEZpdFNob3dTY29yZScsXG4gICAgfSk7XG5cbiAgICBmaXRTaG93U2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdnZXRGaXRTaG93U2NvcmVzQnlDYXRSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0Rml0U2hvd1Njb3Jlc0J5Q2F0JyxcbiAgICB9KTtcblxuICAgIGZpdFNob3dTY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ2dldEZpdFNob3dTY29yZXNCeUNhZ2VSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0Rml0U2hvd1Njb3Jlc0J5Q2FnZScsXG4gICAgfSk7XG5cbiAgICBmaXRTaG93U2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdsaXN0QWxsRml0U2hvd1Njb3Jlc1Jlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdsaXN0QWxsRml0U2hvd1Njb3JlcycsXG4gICAgfSk7XG5cbiAgICBmaXRTaG93U2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdnZXRGaXRTaG93U2NvcmVzQnlKdWRnZVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRGaXRTaG93U2NvcmVzQnlKdWRnZScsXG4gICAgfSk7XG5cbiAgICBmaXRTaG93U2NvcmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdjcmVhdGVGaXRTaG93U2NvcmVSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnY3JlYXRlRml0U2hvd1Njb3JlJyxcbiAgICB9KTtcblxuICAgIGZpdFNob3dTY29yZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ3VwZGF0ZUZpdFNob3dTY29yZVJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICd1cGRhdGVGaXRTaG93U2NvcmUnLFxuICAgIH0pO1xuXG4gICAgZml0U2hvd1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZmluYWxpemVGaXRTaG93U2NvcmVSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZmluYWxpemVGaXRTaG93U2NvcmUnLFxuICAgIH0pO1xuXG4gICAgZml0U2hvd1Njb3JlRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignZ2V0Rml0U2hvd1Njb3JlQXVkaXRIaXN0b3J5UmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsXG4gICAgfSk7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIHdlYnNpdGVcbiAgICBjb25zdCB3ZWJzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnV2Vic2l0ZUJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBjYXQtdm90aW5nLXdlYnNpdGUtJHt0aGlzLmFjY291bnR9LSR7dGhpcy5yZWdpb259YCxcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICB3ZWJzaXRlRXJyb3JEb2N1bWVudDogJ2Vycm9yLmh0bWwnLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BQ0xTLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ1dlYnNpdGVEaXN0cmlidXRpb24nLCB7XG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICB9LFxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBEZXBsb3kgd2Vic2l0ZVxuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdXZWJzaXRlRGVwbG95bWVudCcsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQoJy4uL2J1aWxkJyldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHdlYnNpdGVCdWNrZXQsXG4gICAgICBkaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBleHBvcnROYW1lOiAnQ2F0Vm90aW5nVXNlclBvb2xJZCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZXhwb3J0TmFtZTogJ0NhdFZvdGluZ1VzZXJQb29sQ2xpZW50SWQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiBncmFwaHFsQXBpLmdyYXBocWxVcmwsXG4gICAgICBleHBvcnROYW1lOiAnQ2F0Vm90aW5nR3JhcGhRTEVuZHBvaW50JyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWb3RpbmdBcGlFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsLFxuICAgICAgZXhwb3J0TmFtZTogJ0NhdFZvdGluZ0FwaUVuZHBvaW50JyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlVXJsJywge1xuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxuICAgICAgZXhwb3J0TmFtZTogJ0NhdFZvdGluZ1dlYnNpdGVVcmwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0ZpdFNob3dTY29yaW5nVG9waWNBcm4nLCB7XG4gICAgICB2YWx1ZTogZml0U2hvd1Njb3JpbmdUb3BpYy50b3BpY0FybixcbiAgICAgIGV4cG9ydE5hbWU6ICdGaXRTaG93U2NvcmluZ1RvcGljQXJuJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaXRTaG93U2NvcmluZ0Rhc2hib2FyZFVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMucmVnaW9ufS5jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHt0aGlzLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7Zml0U2hvd0Rhc2hib2FyZC5kYXNoYm9hcmROYW1lfWAsXG4gICAgICBleHBvcnROYW1lOiAnRml0U2hvd1Njb3JpbmdEYXNoYm9hcmRVcmwnLFxuICAgIH0pO1xuICB9XG59Il19
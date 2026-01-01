import { AppSyncResolverEvent } from 'aws-lambda';
/**
 * Example resolver function showing how to integrate ScoreDataAccess
 * This would be integrated into the main resolver.ts file
 */
export declare const scoreResolverHandler: (event: AppSyncResolverEvent<any>) => Promise<import("./scoreDataAccess").Score | {
    items: import("./scoreDataAccess").Score[];
}>;

import { AppSyncResolverEvent } from 'aws-lambda';
export declare const handler: (event: AppSyncResolverEvent<any>) => Promise<import("./classScoreDataAccess").ClassScore | {
    items: import("./classScoreDataAccess").ClassScore[];
} | {
    items: import("./classScoreDataAccess").ClassScoreAuditEntry[];
} | null>;

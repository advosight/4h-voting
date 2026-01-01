import { AppSyncResolverEvent } from 'aws-lambda';
export declare const handler: (event: AppSyncResolverEvent<any>) => Promise<void | import("./fitShowScoreDataAccess").FitShowScore | {
    items: import("./fitShowScoreDataAccess").FitShowScore[];
} | {
    items: import("./fitShowScoreDataAccess").FitShowScoreAuditEntry[];
} | null>;

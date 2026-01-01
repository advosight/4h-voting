import { AppSyncResolverEvent } from 'aws-lambda';
export declare const handler: (event: AppSyncResolverEvent<any>) => Promise<import("./scoreDataAccess").Score | {
    items: import("./scoreDataAccess").Score[];
} | {
    items: import("./scoreDataAccess").ScoreAuditEntry[];
} | null>;

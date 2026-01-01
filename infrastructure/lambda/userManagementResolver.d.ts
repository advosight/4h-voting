import { AppSyncResolverEvent } from 'aws-lambda';
interface JudgeAccount {
    userId: string;
    email: string;
    name: string;
    judgeId: string;
    role: string;
    createdAt: string;
    isActive: boolean;
}
interface UserRoleUpdate {
    userId: string;
    email: string;
    role: string;
    updatedAt: string;
}
export declare const handler: (event: AppSyncResolverEvent<any>) => Promise<JudgeAccount | UserRoleUpdate | {
    items: JudgeAccount[];
} | null>;
export {};

import { AppSyncResolverEvent } from 'aws-lambda';
export declare const handler: (event: AppSyncResolverEvent<any>) => Promise<{
    items: {
        id: any;
        name: any;
        owner: any;
        votes: number;
        cageNumber: number;
        ownerAgeGroup: any;
        catAgeGroup: any;
    }[];
} | {
    id: any;
    name: any;
    owner: any;
    votes: number;
    cageNumber: number;
    ownerAgeGroup: any;
    catAgeGroup: any;
} | {
    items: {
        id: any;
        email: any;
        timestamp: any;
    }[];
} | {
    id: string;
    email: string;
    timestamp: string;
} | {
    id: string;
    name: any;
    owner: any;
    votes: any;
    cageNumber: any;
} | {
    isActive: any;
} | null>;

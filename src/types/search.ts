/**
 * Represents the condition of a listing.
 */
export enum Condition {
    New = 'new',
    Used = 'used',
}

import type { RequestLocations, RequestSort } from '@/types/requests';

/**
 * Represents the search criteria for a listing.
 */
export type SearchCriteria = {
    condition?: Condition;
    location?: RequestLocations;
    sort?: RequestSort;
};

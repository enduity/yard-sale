/**
 * Represents the condition of a listing.
 */
export enum Condition {
    New = 'new',
    Used = 'used',
}

/**
 * Represents the search criteria for a listing.
 */
export type SearchCriteria = {
    maxDaysListed?: 1 | 7 | 30;
    condition?: Condition;
};

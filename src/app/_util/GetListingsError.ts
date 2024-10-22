/**
 * Error for handled errors in fetching listings.
 * Needed to differentiate between expected and unexpected errors.
 */
export class GetListingsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GetListingsError';
    }
}

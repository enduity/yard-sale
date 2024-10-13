// noinspection SuspiciousTypeOfGuard

export enum RequestLocations {
    Tallinn = 'Tallinn',
    Harjumaa = 'Harjumaa',
    Tartu = 'Tartu',
    Parnu = 'Pärnu',
    Narva = 'Narva',
    Eesti = 'Eesti',
}

export enum RequestSort {
    PriceAsc = 'price_asc',
    PriceDesc = 'price_desc',
}

export type RequestOptions = {
    query: string;
    location: RequestLocations;
    minPrice?: number;
    maxPrice?: number;
    sort?: RequestSort;
    condition?: ('new' | 'used')[];
    maxDaysListed?: 1 | 7 | 30;
};

/**
 * Validates the request options and returns an array of invalid parameter names.
 *
 * @param options - Partial options to validate.
 * @returns Array of invalid parameter names. If the array is empty, all options are valid.
 */
function getInvalidOptionNames(options: Partial<RequestOptions>): string[] {
    const invalidParams: string[] = [];

    if (typeof options.query !== 'string' || options.query.length === 0) {
        invalidParams.push('query');
    }

    if (
        typeof options.location !== 'string' ||
        !Object.values(RequestLocations).includes(options.location)
    ) {
        invalidParams.push('location');
    }

    if (
        options.minPrice !== undefined &&
        (typeof options.minPrice !== 'number' || options.minPrice < 0)
    ) {
        invalidParams.push('minPrice');
    }

    if (
        options.maxPrice !== undefined &&
        (typeof options.maxPrice !== 'number' || options.maxPrice < 0)
    ) {
        invalidParams.push('maxPrice');
    }

    if (
        options.sort !== undefined &&
        (typeof options.sort !== 'string' ||
            !Object.values(RequestSort).includes(options.sort))
    ) {
        invalidParams.push('sort');
    }

    if (
        options.condition !== undefined &&
        (!Array.isArray(options.condition) ||
            !options.condition.every((c) => ['new', 'used'].includes(c)))
    ) {
        invalidParams.push('condition');
    }

    if (
        options.maxDaysListed !== undefined &&
        ![1, 7, 30].includes(options.maxDaysListed)
    ) {
        invalidParams.push('maxDaysListed');
    }

    return invalidParams;
}

/**
 * Checks if the provided options are valid `RequestOptions`.
 *
 * @param options - Partial options to validate.
 * @returns `true` if the options are valid `RequestOptions`, otherwise `false`.
 */
export function isValidRequestOptions(
    options: Partial<RequestOptions>,
): options is RequestOptions {
    return getInvalidOptionNames(options).length === 0;
}

/**
 * Finds the first invalid parameter in the provided options.
 *
 * @param options - Partial options to validate.
 * @returns The name of the first invalid parameter, or `null` if all parameters are valid.
 */
export function findFirstInvalidOption(options: Partial<RequestOptions>): string | null {
    const invalidParams = getInvalidOptionNames(options);
    return invalidParams.length > 0 ? invalidParams[0] : null;
}
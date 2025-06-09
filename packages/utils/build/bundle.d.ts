export declare function calcWinRate(wins: number, losses: number): number;

/**
 * Capitalizes each word in a string that could also be in snake case.
 */
export declare function capitalize(txt: string): string;

export declare const delay: (ms: number, callback?: () => void) => Promise<void>;

import type Country from "@qc/typescript/typings/Country";
export declare let COUNTRIES_MAP: Map<string, Country>;
export declare function getCountriesMap(cdnUrl: string, referer?: string): Promise<Map<string, Country>>;

declare class Logger {
    disableAll: boolean;
    constructor(disableAll: boolean);
    info(message: any, ...optionalParams: any[]): void;
    debug(message: any, ...optionalParams: any[]): void;
    warn(message: any, ...optionalParams: any[]): void;
    error(message: any, ...optionalParams: any[]): void;
}
declare const logger: Logger;
export { logger };

/**
 * Constraints:
 * - Valid email format.
 */
export declare function validateEmail(email: string): boolean;


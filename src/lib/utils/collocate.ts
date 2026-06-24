/**
 * Returns the correct Polish noun form based on a number.
 *
 * @param count - the number
 * @param one - form for 1 (e.g. "produkt")
 * @param few - form for 2-4 (e.g. "produkty")
 * @param many - form for 5+ and 0 (e.g. "produktów")
 */
export function collocatePl(
    count: number,
    one: string,
    few: string,
    many: string
): string {
    const abs = Math.abs(count);

    // Handle teens (11–14)
    const lastTwo = abs % 100;
    if (lastTwo >= 11 && lastTwo <= 14) {
        return many;
    }

    const last = abs % 10;

    if (last === 1) {
        return one;
    }

    if (last >= 2 && last <= 4) {
        return few;
    }

    return many;
}
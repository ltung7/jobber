function joinList(
    items: string[],
    finalSeparator: string = 'lub'
): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${finalSeparator} ${items[1]}`;

    const head = items.slice(0, -1).join(', ');
    const tail = items[items.length - 1];
    return `${head} ${finalSeparator} ${tail}`;
}

export default joinList;
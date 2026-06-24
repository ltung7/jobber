const formatUah = (value : number) => {
    const uahFormatter = new Intl.NumberFormat('uk', { style: 'currency', currency: 'UAH', });
    return uahFormatter.format(value);
}

const formatEur = (value : number) => {
    const eurFormatter = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR', });
    return eurFormatter.format(value);
}

const formatPln = (value : number) => {
    const eurFormatter = new Intl.NumberFormat('pl', { style: 'currency', currency: 'PLN', });
    return eurFormatter.format(value);
}

export const formatCurrency = (value : number, currency : string = 'PLN', locale : string = 'pl') => {
    if (currency === 'UAH') return formatUah(value);
    else {
        const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
        return formatter.format(value);
    }
}

export const inOutCurrency = (inCurrency : string, outCurrency : string, inLocale : string = 'pl', outLocale : string = 'pl') => {
    return {
        in: new Intl.NumberFormat(inLocale, { style: 'currency', currency: inCurrency }),
        out: new Intl.NumberFormat(outLocale, { style: 'currency', currency: outCurrency })
    }
}

export const format = {
    uah: formatUah,
    eur: formatEur,
    pln: formatPln
}
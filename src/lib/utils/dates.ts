import type { StatusBar } from "$lib/server/services/firestatus.service";
import dayjs from "dayjs";

type DatesRangeType = {
    from: string,
    to: string,
    diff?: number,
    compareFrom?: string,
    compareTo?: string
}

export const getDatesFromUrl = (url : URL) => {
    const dates : DatesRangeType = { from: '', to: '' }
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    if (fromParam) dates.from = fromParam;
    if (toParam) dates.to = toParam;
    return defaultDates(dates);
}

export const defaultDates = (dates : DatesRangeType|number, days = 7) => {
    const datesRange : DatesRangeType = { from: '', to: '' }
    if (typeof dates === 'number') {
        days = dates;
        dates = datesRange;
    }
    if (dates.from) datesRange.from = dates.from;
    else datesRange.from = dayjs(Date.now() - days * 86400000).format('YYYY-MM-DD');
    if (dates.to) datesRange.to = dates.to;
    else datesRange.to = dayjs(Date.now() - 86400000).format('YYYY-MM-DD');
    return datesRange;
}

export const getComparable = (dates : DatesRangeType) => {
    const from = dayjs(dates.from)
    const to = dayjs(dates.to);
    dates.diff = to.diff(from, 'days') + 1;
    dates.compareFrom = from.subtract(dates.diff, 'days').format('YYYY-MM-DD');
    dates.compareTo = to.subtract(dates.diff, 'days').format('YYYY-MM-DD');

    return dates;
}

export const dateDiff = (from : dayjs.ConfigType, to : dayjs.ConfigType) => dayjs(to).diff(dayjs(from), 'days');

export const loopThroughDates = async (from: dayjs.ConfigType, to: dayjs.ConfigType, callback: (_date: string) => Promise<any>, status?: StatusBar) => {
    let cursorDate = dayjs(from);
    const endDate = dayjs(to);
    if (status) {
        status.data.maxValue = endDate.diff(from, 'days');
    }

    do {
        const date = cursorDate.format('YYYY-MM-DD');
        if (status && status.data.currentTaskName) {
            status.setTaskName(status.data.currentTaskName + date);
        }
        await callback(date);
        cursorDate = cursorDate.add(1, 'day');
        if (status) status.increase();
    } while (cursorDate <= endDate)

    if (status) status.clean()
}

export const getLastMonth = () => {
    const startOfMonth = dayjs().subtract(1, 'month').startOf('month');
    const dates : DatesRangeType = { 
        from: startOfMonth.format('YYYY-MM-DD'), 
        to: startOfMonth.endOf('month').format('YYYY-MM-DD')
    }
    return dates;
}

export const getDatesRange = (from : dayjs.ConfigType, to : dayjs.ConfigType) => {
    let cursorDate = dayjs(from);
    const endDate = dayjs(to);
    if (endDate < cursorDate) throw new Error('End date cant be before start date');
    const dates = [];
    do {
        dates.push(cursorDate.format('YYYY-MM-DD'));
        cursorDate = cursorDate.add(1, 'day');
    } while (cursorDate <= endDate);
    return dates;
}

export const maxDateRange = (dates : DatesRangeType, maxRange : number = 32) => {
    const from = dayjs(dates.from);
    const to = dayjs(dates.to);
    const diff = to.diff(from, 'days');
    if (diff > maxRange) dates.from = to.subtract(maxRange, 'days').format('YYYY-MM-DD');
    return dates;
}
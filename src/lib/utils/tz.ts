import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone  from 'dayjs/plugin/timezone';

type DayJsArgument = string | number | Date | dayjs.Dayjs | null | undefined;

dayjs.extend(utc);
dayjs.extend(timezone);

export const formatTimezone = (timestamp: DayJsArgument, timezoneName = "Europe/Warsaw", format = 'DD.MM.YYYY HH:mm') => dayjs.tz(timestamp, timezoneName).format(format);
export const ukTimezone = (timestamp: DayJsArgument) => formatTimezone(timestamp, 'EET', 'DD.MM.YYYY HH:mm:ss');
export const plTimezone = (timestamp: DayJsArgument = Date.now()) => formatTimezone(timestamp, "Europe/Warsaw", 'DD.MM.YYYY HH:mm');
export const plDate = (timestamp: DayJsArgument) => formatTimezone(timestamp, "Europe/Warsaw", 'DD.MM.YYYY');

export const optionalTimestamp = (timestamp: DayJsArgument|false) => {
    if (timestamp) {
        return plTimezone(timestamp);
    } else {
        return '-';
    }
}

export default plTimezone;

export const daytz = (value: DayJsArgument, timezone = "Europe/Warsaw") => dayjs.tz(value, timezone);
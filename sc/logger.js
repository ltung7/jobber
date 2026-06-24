import { AxiosError } from 'axios';
import util from 'util';

export const LOGGER_COLORS = {
    RED: '\x1b[31m%s\x1b[0m',
    GREEN: '\x1b[32m%s\x1b[0m',
    YELLOW: '\x1b[33m%s\x1b[0m',
    BLUE: '\x1b[34m%s\x1b[0m',
    MAGENTA: '\x1b[35m%s\x1b[0m',
    CYAN: '\x1b[36m%s\x1b[0m',
    WHITE: '\x1b[37m%s\x1b[0m',
    GRAY: '\x1b[30m%s\x1b[0m',
    UNDERLINE: '\x1b[52m%s\x1b[0m',
}

const logColor = (text, color = LOGGER_COLORS.BLUE) => {
    console.log(color, text);
}

const inspect = (data) => console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));

export const logger = {
    log: logColor,
    gray: (text) => logColor(text, LOGGER_COLORS.GRAY),
    success: (text) => logColor(text, LOGGER_COLORS.GREEN),
    warn: (text) => logColor(text, LOGGER_COLORS.YELLOW),
    error: (err, inspectItem = null) => {
        if (err instanceof AxiosError) {
            console.log('\x1b[35m%s\x1b[0m', 'Axios error: ');
            console.log(err.response.data)
        } else if (err instanceof Error) {
            const text = 'Error: ' + err.message;
            logColor(text, LOGGER_COLORS.RED)
            if (err.stack.indexOf('\n') > 0) logColor(err.stack.split("\n")[1].trim(), LOGGER_COLORS.RED)
        } else logColor('Error: ' + (err.message ?? err), LOGGER_COLORS.RED)
    if (inspectItem) inspect(inspectItem);
    },
    inspect,
    silent: () => null,
}
import util from 'util';

export default (data: ExplicitAnyToExtend, fmt = '\x1b[36m%s\x1b[0m') => {
    if (typeof data === 'string') console.log(fmt, data);
    else console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));
}
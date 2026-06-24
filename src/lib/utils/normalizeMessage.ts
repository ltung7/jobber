const normalizeMessage = (str: string) => str
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default normalizeMessage;
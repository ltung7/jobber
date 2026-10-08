import xlsxJsStyle from 'xlsx-js-style'

export type XlsxAoaCell = string|number|{
    v: string | number;
    t: string;
    s?: ExplicitAnyToExtend;
}

export type XlsxAoaData = XlsxAoaCell[][];

const borderStyle = { style: 'thin', color: { rgb: '000000' } };
const border = { top: borderStyle, left: borderStyle, right: borderStyle, bottom: borderStyle };
const borderThickTop = { top: { style: 'thick', color: { rgb: '000000' } }, left: borderStyle, right: borderStyle, bottom: borderStyle };
const bordered = { border };
const numbers = { border, numFmt: '0.00', alignment: { horizontal: 'right' } };
const centered = { border, alignment: { horizontal: 'center', wrapText: true } };
const centeredBorderless = { alignment: { horizontal: 'center', wrapText: true } };
const bigHeader = { alignment: { horizontal: 'left' }, font: { bold: true, sz: 18 } };
const redHeader = { border, alignment: { horizontal: 'center', wrapText: true }, font: { bold: true, sz: 13 }, fill: { fgColor: { rgb: "FF9999" } } };
const header = { border, alignment: { horizontal: 'center', wrapText: true }, font: { bold: true } };
const right = { alignment: { horizontal: 'right', wrapText: true } };
const bigCentered = { border, alignment: { vertical: 'center', horizontal: 'center', wrapText: true }, font: { bold: true, sz: 16 } };
const wrapped = { border, alignment: { vertical: 'center', wrapText: true } };
const summary = { border: borderThickTop, numFmt: '0.00', alignment: { horizontal: 'right' }, font: { bold: true, sz: 13 } }

const styles: Record<string,ExplicitAnyToExtend> = {
    bordered,
    centered, 
    header,
    bigHeader,
    numbers,
    redHeader,
    right,
    bigCentered,
    wrapped,
    summary,
    centeredBorderless
}

export const cellStyles = {
    bordered: 'bordered',
    centered: 'centered', 
    header: 'header',
    bigHeader: 'bigHeader',
    numbers: 'numbers',
    redHeader: 'redHeader',
    number: 'numbers',
    right: 'right',
    bigCentered: 'bigCentered',
    wrapped: 'wrapped',
    summary: 'summary',
    centeredBorderless: 'centeredBorderless'
}

export const getBorderedNumber = (number: number, numFmt = '0.00') => ({
    v: number,
    t: 'n',
    s: { border, numFmt, alignment: { horizontal: 'right' } }
});

export const getStyledCell = (text: string | number, style = 'centered'): XlsxAoaCell => ({ v: text ?? '', t: typeof text === 'number' ? 'n' : 's', s: styles[style] ?? centered })


export const setColWidth = (worksheet: xlsxJsStyle.WorkSheet, sizes: number[]) => {
    worksheet['!cols'] = sizes.map(element => ({ wch: element }));
    return worksheet;
}

export const merge = (ws: xlsxJsStyle.WorkSheet, a1range: string) => {
    if (!ws['!merges']) ws['!merges'] = [];
    const [ start, end ] = a1range.split(':');
    const startCell = start.match(/([A-Z])([0-9]+)/);
    const endCell = end.match(/([A-Z])([0-9]+)/);
    if (!startCell || !endCell) throw new Error('Invalid range: ' + a1range)
    const startIndex = startCell[1].charCodeAt(0) - 65;
    const endIndex = endCell[1].charCodeAt(0) - 65;
    
    const merger = {
        s: {
            c: startIndex,
            r: parseInt(startCell[2]) - 1
        },
        e: {
            c: endIndex,
            r: parseInt(endCell[2]) - 1
        }
    }
    ws['!merges'].push(merger);
}
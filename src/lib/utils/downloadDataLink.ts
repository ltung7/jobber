export const downloadPdfBlob = (contents: ExplicitAnyToExtend, filename : string) => {
    const binary = atob(contents);
    const len = binary.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
    }
    
    const pdfBlob = new Blob([ view ], { type: 'application/pdf' });
    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(pdfBlob);
    downloadLink.download = filename + '.pdf';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
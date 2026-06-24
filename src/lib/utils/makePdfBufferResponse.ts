const makeResponse = (buffer: Buffer, filename: string = Date.now().toString()) => {
    return new Response(buffer as BufferSource, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        }
    })
}

export default makeResponse;
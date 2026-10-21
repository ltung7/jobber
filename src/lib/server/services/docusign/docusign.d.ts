type TupleToIntersection<T extends any[]> = T extends [infer Head, ...infer Tail]
    ? Head & TupleToIntersection<Tail>
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    : {};

export type DocusignWebhookEvent<T extends any[] = []> = {
    event: string
    apiVersion: string
    uri: string
    retryCount: number
    configurationId: number
    generatedDateTime: string
    data: {
        accountId: string
        userId: string
        envelopeId: string
        envelopeSummary: {
            status: string
            documentsUri: string
            recipientsUri: string
            attachmentsUri: string
            envelopeUri: string
            emailSubject: string
            envelopeId: string
            signingLocation: string
            customFieldsUri: string
            notificationUri: string
            enableWetSign: string
            allowMarkup: string
            allowReassign: string
            createdDateTime: string
            lastModifiedDateTime: string
            deliveredDateTime: string
            initialSentDateTime: string
            sentDateTime: string
            completedDateTime: string
            statusChangedDateTime: string
            documentsCombinedUri: string
            certificateUri: string
            templatesUri: string
            expireEnabled: string
            expireDateTime: string
            expireAfter: string
            sender: {
                userName: string
                userId: string
                accountId: string
                email: string
                ipAddress: string
            }
            purgeState: string
            envelopeIdStamping: string
            is21CFRPart11: string
            signerCanSignOnMobile: string
            autoNavigation: string
            isSignatureProviderEnvelope: string
            uSigState: string
            hasFormDataChanged: string
            allowComments: string
            hasComments: string
            allowViewHistory: string
            envelopeMetadata: {
                allowAdvancedCorrect: string
                enableSignWithNotary: string
                allowCorrect: string
            }
            anySigner: any
            envelopeLocation: string
            isDynamicEnvelope: string
            burnDefaultTabData: string
            isTicketRelatedEnvelope: string
        } & TupleToIntersection<T>
    }
}

export type EventCustomFields = {
    customFields: {
        textCustomFields: Array<{
            fieldId: string
            name: string
            show: string
            required: string
            value: string
        }>
        listCustomFields: Array<any>
    }
}

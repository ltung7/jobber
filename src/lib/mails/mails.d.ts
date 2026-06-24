/// <reference types="@sveltejs/kit" />

declare module '$lib/mails/*Mail.svelte' {
    export function render(any: ExplicitAnyToExtend): Mail.RenderedComponent;
};

namespace Mail {
    interface MailComponent {
        render(args: ExplicitAnyToExtend): RenderedComponent;
    }

    interface RenderedComponent {
        html: string,
        head: string,
        css: { code: unknown, map: unknown }
    }

    interface ShopBranding {
        logo: string;
    };

    type Attachment = NonNullable<nodemailer.SendMailOptions['attachments']>[number];

    interface QueuedMail {
        id: string;
        encryptedTo: string;
        subject: string;
        html: string;
        account: string;
        timestamp: number;
        sent: boolean;
        attempts: number;
        args?: Record<string, any>;
        attachments?: Attachment[];
    };

    interface EnqueueCustomerMailBaseParams {
        to: string;
        account: string;
        branding?: Mail.ShopBranding; // optional logo etc.
        attachments?: Mail.Attachment[];
    };
}


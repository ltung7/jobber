import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';
import { render } from 'svelte/server';
import type { Component } from 'svelte';
import { logger, thrower } from '$lib/utils/logger';
import NotificationMail from '$lib/mails/NotificationMail.svelte';

const config = {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
};

const from = {
    name: env.EMAIL_FROM,
    address: env.SMTP_USERNAME,
};

const transport = nodemailer.createTransport(config);

const LOGO_ATTACHMENT: Mail.Attachment = {
    filename: 'lplogo.png',
    path: 'https://eisg.pl/wp-content/uploads/2015/12/eisg_logo.png',
    cid: 'logo@eisg.pl',
};

const stripHtml = (html: string) => html.replace(/<\/?[^>]+(>|$)/g, '');
const stripTags = (head: string) => head.replace(/(<([^>]+)>)/gi, '');

export const sendEmail = async (
    to: string,
    subject: string,
    html: string,
    attach: (string | Mail.Attachment)[] | null = null,
    skipRender = false
) => {
    const msg: nodemailer.SendMailOptions = { from, to, subject, html };

    if (attach) {
        msg.attachments = attach.map((a) =>
            typeof a === 'string' ? { filename: a, path: '/tmp/' + a } : a
        );
    }

    if (!skipRender) {
        if (!msg.attachments) msg.attachments = [];
        msg.attachments.push(LOGO_ATTACHMENT);
        const { body: rendered } = render(NotificationMail, { props: { title: subject, html } });
        msg.html = rendered;
    }

    try {
        await transport.sendMail(msg);
    } catch (err: unknown) {
        logger.error(err);
    }
};

const sendMailUsingSMTP = async (
    to: string[],
    options: nodemailer.SendMailOptions,
    logEventArgs: string|Record<string,any> = {}
) => {
    options.from = from;
    for (const address of to) {
        options.to = address;
        await transport.sendMail(options);
    }
};

export const sendRenderedEmail = async <T extends Record<string, ExplicitAnyToExtend>>(
    to: string | string[],
    component: Component<T>,
    args: T,
    options: nodemailer.SendMailOptions = {}
) => {
    if (!to) {
        logger.error('Mail without recipient');
    }

    let body: string, head: string;

    try {
        ({ body, head } = render(component as Component<Omit<T, 'logo'>>, { props: args }));
    } catch (err: unknown) {
        thrower.slack(err, 'Failed to render mail content');
        return;
    }

    options.from = from;
    options.html = body;
    options.text = stripHtml(body);
    options.subject = stripTags(head);
    options.attachments = [
        ...(options.attachments ?? []),
        LOGO_ATTACHMENT,
        ...(args.attach ?? []).map((a: string | Mail.Attachment) =>
            typeof a === 'string' ? { filename: a, path: '/tmp/' + a } : a
        ),
    ];

    const recipients = Array.isArray(to) ? to : [ to ];

    try {
        await sendMailUsingSMTP(recipients, options);
    } catch (err: unknown) {
        thrower.slack(err, `SMTP error for subject ${options.subject}`);
    }
};

export const sendTestMail = async (to: string) => {
  const options: nodemailer.SendMailOptions = {
    subject: 'Test Email',
    text: 'This is a test email body.',
    html: '<p>This is a test email body.</p>',
    attachments: []
  };
  await sendMailUsingSMTP([ to ], options, { test: true });
};
import type { RequestEvent } from './$types';
import FeedbackMail from '$lib/mails/FeedbackMail.svelte';
import { sendRenderedEmail } from '$lib/mails/mailer';
import { slackError } from '$lib/server/services/slack.service';
import {  json } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
    const contents: FeedbackData = await request.json();
    contents.timestamp = Date.now();
    await slackError(sendRenderedEmail(
        'tomasz.le@finnergroup.com',
        FeedbackMail,
        { contents },
        { replyTo: contents.email }
    ))
    return json({ success: true });
}
<script lang="ts">
	import dayjs from 'dayjs';
	import MailWrapper from './MailWrapper.svelte';
	import { env } from '$env/dynamic/public';
	import { untrack } from 'svelte';

	interface Props {
		logo?: string;
		contents: FeedbackData;
	}

	let { logo, contents }: Props = $props();
	const title = untrack(() => `Jobber feedback od użytkownika ${contents.email} (${contents.timestamp})`);
</script>

<MailWrapper {logo} {title} footer>
	<p style="font-weight: 800">Treść</p>
	<p style="font-size: 14px;">{contents.message}</p>
	<p style="text-align: right"><b>{contents.email}</b></p>
	<p style="text-align: right; font-size: 11px;">{dayjs(contents.timestamp).format('DD/MM/YYYY HH:mm:ss')}</p>
	<hr />
	<p style="font-size: 11px; margin-bottom: 0">Przeglądarka: {contents.browser} ({contents.width}px)</p>
	<p style="font-size: 11px; margin-bottom: 0; margin-top: 0">Platforma: {contents.platform}</p>
	{#if contents.view}
		<p style="font-size: 11px; margin-bottom: 0; margin-top: 0">Widok: {contents.view}</p>
	{/if}
	<p style="font-size: 11px; margin-bottom: 0; margin-top: 0">
		Wersja: {contents.version}
		{#if env.PUBLIC_APP_VER !== contents.version}(Najnowsza: <strong>{env.PUBLIC_APP_VER}</strong>){/if}
	</p>
</MailWrapper>

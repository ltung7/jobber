import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Toast = {
	id: string;
	msg: string;
	type: string;
	title: string | null;
}

export const toasts = writable([] as Toast[]);
let previousMessage: string | null = null;
export let lastMessage: string | null = null;

export function addToast(msg: string, type: string = 'danger', title: string | null = null, removeAfter = 10000) {
	if (!browser || !msg || msg === previousMessage) return;
	const id = new Date().valueOf() + msg;
	toasts.update((all) => [
		{
			id,
			msg,
			type,
			title
		},
		...all
	]);

	// 3. set timeout for the removal of the toast after some time
	setTimeout(() => {
		removeToast(id);
	}, removeAfter);
	
	previousMessage = msg;
	lastMessage = msg;
	setTimeout(() => {
		if (previousMessage === msg) previousMessage = null;
	}, 5000);
	// 4. return the unique identifier
	return id;
}

export function removeToast(id: string) {
	toasts.update((all) => all.filter((toast) => toast.id !== id));
}

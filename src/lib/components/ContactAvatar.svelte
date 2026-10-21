<script lang="ts">
	interface Props {
		/** Full name used to derive initials and the color palette. */
		name: string;
		/** Avatar diameter in pixels. Defaults to 36px. */
		size?: number;
	}

	let { name, size = 36 }: Props = $props();

	// Deterministic color palettes so the same name always renders the same avatar color.
	const AVATAR_PALETTES = [
		{ bg: '#dbeafe', text: '#1d4ed8' }, // Blue
		{ bg: '#f3e8ff', text: '#7e22ce' }, // Purple
		{ bg: '#d1fae5', text: '#047857' }, // Emerald
		{ bg: '#fef3c7', text: '#b45309' }, // Amber
		{ bg: '#fee2e2', text: '#b91c1c' }, // Rose
		{ bg: '#e0e7ff', text: '#4338ca' }, // Indigo
		{ bg: '#ccfbf1', text: '#0f766e' } // Teal
	];

	function getInitials(fullName: string): string {
		if (!fullName) return '??';
		const parts = fullName.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	function getAvatarPalette(fullName: string) {
		let hash = 0;
		for (let i = 0; i < fullName.length; i++) {
			hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
		}
		return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
	}

	const palette = $derived(getAvatarPalette(name || ''));
	const initials = $derived(getInitials(name || ''));
</script>

<div
	class="contact-avatar-circle shadow-xs"
	style:width="{size}px"
	style:height="{size}px"
	style:background-color={palette.bg}
	style:color={palette.text}
	title={name || undefined}
>
	{initials}
</div>

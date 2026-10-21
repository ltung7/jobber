<script lang="ts">
	import type { Snippet } from 'svelte';
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		/** Right-side badge label (e.g. "BITRIX"). */
		badgeText?: string;
		/** Right-side badge color token (e.g. "purple", "primary", "success", "danger", "warning", "info", "secondary", "dark"). */
		badgeColor?: string;
		/** Subtitle rendered under the static EISG brand. */
		subtitle?: string;
		/** Controls rendered after the static "Generator" back link. */
		children?: Snippet;
	}

	// Badge color tokens mapped to Bootstrap color classes.
	const BADGE_CLASSES: Record<string, string> = {
		purple: 'bg-purple-subtle text-purple',
		primary: 'bg-primary-subtle text-primary',
		success: 'bg-success-subtle text-success',
		danger: 'bg-danger-subtle text-danger',
		warning: 'bg-warning-subtle text-warning',
		info: 'bg-info-subtle text-info',
		secondary: 'bg-secondary-subtle text-secondary',
		dark: 'bg-dark-subtle text-dark'
	};

	let {
		badgeText = 'BITRIX',
		badgeColor = 'purple',
		subtitle = 'Analytics Engine',
		children
	}: Props = $props();

	const badgeClass = $derived(BADGE_CLASSES[badgeColor] ?? BADGE_CLASSES.purple);
</script>

<header class="app-topbar px-4 py-2 bg-white border-bottom shadow-xs">
	<div class="container-fluid px-0 d-flex flex-wrap align-items-center justify-content-between gap-3">
		<!-- Brand -->
		<div class="d-flex align-items-center gap-3">
			<div class="brand-icon-box shadow-xs">
				<UIcon name="bolt" size="5" class="text-white" />
			</div>
			<div>
				<div class="d-flex align-items-center gap-2">
					<span class="fw-bolder fs-5 tracking-tight text-slate-900">EISG</span>
					<span class="badge rounded-pill {badgeClass} fw-semibold px-2 py-0.5 text-xs">{badgeText}</span>
				</div>
				<div class="text-secondary small line-height-1">{subtitle}</div>
			</div>
		</div>

		<!-- Header Quick Controls & Status -->
		<div class="d-flex align-items-center flex-wrap gap-3">
			<a href="/" class="btn btn-outline-secondary btn-sm rounded-pill px-3 py-1 text-xs fw-semibold d-inline-flex align-items-center gap-1 shadow-xs">
				<UIcon name="arrow-left" size="6" />
				<span>Generator</span>
			</a>

			{@render children?.()}
		</div>
	</div>
</header>

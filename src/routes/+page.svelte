<script lang="ts">
	import EditOfferModal from '$lib/components/EditOfferModal.svelte';
	import FeedBackRequestView from '$lib/components/FeedBackRequestView.svelte';
	import OfferArchivedList from '$lib/components/OfferArchivedList.svelte';
	import OfferCandidates from '$lib/components/OfferCandidates.svelte';
	import OfferGeneratorViewGenerator from '$lib/components/OfferGeneratorViewGenerator.svelte';
	import OfferPreviewModal from '$lib/components/OfferPreviewModal.svelte';
	import OfferSavedList from '$lib/components/OfferSavedList.svelte';
	import OfferSettings from '$lib/components/OfferSettings.svelte';
	import OfferSidebar from '$lib/components/OfferSidebar.svelte';
	import { confirmSuccess, internal } from '$lib/nav/internal';
	import { addToast } from '$lib/toast';
	import Toasts from '$lib/toast/Toasts.svelte';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	let savedOffers: SavedOffer[] = $state([]);
	let archivedOffers: ArchiveEntry[] = $state([]);

	let activeView = $state<View>('generator');
	let previousView = $state<View>('generator');
	let previewData = $state<JobFormData | SavedOffer | null>(null);

	let showPreviewModal = $state(false);
	let showEditModal = $state(false);
	let showCandidateModal = $state(false);

	let editingOffer = $state<SavedOffer | null>(null);
	let candidateOffer = $state<SavedOffer | null>(null);
	let loadedArchive = $state(false);

	let settings = $state<Settings>({ sheetsId: '', sheetsKey: '' });

	async function setSaved(item: SavedOffer) {
		if (item.id.length) {
			const response = await confirmSuccess(internal.postApi(item, 'patch'));
			if (response.id) {
				const index = savedOffers.findIndex((offer) => offer.id === item.id);
				if (index >= 0) savedOffers[index] = item;
			}
		} else {
			const response = await confirmSuccess(internal.postApi(item));
			if (response.id) item.id = response.id;
			savedOffers.unshift(item);
		}
	}

	onMount(async () => {
		settings.sheetsId = typeof localStorage !== 'undefined' ? localStorage.getItem('eisg_sheets_id') || '' : '';
		settings.sheetsKey = typeof localStorage !== 'undefined' ? localStorage.getItem('eisg_sheets_key') || '' : '';

		const response = await internal.getApi();
		if (response.offers) savedOffers = response.offers;
	});

	function doSave(d: JobFormData) {
		if (d.offerRef && savedOffers.find((o) => o.offerRef === d.offerRef)) {
			addToast('Oferta z tym nr ref. już istnieje w zapisanych.', 'info');
			return;
		}
		const offer: SavedOffer = { ...d, id: '', savedAt: new Date().toISOString(), candidates: [] };
		setSaved(offer);
	}

	// ─── Offer actions ────────────────────────────────────────────────────────

	function openPreviewForm(form: JobFormData) {
		previewData = form;
		showPreviewModal = true;
	}

	function openEdit(id: string) {
		const offer = savedOffers.find((o) => o.id === id);
		if (!offer) return;
		editingOffer = { ...offer };
		showEditModal = true;
	}

	function saveEdit() {
		if (!editingOffer) return;
		setSaved(editingOffer);
		showEditModal = false;
	}

	async function recoverArchive(id: string) {
		const response = await internal.del('archive', { id });
		if (response.offer) {
			archivedOffers = archivedOffers.filter(item => item.id !== id);
			savedOffers.push(response.offer)
		}
	}

	function previewSaved(id: string) {
		const offer = savedOffers.find((o) => o.id === id);
		if (!offer) return;
		previewData = offer as JobFormData;
		showPreviewModal = true;
	}

	function openCandidates(id: string) {
		const offer = savedOffers.find((item) => item.id === id);
		if (!offer) return;
		candidateOffer = offer;
		showCandidateModal = true;
	}

	async function navigateTo(view: View) {
		previousView = activeView;
		activeView = view;
		if (view === 'archive' && !loadedArchive) {
			const response: { archives: ArchiveEntry[] } = await internal.get('archive');
			if (response.archives) {
				const existingIds = new Set(archivedOffers.map((o) => o.id));
				archivedOffers = archivedOffers.concat(response.archives.filter((o) => !existingIds.has(o.id))).sort((a, b) => (b.createdAt ?? b.availableFrom).localeCompare(a.createdAt ?? a.availableFrom));
			}
			loadedArchive = true;
		}
	}

	async function archivePreview(previewData: JobFormData | SavedOffer) {
		if ('id' in previewData) {
			const savedOffer = previewData;
			const response = await internal.patch('archive', savedOffer);
			if (response.success) {
				savedOffers = savedOffers.filter((item) => item.id !== savedOffer.id);
				archivedOffers.unshift({ ...savedOffer, createdAt: new Date().toISOString(), langs: Object.keys(previewData.lang).join(',').toUpperCase() });
			}
			return;
		}

		const response = await internal.post('archive', previewData);
		if (response.id) {
			const archived: ArchiveEntry = { ...previewData, id: response.id, langs: Object.keys(previewData.lang).join(',').toUpperCase(), createdAt: new Date().toISOString(), candidates: [], savedAt: new Date().toISOString() };
			archivedOffers.unshift(archived);
		}
	}
</script>

<!-- CDN scripts injected at mount time via Svelte action or head tag in parent -->
<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
	<title>EISG. Generator Ofert Pracy</title>
</svelte:head>

<Toasts />

<!-- ─── APP SHELL ─────────────────────────────────────────────────────── -->
<div class="app-grid">
	<!-- Topbar -->
	<header class="topbar">
		<div class="topbar-logo">
			<img title="EISG" alt="EISG" src="https://eisg.pl/wp-content/uploads/2015/12/eisg_logo.png" />
		</div>
		<div class="topbar-divider"></div>
		<div class="topbar-sub d-flex justify-content-between align-items-center w-100">
			<h4 class="mb-0 fw-bolder text-dark">Generator Ofert Pracy</h4>
			<div class="small text-secondary">({env.PUBLIC_APP_VER})</div>
		</div>
	</header>

	<!-- Sidebar -->
	<OfferSidebar {activeView} {navigateTo} archivedOffersCount={archivedOffers.length} savedOffersCount={savedOffers.length} {loadedArchive} />

	<!-- Main area -->
	<main class="main-area">
		<!-- ─── VIEW: GENERATOR ─── -->
		{#if activeView === 'generator'}
			<OfferGeneratorViewGenerator {doSave} {openPreviewForm} />
		{/if}

		<!-- ─── VIEW: SAVED ─── -->
		{#if activeView === 'saved'}
			<OfferSavedList {savedOffers} {openEdit} {previewSaved} {openCandidates} {archivePreview} />
		{/if}

		<!-- ─── VIEW: ARCHIVE ─── -->
		{#if activeView === 'archive'}
			<OfferArchivedList {archivedOffers} {recoverArchive} />
		{/if}

		{#if activeView === 'feedback'}
			<FeedBackRequestView view={previousView} />
		{/if}

		<!-- ─── VIEW: SETTINGS ─── -->
		{#if activeView === 'settings'}
			<OfferSettings bind:settings />
		{/if}
	</main>
</div>

<!-- ─── PREVIEW MODAL ─────────────────────────────────────────────────── -->
{#if showPreviewModal && previewData}
	<OfferPreviewModal bind:showPreviewModal {previewData} {doSave} {archivePreview} />
{/if}

<!-- ─── EDIT MODAL ────────────────────────────────────────────────────── -->

{#if showEditModal && editingOffer}
	<EditOfferModal {editingOffer} close={() => (showEditModal = false)} save={saveEdit} {openPreviewForm} />
{/if}

<!-- ─── CANDIDATES MODAL ───────────────────────────────────────────────── -->
{#if showCandidateModal && candidateOffer}
	<OfferCandidates bind:showCandidateModal offer={candidateOffer} {setSaved} />
{/if}

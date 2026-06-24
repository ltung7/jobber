<script>
    import { flip } from "svelte/animate";
    import Toast from "./Toast.svelte";
    import { toasts } from "./store";
	import { fly } from "svelte/transition";
  </script>

<div aria-live="polite" aria-atomic="true" class="position-relative">
    <div class="toast-container position-fixed top-0 end-0 px-3 pt-5 mt-5" id="toastContainer">
        {#each $toasts as toast (toast.id)}
            <div animate:flip in:fly={{ y: -25 }} out:fly={{ x: 100 }}>
                <Toast {toast} />
            </div>
        {/each}
    </div>
</div>
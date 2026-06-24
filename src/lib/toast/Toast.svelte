<script lang="ts">
    /* eslint svelte/no-at-html-tags: "off" */
    import { removeToast } from "./store";
    import { Toast, ToastBody } from '@sveltestrap/sveltestrap';

    let { toast = $bindable() } = $props();
    if (toast.type === 'danger') console.error(toast.msg.replace(/(<([^>]+)>)/gi, ""));
    if (!toast.title) toast.title ='Powiadomienie';

    function remove() {
        removeToast(toast.id)
    }
</script>

<Toast class="border {toast.type === 'danger' ? 'border-danger' : 'border-dark'} toast-{toast.type}">
    <div class="toast-header">
        <div class="d-flex align-items-center w-100">
            <span class="text-{toast.type} me-auto">
                {toast.title}
            </span>
            <button type="button" class="border-0 text-secondary bg-transparent" onclick={remove}>
                <!-- <UIcon name="circle-xmark" color="secondary" size={5} class="ms-auto"/> -->
                 X
            </button>
        </div>
    </div>
    <ToastBody>
        {@html toast.msg}
    </ToastBody>
</Toast>
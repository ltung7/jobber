<script lang="ts">
    import MailWrapper from "./MailWrapper.svelte";
    interface Props { logo?: string, html: string, title: string }
    let { logo, html, title }: Props = $props();
</script>

<MailWrapper {logo} {title} footer>
    {@html html}
</MailWrapper>
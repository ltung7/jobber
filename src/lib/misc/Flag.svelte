<script>
    export let country, size = 2, addClass = 'border border-secondary rounded', alt = '';
    let width = size * 10, height = size * 7.5;
    if (alt.length === 0) alt = country;
</script>

<img src="https://storage.googleapis.com/feed-cdn-files/flags/{(country ?? 'unknown').toLowerCase()}.svg" alt="{alt}" title="{alt}" style="height: {height}px; width: {width}px;" class="{addClass} flag" {width} {height}>
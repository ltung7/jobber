<script lang="ts">
    import { PUBLIC_URL } from '$env/static/public';

    interface Props {
        footer?: boolean;
        logo?: string;
        title: string;
        lang?: string;
        children: import('svelte').Snippet;
    }

    let { footer = false, logo = 'cid:logo@eisg.pl', title, lang = 'pl', children }: Props = $props();
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>

<!DOCTYPE html>
<html {lang}>
    <head></head>
    <body>
        <table style="text-align: center; max-width: 500px; width: 100%; min-width: 220px; margin-left: auto; margin-right: auto; margin-bottom: 30px;border:1px solid gray;border-radius: 8px; margin-top: 1rem;" id="main">
            <tbody>
                <tr>
                    <td style="text-align:center; padding: 10px;border-bottom:1px solid gray;">
                        <img src={logo} alt="EISG" style="max-height: 50px; width: auto;" width="119" height="46" title="EISG" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <div style="padding: 10px; text-align: center; font-size: 1rem;">
                            {@render children()}
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        {#if footer}
            <table style="text-align: center; max-width: 500px; width: 100%; min-width: 220px; margin-left: auto; margin-right: auto;border-top:2px solid #12399C;">
                <tbody>
                    <tr>
                        <td>
                            <footer>
                                <p style="font-size:0.9rem;color:dimgray;text-align:center">Powiadomienie z aplikacji <a href={PUBLIC_URL}>EISG Jobber.</a></p>
                                <p style="font-size:0.6rem;color:dimgray;text-align:center">Niniejsza wiadomość zawiera informacje poufne, stanowiące tajemnicę przedsiębiorstwa spółki Finner Group sp. z o.o. sp. k. z siedzibą w Warszawie i jest prawnie chroniona. Wgląd w treść wiadomości otrzymanej omyłkowo, dalsze jej przekazywanie, kopiowanie, rozpowszechnianie lub innego rodzaju wykorzystywanie bądź podjęcie jakichkolwiek działań w oparciu o zawarte w niej informacje, również przez osoby będące jej właściwym adresatem, bez uprzedniej pisemnej zgody spółki Finner Group sp. z o.o. sp. k. jest prawnie zabronione. Niezastosowanie się do powyższego zakazu skutkować będzie pociągnięciem do odpowiedzialności cywilnej oraz karnej.</p>
                            </footer>
                        </td>
                    </tr>
                </tbody>
            </table>
        {/if}
    </body>
</html>
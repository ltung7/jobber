<script lang="ts">
    import xlsx from 'xlsx-js-style';
    import { setColWidth, getStyledCell, cellStyles } from '$lib/misc/xlsxStyles';
    import UIcon from '$lib/misc/UIcon.svelte';
    import dayjs from 'dayjs';

    interface Props {
        aggregated: any[];
        selectedYear: string;
        selectedMonth: string;
    }

    let { aggregated, selectedYear, selectedMonth }: Props = $props();

    const downloadStats = () => {
        const wb = xlsx.utils.book_new();

        // 1. Consolidation sheet
        const summaryHeaders = ['Recruiter Name', 'Total Started', 'Total Passed'].map(h => getStyledCell(h, cellStyles.redHeader));
        const summaryRows = [summaryHeaders];
        
        for (const group of aggregated) {
            summaryRows.push([
                getStyledCell(group.recruiterName, cellStyles.centered),
                getStyledCell(group.totalStarted, cellStyles.centered),
                getStyledCell(group.totalSuccessful, cellStyles.centered)
            ]);
        }

        const summaryWs = xlsx.utils.aoa_to_sheet(summaryRows);
        setColWidth(summaryWs, [30, 20, 20]);
        xlsx.utils.book_append_sheet(wb, summaryWs, 'Podsumowanie');

        // 2. Sheets for each recruiter
        for (const group of aggregated) {
            // Sheet names max 31 chars and no special chars
            let sheetName = group.recruiterName.substring(0, 31).replace(/[\[\]\*\\\/\?\:]/g, '');
            if (!sheetName) sheetName = 'Unassigned';

            const recruiterHeaders = [
                'Contact ID', 'Contact Name', 'Total Worked Days', 'Eval Period Days', 'Status',
                'Deal Work Start', 'Deal Work End', 'Deal Days', 'Deal Eval Days'
            ].map(h => getStyledCell(h, cellStyles.redHeader));
            const recruiterRows = [recruiterHeaders];

            for (const contact of group.contacts) {
                if (contact.deals && contact.deals.length > 0) {
                    for (let i = 0; i < contact.deals.length; i++) {
                        const deal = contact.deals[i];
                        const workStart = deal.workStart ? dayjs(deal.workStart).format('DD.MM.YYYY') : '';
                        const workEnd = deal.workEnd ? dayjs(deal.workEnd).format('DD.MM.YYYY') : 'Present';

                        if (i === 0) {
                            recruiterRows.push([
                                getStyledCell(contact.id, cellStyles.centered),
                                getStyledCell(contact.name || 'Unnamed', cellStyles.centered),
                                getStyledCell(contact.totalWorkedDays, cellStyles.centered),
                                getStyledCell(contact.totalWorkedDaysEval, cellStyles.centered),
                                getStyledCell(contact.isSuccessful ? 'Passed' : 'Failed', cellStyles.centered),
                                getStyledCell(workStart, cellStyles.centered),
                                getStyledCell(workEnd, cellStyles.centered),
                                getStyledCell(deal.days, cellStyles.centered),
                                getStyledCell(deal.evalDays, cellStyles.centered)
                            ]);
                        } else {
                            recruiterRows.push([
                                getStyledCell('', cellStyles.centered),
                                getStyledCell('', cellStyles.centered),
                                getStyledCell('', cellStyles.centered),
                                getStyledCell('', cellStyles.centered),
                                getStyledCell('', cellStyles.centered),
                                getStyledCell(workStart, cellStyles.centered),
                                getStyledCell(workEnd, cellStyles.centered),
                                getStyledCell(deal.days, cellStyles.centered),
                                getStyledCell(deal.evalDays, cellStyles.centered)
                            ]);
                        }
                    }
                } else {
                    recruiterRows.push([
                        getStyledCell(contact.id, cellStyles.centered),
                        getStyledCell(contact.name || 'Unnamed', cellStyles.centered),
                        getStyledCell(contact.totalWorkedDays, cellStyles.centered),
                        getStyledCell(contact.totalWorkedDaysEval, cellStyles.centered),
                        getStyledCell(contact.isSuccessful ? 'Passed' : 'Failed', cellStyles.centered),
                        getStyledCell('', cellStyles.centered),
                        getStyledCell('', cellStyles.centered),
                        getStyledCell('', cellStyles.centered),
                        getStyledCell('', cellStyles.centered)
                    ]);
                }
            }

            const recruiterWs = xlsx.utils.aoa_to_sheet(recruiterRows);
            setColWidth(recruiterWs, [15, 30, 20, 20, 15, 20, 20, 15, 15]);
            
            // Check if sheetName already exists in wb, just in case
            let finalSheetName = sheetName;
            let counter = 1;
            while (wb.SheetNames.includes(finalSheetName)) {
                finalSheetName = `${sheetName.substring(0, 27)}_${counter}`;
                counter++;
            }

            xlsx.utils.book_append_sheet(wb, recruiterWs, finalSheetName);
        }

        xlsx.writeFile(wb, `Recruiter_Stats_${selectedYear}_${selectedMonth}.xlsx`);
    };
</script>

<button class="btn btn-primary d-flex align-items-center" onclick={downloadStats} title="Download Stats (XLSX)">
    <UIcon name="download" /><span class="ms-2">Download Stats</span>
</button>

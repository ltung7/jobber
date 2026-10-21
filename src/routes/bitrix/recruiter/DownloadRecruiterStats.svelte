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
        const summaryHeaders = ['Recruiter Name', 'Total Started', 'Total Passed', 'Payout Value (PLN)'].map(h => getStyledCell(h, cellStyles.redHeader));
        const summaryRows = [summaryHeaders];
        
        let totalStartedSum = 0;
        let totalPassedSum = 0;
        let totalPayoutSum = 0;

        for (const group of aggregated) {
            const payout = (group.totalSuccessful || 0) * 150;
            totalStartedSum += (group.totalStarted || 0);
            totalPassedSum += (group.totalSuccessful || 0);
            totalPayoutSum += payout;

            summaryRows.push([
                getStyledCell(group.recruiterName, cellStyles.centered),
                getStyledCell(group.totalStarted, cellStyles.centered),
                getStyledCell(group.totalSuccessful, cellStyles.centered),
                getStyledCell(payout, cellStyles.centered)
            ]);
        }

        // Add totals summary row
        summaryRows.push([
            getStyledCell('Total', cellStyles.summaryCentered),
            getStyledCell(totalStartedSum, cellStyles.summaryCentered),
            getStyledCell(totalPassedSum, cellStyles.summaryCentered),
            getStyledCell(totalPayoutSum, cellStyles.summaryCentered)
        ]);

        const summaryWs = xlsx.utils.aoa_to_sheet(summaryRows);
        setColWidth(summaryWs, [30, 20, 20, 25]);
        xlsx.utils.book_append_sheet(wb, summaryWs, 'Podsumowanie');

        // 2. Sheets for each recruiter
        for (const group of aggregated) {
            // Sheet names max 31 chars and no special chars
            let sheetName = group.recruiterName.substring(0, 31).replace(/[\[\]\*\\\/\?\:]/g, '');
            if (!sheetName) sheetName = 'Unassigned';

            const recruiterHeaders = [
                'Contact ID', 'Contact Name', 'Total Worked Days', 'Eval Period Days', 'Status', 'Payout (PLN)',
                'Deal Work Start', 'Deal Work End', 'Deal Days', 'Deal Eval Days'
            ].map(h => getStyledCell(h, cellStyles.redHeader));
            const recruiterRows = [recruiterHeaders];

            let recruiterWorkedDaysSum = 0;
            let recruiterEvalDaysSum = 0;
            let recruiterPayoutSum = 0;

            for (const contact of group.contacts) {
                const contactPayout = contact.isSuccessful ? 150 : 0;
                recruiterWorkedDaysSum += (contact.totalWorkedDays || 0);
                recruiterEvalDaysSum += (contact.totalWorkedDaysEval || 0);
                recruiterPayoutSum += contactPayout;

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
                                getStyledCell(contactPayout, cellStyles.centered),
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
                        getStyledCell(contactPayout, cellStyles.centered),
                        getStyledCell('', cellStyles.centered),
                        getStyledCell('', cellStyles.centered),
                        getStyledCell('', cellStyles.centered),
                        getStyledCell('', cellStyles.centered)
                    ]);
                }
            }

            // Add totals row for recruiter sheet
            recruiterRows.push([
                getStyledCell('Total', cellStyles.summaryCentered),
                getStyledCell('', cellStyles.summaryCentered),
                getStyledCell(recruiterWorkedDaysSum, cellStyles.summaryCentered),
                getStyledCell(recruiterEvalDaysSum, cellStyles.summaryCentered),
                getStyledCell('', cellStyles.summaryCentered),
                getStyledCell(recruiterPayoutSum, cellStyles.summaryCentered),
                getStyledCell('', cellStyles.summaryCentered),
                getStyledCell('', cellStyles.summaryCentered),
                getStyledCell('', cellStyles.summaryCentered),
                getStyledCell('', cellStyles.summaryCentered)
            ]);

            const recruiterWs = xlsx.utils.aoa_to_sheet(recruiterRows);
            setColWidth(recruiterWs, [15, 30, 20, 20, 15, 15, 20, 20, 15, 15]);
            
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

<button type="button" class="btn btn-success btn-sm d-flex align-items-center shadow-xs" onclick={downloadStats} title="Download Stats (XLSX)">
    <UIcon name="download" /><span class="ms-2 fw-semibold text-xs">Download Stats</span>
</button>

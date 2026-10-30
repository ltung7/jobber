import { fetchBitrixPaginatedReadOnly, callBitrixReadOnly } from './client';
import { USER_ALIASES } from './config';

export const registerHighLevelTools = (server: any) => {
    // 1. order_fill(project)
    server.tool(
        'order_fill',
        'Count workers and recruitment/employment stages for a given project/client (e.g. "Shein", "Animex K3", "Plukon", or "all").',
        {
            project: server.z.string().optional().default('all').describe('Project name or partial match (e.g. "Shein") or "all"')
        },
        async ({ project }: any) => {
            const projQuery = project ? project.toLowerCase().trim() : 'all';

            // Fetch Leads and Deals
            const leads = await fetchBitrixPaginatedReadOnly('crm.item.list', { entityTypeId: 1, select: ['*', 'UF_*'] }, 2000);
            const deals = await fetchBitrixPaginatedReadOnly('crm.item.list', { entityTypeId: 2, select: ['*', 'UF_*'] }, 2000);

            // Filter leads by project fields: UF_CRM_1788853850535 (preferred), UF_CRM_1792056703212 (final)
            const matchedLeads = leads.filter((l: any) => {
                if (projQuery === 'all') return true;
                const pref = String(l.ufCrm1788853850535 || l.UF_CRM_1788853850535 || '').toLowerCase();
                const finalP = String(l.ufCrm1792056703212 || l.UF_CRM_1792056703212 || '').toLowerCase();
                const title = String(l.title || l.TITLE || '').toLowerCase();
                return pref.includes(projQuery) || finalP.includes(projQuery) || title.includes(projQuery);
            });

            // Filter deals by project field: UF_CRM_1787822368903
            const matchedDeals = deals.filter((d: any) => {
                if (projQuery === 'all') return true;
                const pField = String(d.ufCrm1787822368903 || d.UF_CRM_1787822368903 || '').toLowerCase();
                const title = String(d.title || d.TITLE || '').toLowerCase();
                return pField.includes(projQuery) || title.includes(projQuery);
            });

            // Group deals into categories/stages:
            // Employment category (categoryId = 2) or Work Permit (0) or TRC (4)
            const summary = {
                projectQuery: projQuery,
                totalMatchingLeads: matchedLeads.length,
                totalMatchingDeals: matchedDeals.length,
                stages: {
                    leadOnboarding: matchedLeads.filter((l: any) => l.stageId === '6').length,
                    leadOnboarded: matchedLeads.filter((l: any) => l.stageId === 'CONVERTED').length,
                    leadMao: matchedLeads.filter((l: any) => l.stageId === 'PROCESSED').length,
                    dealWaiting: matchedDeals.filter((d: any) => d.stageId === 'C2:NEW').length,
                    dealWorking: matchedDeals.filter((d: any) => ['C2:PREPARATION', 'C2:2', 'C2:EXECUTING', 'C2:PREPAYMENT_INVOICE'].includes(d.stageId)).length,
                    dealResigned: matchedDeals.filter((d: any) => ['C2:LOSE', 'C2:UC_S0H8WV', 'C2:APOLOGY'].includes(d.stageId)).length
                },
                workers: matchedDeals.map((d: any) => ({
                    id: d.id,
                    name: `${d.ufCrm1787745014165 || d.UF_CRM_1787745014165 || ''} ${d.ufCrm1787745029864 || d.UF_CRM_1787745029864 || d.title || ''}`.trim(),
                    stageId: d.stageId,
                    categoryId: d.categoryId,
                    workStart: d.ufCrm1787746162988 || d.UF_CRM_1787746162988 || null,
                    recruiter: d.ufCrmDealRecruiter || d.UF_CRM_DEAL_RECRUITER || 'N/A'
                }))
            };

            return {
                content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
            };
        }
    );

    // 2. funnel_stats(from, to, source)
    server.tool(
        'funnel_stats',
        'Calculate lead conversion funnel stats between dates [from, to] broken down by source and recruiter.',
        {
            from: server.z.string().describe('Start date ISO (YYYY-MM-DD)'),
            to: server.z.string().describe('End date ISO (YYYY-MM-DD)'),
            source: server.z.string().optional().default('all').describe('Source filter category or ID')
        },
        async ({ from, to, source }: any) => {
            const leads = await fetchBitrixPaginatedReadOnly(
                'crm.item.list',
                {
                    entityTypeId: 1,
                    filter: { '>=createdTime': `${from}T00:00:00`, '<=createdTime': `${to}T23:59:59` },
                    select: ['*', 'UF_*']
                },
                3000
            );

            const filteredLeads = leads.filter((l: any) => {
                if (!source || source === 'all') return true;
                const srcId = String(l.sourceId || l.SOURCE_ID || '').toLowerCase();
                return srcId.includes(source.toLowerCase());
            });

            // Canonical funnel stages:
            // NEW -> CONTACT ATTEMPT (UC_ESUI05) -> QUALIFICATION (IN_PROCESS) -> MAO (PROCESSED) -> ONBOARDING (6) -> ONBOARDED (CONVERTED)
            const stats = {
                period: { from, to },
                totalLeads: filteredLeads.length,
                funnel: {
                    new: filteredLeads.filter((l: any) => l.stageId === 'NEW').length,
                    contactAttempt: filteredLeads.filter((l: any) => ['NEW', 'UC_ESUI05', 'IN_PROCESS', 'PROCESSED', '6', 'CONVERTED'].includes(l.stageId)).length,
                    qualification: filteredLeads.filter((l: any) => ['IN_PROCESS', 'PROCESSED', '6', 'CONVERTED'].includes(l.stageId)).length,
                    mao: filteredLeads.filter((l: any) => ['PROCESSED', '6', 'CONVERTED'].includes(l.stageId)).length,
                    onboarding: filteredLeads.filter((l: any) => ['6', 'CONVERTED'].includes(l.stageId)).length,
                    onboarded: filteredLeads.filter((l: any) => l.stageId === 'CONVERTED').length,
                    junkOrFailed: filteredLeads.filter((l: any) => ['JUNK', '4', '5', '7'].includes(l.stageId)).length
                },
                sources: {} as Record<string, number>,
                recruiters: {} as Record<string, number>
            };

            for (const l of filteredLeads) {
                const src = l.sourceId || l.SOURCE_ID || 'OTHER';
                stats.sources[src] = (stats.sources[src] || 0) + 1;

                const rec = l.ufCrmLeadRecruiter || l.UF_CRM_LEAD_RECRUITER || String(l.assignedById || l.ASSIGNED_BY_ID || 'Unassigned');
                stats.recruiters[rec] = (stats.recruiters[rec] || 0) + 1;
            }

            return {
                content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }]
            };
        }
    );

    // 3. expiring_documents(days, includeAlreadyExpired)
    server.tool(
        'expiring_documents',
        'Find employee Contacts and linked Deals whose documents (TRC, Visa, Work Permit, Passport) expire within X days.',
        {
            days: server.z.number().optional().default(30).describe('Number of days threshold (default 30)'),
            includeAlreadyExpired: server.z.boolean().optional().default(true).describe('Include already expired documents')
        },
        async ({ days, includeAlreadyExpired }: any) => {
            const contacts = await fetchBitrixPaginatedReadOnly(
                'crm.item.list',
                {
                    entityTypeId: 3,
                    filter: { TYPE_ID: 'UC_I5DEPB' },
                    select: ['*', 'UF_*']
                },
                3000
            );

            const deals = await fetchBitrixPaginatedReadOnly(
                'crm.item.list',
                {
                    entityTypeId: 2,
                    select: ['*', 'UF_*']
                },
                3000
            );

            // Build map of contactId -> deals
            const contactDealsMap = new Map<number, any[]>();
            for (const d of deals) {
                const cId = d.contactId || d.CONTACT_ID;
                if (cId) {
                    const list = contactDealsMap.get(Number(cId)) || [];
                    list.push(d);
                    contactDealsMap.set(Number(cId), list);
                }
            }

            const today = new Date();
            const thresholdDate = new Date();
            thresholdDate.setDate(today.getDate() + days);

            const expiringRecords: any[] = [];

            for (const c of contacts) {
                const cId = Number(c.id || c.ID);
                const name = `${c.name || c.NAME || ''} ${c.lastName || c.LAST_NAME || c.title || ''}`.trim();
                const phone = c.phone || c.PHONE || (c.phoneMobile ? c.phoneMobile[0]?.VALUE : null);
                const linkedDeals = contactDealsMap.get(cId) || [];

                // Check dates on Contact (new fields + standard fields)
                // Contact date fields: UF_CRM_CONTACT_TRC_VALIDITY, UF_CRM_CONTACT_VISA_VALIDITY, UF_CRM_CONTACT_WP_VALIDITY, UF_CRM_CONTACT_PASSPORT_VALIDITY
                const contactDates = [
                    { type: 'TRC', val: c.ufCrmContactTrcValidity || c.UF_CRM_CONTACT_TRC_VALIDITY },
                    { type: 'Visa', val: c.ufCrmContactVisaValidity || c.UF_CRM_CONTACT_VISA_VALIDITY },
                    { type: 'Work Permit', val: c.ufCrmContactWpValidity || c.UF_CRM_CONTACT_WP_VALIDITY },
                    { type: 'Passport', val: c.ufCrmContactPassportValidity || c.UF_CRM_CONTACT_PASSPORT_VALIDITY }
                ];

                for (const cd of contactDates) {
                    if (cd.val) {
                        const expDate = new Date(cd.val);
                        if (!isNaN(expDate.getTime())) {
                            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            if ((includeAlreadyExpired && diffDays <= days) || (!includeAlreadyExpired && diffDays >= 0 && diffDays <= days)) {
                                expiringRecords.push({
                                    contactId: cId,
                                    name,
                                    phone,
                                    sourceEntity: 'Contact',
                                    documentType: cd.type,
                                    expirationDate: cd.val,
                                    daysRemaining: diffDays
                                });
                            }
                        }
                    }
                }

                // Check dates on linked Deals (UF_CRM_1787751150636 TRC, UF_CRM_1787821910705 WP, UF_CRM_1787822064574 Passport)
                for (const d of linkedDeals) {
                    const dealDates = [
                        { type: 'Deal TRC', val: d.ufCrm1787751150636 || d.UF_CRM_1787751150636 },
                        { type: 'Deal Work Permit', val: d.ufCrm1787821910705 || d.UF_CRM_1787821910705 },
                        { type: 'Deal Passport', val: d.ufCrm1787822064574 || d.UF_CRM_1787822064574 }
                    ];

                    for (const dd of dealDates) {
                        if (dd.val) {
                            const expDate = new Date(dd.val);
                            if (!isNaN(expDate.getTime())) {
                                const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                if ((includeAlreadyExpired && diffDays <= days) || (!includeAlreadyExpired && diffDays >= 0 && diffDays <= days)) {
                                    expiringRecords.push({
                                        contactId: cId,
                                        dealId: d.id,
                                        name,
                                        phone,
                                        sourceEntity: 'Deal',
                                        documentType: dd.type,
                                        project: d.ufCrm1787822368903 || d.UF_CRM_1787822368903 || 'N/A',
                                        expirationDate: dd.val,
                                        daysRemaining: diffDays
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // Sort by daysRemaining ascending (most urgent first)
            expiringRecords.sort((a, b) => a.daysRemaining - b.daysRemaining);

            return {
                content: [{ type: 'text', text: JSON.stringify({ thresholdDays: days, count: expiringRecords.length, records: expiringRecords }, null, 2) }]
            };
        }
    );

    // 4. overdue_tasks(person)
    server.tool(
        'overdue_tasks',
        'Retrieve overdue tasks (deadline < now and not completed) filtered or grouped by person (Ramod, DK, Darya, Michał, etc.).',
        {
            person: server.z.string().optional().describe('Person name, alias (e.g. "DK"), or numeric user ID')
        },
        async ({ person }: any) => {
            let responsibleId: number | undefined = undefined;
            if (person) {
                const queryLower = person.toLowerCase().trim();
                if (USER_ALIASES[queryLower]) {
                    responsibleId = USER_ALIASES[queryLower];
                } else if (!isNaN(Number(person))) {
                    responsibleId = Number(person);
                }
            }

            const nowIso = new Date().toISOString();
            const filter: Record<string, any> = {
                '<DEADLINE': nowIso,
                '!REAL_STATUS': 5 // 5 = Completed
            };
            if (responsibleId) {
                filter.RESPONSIBLE_ID = responsibleId;
            }

            let source = 'tasks.task.list';
            let warning: string | undefined;
            let tasks: any[];

            try {
                tasks = await fetchBitrixPaginatedReadOnly(
                    'tasks.task.list',
                    { filter, select: ['ID', 'TITLE', 'DEADLINE', 'RESPONSIBLE_ID', 'STATUS', 'REAL_STATUS', 'UF_CRM_TASK'] },
                    1000
                );
            } catch (err: any) {
                // Fallback: the incoming webhook may not hold the `task` scope (401 insufficient_scope).
                // CRM-bound tasks are still readable through crm.activity.list with the CRM_TASKS_TASK provider,
                // which carries subject, deadline, responsible and completion state.
                const isScopeIssue = /insufficient_scope|status code 401/i.test(err?.message || '');
                if (!isScopeIssue) throw err;

                const activityFilter: Record<string, any> = {
                    PROVIDER_ID: 'CRM_TASKS_TASK',
                    COMPLETED: 'N',
                    '<DEADLINE': nowIso
                };
                if (responsibleId) activityFilter.RESPONSIBLE_ID = responsibleId;

                tasks = await fetchBitrixPaginatedReadOnly(
                    'crm.activity.list',
                    {
                        filter: activityFilter,
                        select: ['ID', 'OWNER_TYPE_ID', 'OWNER_ID', 'SUBJECT', 'DEADLINE', 'RESPONSIBLE_ID', 'COMPLETED', 'ASSOCIATED_ENTITY_ID'],
                        order: { DEADLINE: 'asc' }
                    },
                    3000
                );
                source = 'crm.activity.list';
                warning = 'tasks.task.list is unavailable (webhook lacks the "task" scope). Showing CRM-bound tasks via crm.activity.list (CRM_TASKS_TASK provider) — tasks not linked to a CRM entity are not included.';
            }

            const today = new Date();
            const enriched: any[] = tasks.map((t: any) => {
                const deadline = t.deadline || t.DEADLINE;
                const deadlineDate = deadline ? new Date(deadline) : null;
                const daysOverdue = deadlineDate ? Math.ceil((today.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                const taskId = t.id || t.ID || t.associatedEntityId || t.ASSOCIATED_ENTITY_ID;

                return {
                    id: taskId,
                    title: t.title || t.TITLE || t.subject || t.SUBJECT,
                    deadline,
                    daysOverdue,
                    responsibleId: t.responsibleId || t.RESPONSIBLE_ID,
                    completed: t.completed ?? t.COMPLETED ?? undefined,
                    crmBindings: t.ufCrmTask || t.UF_CRM_TASK || (t.OWNER_TYPE_ID
                        ? [{
                            entityTypeId: Number(t.OWNER_TYPE_ID),
                            entityId: Number(t.OWNER_ID),
                            activityId: Number(t.ID)
                        }]
                        : [])
                };
            });

            // Resolve responsible user names (explicit select keeps RODO-sensitive photo/email fields out)
            const responsibleIds = [...new Set(enriched.map(t => Number(t.responsibleId)).filter(id => !!id))];
            if (responsibleIds.length > 0) {
                try {
                    const users = await callBitrixReadOnly('user.get', {
                        filter: { ID: responsibleIds },
                        select: ['ID', 'NAME', 'LAST_NAME']
                    });
                    const nameById = new Map<string, string>(
                        (users?.result || []).map((u: any) => [String(u.ID), `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim()])
                    );
                    for (const task of enriched) {
                        task.responsibleName = nameById.get(String(task.responsibleId)) || null;
                    }
                } catch {
                    // Name enrichment is best-effort; never fail the task listing because of it.
                }
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ source, warning, count: enriched.length, tasks: enriched }, null, 2)
                }]
            };
        }
    );

    // 5. find_contact(query)
    server.tool(
        'find_contact',
        'Fast unified person search across Contacts, Leads, and Deals by name, surname, or phone number.',
        {
            query: server.z.string().describe('Search query (name, surname, or phone digits)')
        },
        async ({ query }: any) => {
            const q = query.trim();
            const isPhone = q.replace(/\D/g, '').length >= 5;

            // Fetch contacts, leads, deals matching query
            const contacts = await fetchBitrixPaginatedReadOnly('crm.item.list', { entityTypeId: 3, select: ['*', 'UF_*'] }, 1500);
            const leads = await fetchBitrixPaginatedReadOnly('crm.item.list', { entityTypeId: 1, select: ['*', 'UF_*'] }, 1500);
            const deals = await fetchBitrixPaginatedReadOnly('crm.item.list', { entityTypeId: 2, select: ['*', 'UF_*'] }, 1500);

            const queryLower = q.toLowerCase();

            const matchedContacts = contacts.filter((c: any) => {
                const name = String(c.name || c.NAME || '').toLowerCase();
                const lastName = String(c.lastName || c.LAST_NAME || c.title || '').toLowerCase();
                const phone = String(c.phone || c.PHONE || '');
                return name.includes(queryLower) || lastName.includes(queryLower) || phone.includes(q);
            });

            const matchedLeads = leads.filter((l: any) => {
                const name = String(l.name || l.NAME || l.title || '').toLowerCase();
                const lastName = String(l.lastName || l.LAST_NAME || '').toLowerCase();
                const phone = String(l.phone || l.PHONE || '');
                return name.includes(queryLower) || lastName.includes(queryLower) || phone.includes(q);
            });

            const matchedDeals = deals.filter((d: any) => {
                const title = String(d.title || d.TITLE || '').toLowerCase();
                const name = String(d.ufCrm1787745014165 || d.UF_CRM_1787745014165 || '').toLowerCase();
                const surname = String(d.ufCrm1787745029864 || d.UF_CRM_1787745029864 || '').toLowerCase();
                return title.includes(queryLower) || name.includes(queryLower) || surname.includes(queryLower);
            });

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        query: q,
                        contactsCount: matchedContacts.length,
                        leadsCount: matchedLeads.length,
                        dealsCount: matchedDeals.length,
                        contacts: matchedContacts.slice(0, 20),
                        leads: matchedLeads.slice(0, 20),
                        deals: matchedDeals.slice(0, 20)
                    }, null, 2)
                }]
            };
        }
    );
};

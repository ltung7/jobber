export interface BitrixLead {
    ID: string;
    TITLE: string;
    STATUS_ID: string;
    ASSIGNED_BY_ID: string;
    OPPORTUNITY: string | null;
    CURRENCY_ID: string;
    DATE_CREATE: string;
    DATE_MODIFY: string;
    DATE_CLOSED?: string;
}

export interface BitrixDeal {
    ID: string;
    TITLE: string;
    STAGE_ID: string;
    ASSIGNED_BY_ID: string;
    OPPORTUNITY: string | null;
    CURRENCY_ID: string;
    DATE_CREATE: string;
    DATE_MODIFY: string;
    BEGINDATE?: string;
    CLOSEDATE?: string;
    // Custom Fields
    UF_CRM_1787745014165?: string; // Name
    UF_CRM_1787745029864?: string; // Surname
    UF_CRM_1787746162988?: string; // Work start
    UF_CRM_1787746186953?: string; // Work end
}

export interface BitrixUser {
    ID: string;
    NAME: string;
    LAST_NAME: string;
    SECOND_NAME?: string;
}

export interface EnrichedLead extends BitrixLead {
    ASSIGNED_BY_NAME: string;
}

export interface LeadSummary {
    assignedById: string;
    assignedByName: string;
    totalClosedLeads: number;
    totalValue: number;
    averageClosingTimeDays: number;
}

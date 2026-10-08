export interface BitrixFieldItem {
    ID: string | number;
    VALUE: string;
}

export interface BitrixField {
    type: string;
    isRequired?: boolean;
    isReadOnly?: boolean;
    isImmutable?: boolean;
    isMultiple?: boolean;
    isDynamic?: boolean;
    title?: string;
    listLabel?: string;
    formLabel?: string;
    filterLabel?: string;
    statusType?: string;
    items?: BitrixFieldItem[];
    [key: string]: any;
}

export interface BitrixFieldListItem {
    key: string;
    title: string;
    type: string;
    isMultiple: boolean;
    isCustom: boolean;
    items?: BitrixFieldItem[];
    raw: BitrixField;
}

export interface FieldValueStat {
    value: string;
    count: number;
    percentage: number;
}

export interface FieldStatistics {
    fieldKey: string;
    fieldTitle?: string;
    totalWithField: number;
    totalEmpty: number;
    distinctValuesCount: number;
    valueCounts: Record<string, number>;
    valueBreakdown: FieldValueStat[];
}

export interface LeadsFieldStatisticsResult {
    totalLeadsAnalyzed: number;
    totalMatchingLeads: number;
    fields: Record<string, FieldStatistics>;
    combinedValueCounts: Record<string, number>;
    combinedValueBreakdown: FieldValueStat[];
    leads: BitrixLead[];
}

export interface GetFieldsOptions {
    saveToFile?: boolean;
    filename?: string;
    strip?: boolean;
}

export interface GetLeadsWithFieldsOptions {
    filter?: Record<string, any>;
    requireValues?: boolean;
    startDate?: string;
    endDate?: string;
    statusId?: string;
    additionalSelect?: string[];
}

export type BitrixEntityType = 'lead' | 'deal' | 'contact' | 'company';

export interface BitrixContact {
    ID: string;
    NAME?: string;
    LAST_NAME?: string;
    SECOND_NAME?: string;
    ASSIGNED_BY_ID?: string;
    DATE_CREATE?: string;
    DATE_MODIFY?: string;
    COMMENTS?: string;
    PHONE?: Array<{ ID: string; VALUE: string; VALUE_TYPE: string }>;
    EMAIL?: Array<{ ID: string; VALUE: string; VALUE_TYPE: string }>;
    UF_CRM_1790672831151?: string; // Recruiter ID
    [key: string]: any;
}

export interface EntityFieldStatisticsResult<T = any> {
    totalAnalyzed: number;
    totalMatching: number;
    fields: Record<string, FieldStatistics>;
    combinedValueCounts: Record<string, number>;
    combinedValueBreakdown: FieldValueStat[];
    items: T[];
}

export type ContactsFieldStatisticsResult = EntityFieldStatisticsResult<BitrixContact>;
export type GetContactsWithFieldsOptions = GetLeadsWithFieldsOptions;

export interface GetDealsWithFieldsOptions extends GetLeadsWithFieldsOptions {
    stageId?: string;
    dateField?: string;
}
export type DealsFieldStatisticsResult = EntityFieldStatisticsResult<BitrixDeal>;

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
    [key: string]: any;
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
    CONTACT_ID?: string;
    // Custom Fields
    UF_CRM_1787745014165?: string; // Name
    UF_CRM_1787745029864?: string; // Surname
    UF_CRM_1787746162988?: string; // Work start
    UF_CRM_1787746186953?: string; // Work end
    UF_CRM_1787822368903?: string; // Project
    [key: string]: any;
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

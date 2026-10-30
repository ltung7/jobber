import axios from 'axios';
import { TRELLO_API_BASE, getTrelloApiKey, getTrelloToken } from './config';

export interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    idBoard: string;
    idList: string;
    idMembers: string[];
    url: string;
    shortUrl: string;
    closed: boolean;
}

export interface TrelloMember {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
}

export interface AssignMemberResult {
    success: boolean;
    alreadyAssigned?: boolean;
    cardId: string;
    cardName: string;
    assignedMemberId: string;
    assignedMemberUsername?: string;
    currentMembers: string[];
}

export class TrelloClient {
    private apiKey: string;
    private token: string;

    constructor(apiKey?: string, token?: string) {
        this.apiKey = apiKey || getTrelloApiKey();
        this.token = token || getTrelloToken();
    }

    private getAuthParams(): Record<string, string> {
        return {
            key: this.apiKey,
            token: this.token
        };
    }

    /**
     * Fetch card details (verifies card exists and inspects current members)
     */
    async getCard(cardId: string): Promise<TrelloCard> {
        const cleanCardId = (cardId || '').trim();
        if (!cleanCardId) {
            throw new Error('Missing cardId / ticketId parameter.');
        }

        const url = `${TRELLO_API_BASE}/cards/${encodeURIComponent(cleanCardId)}`;
        try {
            const res = await axios.get<TrelloCard>(url, {
                params: this.getAuthParams()
            });
            return res.data;
        } catch (err: any) {
            this.handleAxiosError(`Failed to fetch card ${cleanCardId}`, err);
        }
    }

    /**
     * Resolve member ID from username or ID
     */
    async resolveMember(memberIdOrUsername: string): Promise<TrelloMember> {
        let raw = (memberIdOrUsername || '').trim();
        if (!raw) {
            throw new Error('Missing memberId / username parameter.');
        }

        if (raw.startsWith('@')) {
            raw = raw.slice(1);
        }

        // 24-character hex string is a canonical MongoDB/Trello ObjectId
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(raw);

        const url = `${TRELLO_API_BASE}/members/${encodeURIComponent(raw)}`;
        try {
            const res = await axios.get<TrelloMember>(url, {
                params: this.getAuthParams()
            });
            return {
                id: res.data.id,
                username: res.data.username,
                fullName: res.data.fullName,
                avatarUrl: res.data.avatarUrl
            };
        } catch (err: any) {
            // If it was already a valid ObjectId and /members/{id} failed with 404, throw informative error
            if (isObjectId) {
                // If direct member lookup failed, return raw as id fallback
                return {
                    id: raw,
                    username: raw,
                    fullName: raw
                };
            }
            this.handleAxiosError(`Failed to resolve member '${raw}'`, err);
        }
    }

    /**
     * Assign member to ticket/card with pre-verification and post-verification
     */
    async assignMemberToCard(cardId: string, memberIdOrUsername: string): Promise<AssignMemberResult> {
        // 1. Get ticket/card first (know-how from trello.js)
        const card = await this.getCard(cardId);

        // 2. Resolve member ID if username provided
        const member = await this.resolveMember(memberIdOrUsername);

        // Check if member is already assigned
        if (card.idMembers && card.idMembers.includes(member.id)) {
            return {
                success: true,
                alreadyAssigned: true,
                cardId: card.id,
                cardName: card.name,
                assignedMemberId: member.id,
                assignedMemberUsername: member.username,
                currentMembers: card.idMembers
            };
        }

        // 3. POST /1/cards/{id}/idMembers?value={memberId}
        const assignUrl = `${TRELLO_API_BASE}/cards/${encodeURIComponent(card.id)}/idMembers`;
        try {
            const res = await axios.post(assignUrl, null, {
                params: {
                    value: member.id,
                    ...this.getAuthParams()
                }
            });

            const updatedMembers: string[] = res.data?.idMembers || [];
            const isAssigned = updatedMembers.includes(member.id);

            return {
                success: isAssigned,
                cardId: card.id,
                cardName: card.name,
                assignedMemberId: member.id,
                assignedMemberUsername: member.username,
                currentMembers: updatedMembers
            };
        } catch (err: any) {
            this.handleAxiosError(`Failed to assign member ${member.id} to card ${card.id}`, err);
        }
    }

    private handleAxiosError(contextMessage: string, err: any): never {
        if (err.response) {
            const status = err.response.status;
            const data = typeof err.response.data === 'string'
                ? err.response.data
                : JSON.stringify(err.response.data);
            throw new Error(`[Trello API Error ${status}] ${contextMessage}: ${data}`);
        }
        throw new Error(`[Trello Network Error] ${contextMessage}: ${err.message}`);
    }
}

export const defaultTrelloClient = new TrelloClient();

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { defaultTrelloClient } from './client';

export function registerTrelloTools(server: McpServer) {
    const serverAny = server as any;
    const zod = serverAny.z || z;

    // Tool 1: assign_member_to_card (primary required tool)
    serverAny.tool(
        'assign_member_to_card',
        'Assign a person/member to a Trello ticket (card). ticketId and memberId are dynamic. Resolves username (e.g. @username) automatically and verifies card assignment.',
        {
            ticketId: zod.string().min(1).describe('The Trello card/ticket ID or short link (e.g. z9NsKqCk)'),
            memberId: zod.string().min(1).describe('The Trello member ID or username (e.g. @daryavinahrad2 or daryavinahrad2)')
        },
        async (args: { ticketId: string; memberId: string }) => {
            const result = await defaultTrelloClient.assignMemberToCard(args.ticketId, args.memberId);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        }
    );

    // Tool 2: get_card_info (auxiliary verification tool)
    serverAny.tool(
        'get_card_info',
        'Get Trello card information including name, description, board, list, and currently assigned member IDs.',
        {
            ticketId: zod.string().min(1).describe('The Trello card/ticket ID or short link (e.g. z9NsKqCk)')
        },
        async (args: { ticketId: string }) => {
            const card = await defaultTrelloClient.getCard(args.ticketId);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            id: card.id,
                            name: card.name,
                            desc: card.desc,
                            idBoard: card.idBoard,
                            idList: card.idList,
                            idMembers: card.idMembers,
                            url: card.url,
                            shortUrl: card.shortUrl,
                            closed: card.closed
                        }, null, 2)
                    }
                ]
            };
        }
    );
}

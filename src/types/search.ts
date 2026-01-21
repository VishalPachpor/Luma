export type SearchResultType = 'event' | 'calendar' | 'person' | 'shortcut' | 'newsletter';

export interface SearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle?: string;
    url: string;
    icon?: string; // Optional custom icon override
    score?: number; // For ranking
    metadata?: Record<string, any>; // Flexible metadata
}

export interface SearchResponse {
    results: {
        events: SearchResult[];
        calendars: SearchResult[];
        people: SearchResult[];
        shortcuts: SearchResult[];
        hosting?: SearchResult[];
        attending?: SearchResult[];
        chats?: SearchResult[];
    };
    query: string;
}

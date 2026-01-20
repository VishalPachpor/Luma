export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    display_name: string | null
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    display_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    display_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            profiles: {
                Row: {
                    id: string
                    email: string
                    display_name: string | null
                    avatar_url: string | null
                    bio: string | null
                    location: string | null
                    website: string | null
                    twitter_handle: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    display_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    location?: string | null
                    website?: string | null
                    twitter_handle?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    display_name?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    location?: string | null
                    website?: string | null
                    twitter_handle?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            events: {
                Row: {
                    id: string
                    title: string
                    description: string | null
                    date: string
                    end_date: string | null
                    location: string | null
                    city: string | null
                    latitude: number | null
                    longitude: number | null
                    cover_image: string | null
                    organizer_id: string
                    organizer_name: string | null
                    calendar_id: string | null
                    status: string
                    visibility: string
                    require_approval: boolean
                    capacity: number | null
                    price: number | null
                    currency: string
                    metadata: Json
                    tags: string[]
                    registration_questions: Json
                    social_links: Json
                    agenda: Json
                    hosts: Json
                    who_should_attend: string[]
                    event_format: Json
                    presented_by: string | null
                    about: string[]
                    attendee_count: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description?: string | null
                    date: string
                    end_date?: string | null
                    location?: string | null
                    city?: string | null
                    latitude?: number | null
                    longitude?: number | null
                    cover_image?: string | null
                    organizer_id: string
                    organizer_name?: string | null
                    calendar_id?: string | null
                    status?: string
                    visibility?: string
                    require_approval?: boolean
                    capacity?: number | null
                    price?: number | null
                    currency?: string
                    metadata?: Json
                    tags?: string[]
                    registration_questions?: Json
                    social_links?: Json
                    agenda?: Json
                    hosts?: Json
                    who_should_attend?: string[]
                    event_format?: Json
                    presented_by?: string | null
                    about?: string[]
                    attendee_count?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string | null
                    date?: string
                    end_date?: string | null
                    location?: string | null
                    city?: string | null
                    latitude?: number | null
                    longitude?: number | null
                    cover_image?: string | null
                    organizer_id?: string
                    organizer_name?: string | null
                    calendar_id?: string | null
                    status?: string
                    visibility?: string
                    require_approval?: boolean
                    capacity?: number | null
                    price?: number | null
                    currency?: string
                    metadata?: Json
                    tags?: string[]
                    registration_questions?: Json
                    social_links?: Json
                    agenda?: Json
                    hosts?: Json
                    who_should_attend?: string[]
                    event_format?: Json
                    presented_by?: string | null
                    about?: string[]
                    attendee_count?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "events_organizer_id_fkey"
                        columns: ["organizer_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            guests: {
                Row: {
                    id: string
                    order_id: string | null
                    event_id: string
                    ticket_tier_id: string | null
                    user_id: string
                    qr_token: string
                    status: string
                    approved_by: string | null
                    approved_at: string | null
                    rejection_reason: string | null
                    checked_in_at: string | null
                    checked_in_by: string | null
                    registration_responses: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    order_id?: string | null
                    event_id: string
                    ticket_tier_id?: string | null
                    user_id: string
                    qr_token?: string
                    status?: string
                    approved_by?: string | null
                    approved_at?: string | null
                    rejection_reason?: string | null
                    checked_in_at?: string | null
                    checked_in_by?: string | null
                    registration_responses?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    order_id?: string | null
                    event_id?: string
                    ticket_tier_id?: string | null
                    user_id?: string
                    qr_token?: string
                    status?: string
                    approved_by?: string | null
                    approved_at?: string | null
                    rejection_reason?: string | null
                    checked_in_at?: string | null
                    checked_in_by?: string | null
                    registration_responses?: Json
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "guests_event_id_fkey"
                        columns: ["event_id"]
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "guests_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rsvps: {
                Row: {
                    user_id: string
                    event_id: string
                    status: 'going' | 'interested' | 'not_going'
                    created_at: string
                }
                Insert: {
                    user_id: string
                    event_id: string
                    status: 'going' | 'interested' | 'not_going'
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    event_id?: string
                    status?: 'going' | 'interested' | 'not_going'
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "rsvps_event_id_fkey"
                        columns: ["event_id"]
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "rsvps_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            calendars: {
                Row: {
                    id: string
                    owner_id: string
                    name: string
                    slug: string
                    description: string | null
                    color: string | null
                    avatar_url: string | null
                    cover_url: string | null
                    location: string | null
                    latitude: number | null
                    longitude: number | null
                    is_global: boolean
                    subscriber_count: number
                    event_count: number
                    is_private: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    owner_id: string
                    name: string
                    slug: string
                    description?: string | null
                    color?: string | null
                    avatar_url?: string | null
                    cover_url?: string | null
                    location?: string | null
                    latitude?: number | null
                    longitude?: number | null
                    is_global?: boolean
                    subscriber_count?: number
                    event_count?: number
                    is_private?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    owner_id?: string
                    name?: string
                    slug?: string
                    description?: string | null
                    color?: string | null
                    avatar_url?: string | null
                    cover_url?: string | null
                    location?: string | null
                    latitude?: number | null
                    longitude?: number | null
                    is_global?: boolean
                    subscriber_count?: number
                    event_count?: number
                    is_private?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "calendars_owner_id_fkey"
                        columns: ["owner_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            calendar_subscriptions: {
                Row: {
                    id: string
                    calendar_id: string
                    user_id: string
                    notify_new_events: boolean
                    notify_reminders: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    calendar_id: string
                    user_id: string
                    notify_new_events?: boolean
                    notify_reminders?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    calendar_id?: string
                    user_id?: string
                    notify_new_events?: boolean
                    notify_reminders?: boolean
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "calendar_subscriptions_calendar_id_fkey"
                        columns: ["calendar_id"]
                        referencedRelation: "calendars"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "calendar_subscriptions_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            chat_messages: {
                Row: {
                    id: string
                    event_id: string
                    user_id: string | null
                    sender_name: string
                    sender_avatar: string | null
                    content: string
                    type: 'text' | 'system' | 'announcement'
                    reply_to_id: string | null
                    created_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    event_id: string
                    user_id?: string | null
                    sender_name: string
                    sender_avatar?: string | null
                    content: string
                    type?: 'text' | 'system' | 'announcement'
                    reply_to_id?: string | null
                    created_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    event_id?: string
                    user_id?: string | null
                    sender_name?: string
                    sender_avatar?: string | null
                    content?: string
                    type?: 'text' | 'system' | 'announcement'
                    reply_to_id?: string | null
                    created_at?: string
                    deleted_at?: string | null
                }
                Relationships: []
            }
            event_chat_settings: {
                Row: {
                    event_id: string
                    is_enabled: boolean
                    is_locked: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    event_id: string
                    is_enabled?: boolean
                    is_locked?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    event_id?: string
                    is_enabled?: boolean
                    is_locked?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    type: 'approval_granted' | 'approval_rejected' | 'event_reminder' | 'event_update' | 'new_message' | 'system'
                    title: string
                    message: string | null
                    link: string | null
                    metadata: Record<string, unknown>
                    read_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: 'approval_granted' | 'approval_rejected' | 'event_reminder' | 'event_update' | 'new_message' | 'system'
                    title: string
                    message?: string | null
                    link?: string | null
                    metadata?: Record<string, unknown>
                    read_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: 'approval_granted' | 'approval_rejected' | 'event_reminder' | 'event_update' | 'new_message' | 'system'
                    title?: string
                    message?: string | null
                    link?: string | null
                    metadata?: Record<string, unknown>
                    read_at?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            calendar_members: {
                Row: {
                    id: string
                    calendar_id: string
                    user_id: string
                    role: 'admin' | 'member' | 'viewer'
                    added_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    calendar_id: string
                    user_id: string
                    role?: 'admin' | 'member' | 'viewer'
                    added_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    calendar_id?: string
                    user_id?: string
                    role?: 'admin' | 'member' | 'viewer'
                    added_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "calendar_members_calendar_id_fkey"
                        columns: ["calendar_id"]
                        referencedRelation: "calendars"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "calendar_members_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users" // referencing public.users (mirrored from auth)
                        referencedColumns: ["id"]
                    }
                ]
            }
        }

        Views: {
            [_ in never]: never
        }
        Functions: {
            search_events: {
                Args: {
                    query_text: string
                }
                Returns: Database['public']['Tables']['events']['Row'][]
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}
